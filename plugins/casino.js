const bj = require('../lib/blackjack');
const { simplePlan, blackjackPlan, riskNote } = require('../lib/gamble');
const { parseAmount } = require('../lib/risk');
const { getBuff } = require('../lib/items');
const { fmt } = require('../lib/format');
const quests = require('../lib/quests');
const achievements = require('../lib/achievements');

const RED = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
const BJ_EXPIRE = 10 * 60 * 1000;

// rulet seçimi -> { label, mult, wins(n) }
function parseRoulette(q) {
  q = (q || '').toLocaleLowerCase('tr');
  if (['kirmizi', 'kırmızı', 'red'].includes(q)) return { label: '🔴 Kırmızı', mult: 2, wins: (n) => RED.includes(n) };
  if (['siyah', 'black'].includes(q)) return { label: '⚫ Siyah', mult: 2, wins: (n) => n > 0 && !RED.includes(n) };
  if (['tek'].includes(q)) return { label: 'Tek', mult: 2, wins: (n) => n > 0 && n % 2 === 1 };
  if (['cift', 'çift'].includes(q)) return { label: 'Çift', mult: 2, wins: (n) => n > 0 && n % 2 === 0 };
  if (['alcak', 'alçak', 'dusuk', 'düşük'].includes(q)) return { label: '1-18', mult: 2, wins: (n) => n >= 1 && n <= 18 };
  if (['yuksek', 'yüksek'].includes(q)) return { label: '19-36', mult: 2, wins: (n) => n >= 19 };
  if (/^\d+$/.test(q) && +q >= 0 && +q <= 36) return { label: `Sayı ${q}`, mult: 36, wins: (n) => n === +q };
  return null;
}
const colorOf = (n) => (n === 0 ? '🟢' : RED.includes(n) ? '🔴' : '⚫');

module.exports = {
  name: ['blackjack', 'bj', 'hit', 'vur', 'stand', 'dur', 'double', 'ikile', 'rulet', 'zar'],
  run: async ({ msg, cmd, args, senderNum, db, config }) => {
    const u = db.user(senderNum);
    const buff = getBuff(u);
    const g = config.economy.games;
    const activeEffect = u.tempEffect;
    const effBuff = activeEffect === 'cifte' ? buff * 2 : buff;
    const bonusOf = (net) => (net > 0 ? Math.floor((net * effBuff) / 100) : 0);
    const effCash = activeEffect === 'sans' ? u.balance * 4 : u.balance; // bahis daha küçükmüş gibi hesaplanır
    const consumeEffect = () => { if (activeEffect) { u.tempEffect = null; } };
    const afterWin = (net) => {
      const qs = net > 0 ? quests.addProgress(u, 'win', 1).concat(quests.addProgress(u, 'earn', net)) : [];
      const un = []; if (net > 0) { const g = achievements.checkGameWin(u); if (g) un.push(g); }
      const w = achievements.checkWealth(u); if (w) un.push(w);
      return qs.map((q) => `\n\n✅ *Görev tamam:* ${q.desc} — +${fmt(q.reward)} TL`).join('') +
             un.map((a) => `\n\n🏆 *Başarım:* ${a.name} — +${fmt(a.reward)} TL`).join('');
    };
    const buffLine = (b) => (b ? `\n🎒 Buff +%${buff}: +${fmt(b)}` : '');

    const getBet = () => {
      const b = parseAmount(args[0], u.balance);
      if (!b || b <= 0) { msg.reply('Geçerli bir bahis yaz. Örn: 500, 10k, hepsi'); return null; }
      if (b > u.balance) { msg.reply(`Cebinde yeterli para yok. Cebin: ${fmt(u.balance)}`); return null; }
      return b;
    };

    // ---------------- ZAR ----------------
    if (cmd === 'zar') {
      const bet = getBet(); if (!bet) return;
      const q = (args[1] || '').toLocaleLowerCase('tr');
      let sel;
      if (/^[1-6]$/.test(q)) sel = { label: `Sayı ${q}`, mult: 6, wins: (n) => n === +q };
      else if (['yuksek', 'yüksek'].includes(q)) sel = { label: 'Yüksek (4-6)', mult: 2, wins: (n) => n >= 4 };
      else if (['alcak', 'alçak', 'dusuk', 'düşük'].includes(q)) sel = { label: 'Alçak (1-3)', mult: 2, wins: (n) => n <= 3 };
      else return msg.reply('Kullanım: .zar <bahis> <1-6 | yuksek | alcak>\nSayı tutarsa 6x, yüksek/alçak 2x.');
      const plan = simplePlan(bet, effCash, 1.0);
      let roll = 1 + Math.floor(Math.random() * 6);
      if (plan.forceLoss) { const losing = [1, 2, 3, 4, 5, 6].filter((n) => !sel.wins(n)); roll = losing[Math.floor(Math.random() * losing.length)]; }
      const win = sel.wins(roll);
      const gross = win ? Math.floor(bet * sel.mult * plan.boost) : 0;
      const net = gross - bet, bonus = bonusOf(net);
      u.balance += net + bonus; const ex1 = afterWin(net); consumeEffect(); db.save();
      return msg.reply(`🎲 Zar: *${roll}* (${sel.label})\n${win ? `Kazandın: +${fmt(net)}` : `Kaybettin: -${fmt(bet)}`}${buffLine(bonus)}\nCüzdan: ${fmt(u.balance)}${riskNote(plan.T)}${ex1}`);
    }

    // ---------------- RULET ----------------
    if (cmd === 'rulet') {
      const bet = getBet(); if (!bet) return;
      const sel = parseRoulette(args[1]);
      if (!sel) return msg.reply('Kullanım: .rulet <bahis> <kirmizi | siyah | tek | cift | alcak | yuksek | 0-36>\nRenk/tek-çift 2x, tek sayı 36x.');
      const plan = simplePlan(bet, effCash, 36 / 37);
      let n = Math.floor(Math.random() * 37);
      if (plan.forceLoss) { const losing = Array.from({ length: 37 }, (_, i) => i).filter((i) => !sel.wins(i)); n = losing[Math.floor(Math.random() * losing.length)]; }
      const win = sel.wins(n);
      const gross = win ? Math.floor(bet * sel.mult * plan.boost) : 0;
      const net = gross - bet, bonus = bonusOf(net);
      u.balance += net + bonus; const ex2 = afterWin(net); consumeEffect(); db.save();
      return msg.reply(`🎡 Top: ${colorOf(n)} *${n}* (${sel.label})\n${win ? `Kazandın: +${fmt(net)}` : `Kaybettin: -${fmt(bet)}`}${buffLine(bonus)}\nCüzdan: ${fmt(u.balance)}${riskNote(plan.T)}${ex2}`);
    }

    // ---------------- BLACKJACK ----------------
    let s = u.bj;
    if (s && Date.now() - (s.ts || 0) > BJ_EXPIRE) {
      u.bj = null; s = null; db.save();
      if (cmd !== 'blackjack' && cmd !== 'bj') return msg.reply('⌛ Önceki blackjack elin zaman aşımına uğradı, bahsin gitti. Yeni el: .blackjack <bahis>');
    }

    const view = (st, reveal) =>
      `🃏 Sen: ${bj.show(st.player)} (${bj.total(st.player)})\nKrupiye: ${reveal ? `${bj.show(st.dealer)} (${bj.total(st.dealer)})` : `${st.dealer[0].r}${st.dealer[0].s} ❓`}`;

    const settle = (st) => {
      const net = st.gross - st.totalBet, bonus = bonusOf(net);
      u.balance += st.gross + bonus; u.bj = null; const ex3 = afterWin(net); consumeEffect(); db.save();
      const title = { bj: '🎉 BLACKJACK!', win: '✅ Kazandın!', push: '🤝 Berabere, bahis iade.', lose: bj.total(st.player) > 21 ? '💥 Battın!' : '❌ Kaybettin.' }[st.outcome];
      const res = st.outcome === 'push' ? '' : net > 0 ? `+${fmt(net)}` : `-${fmt(st.totalBet)}`;
      return msg.reply(`${view(st, true)}\n\n${title} ${res}${buffLine(bonus)}\nCüzdan: ${fmt(u.balance)}${riskNote(st.T)}${ex3}`);
    };

    if (cmd === 'blackjack' || cmd === 'bj') {
      if (s) return msg.reply(`Zaten devam eden bir elin var:\n${view(s, false)}\n\n.hit  .stand  .double`);
      const bet = getBet(); if (!bet) return;
      const plan = blackjackPlan(bet, effCash, g.blackjackRtp0, g.blackjackPushShare, g.blackjackRtpFlipped);
      const st = bj.deal(bet, plan);
      st.T = plan.T; st.ts = Date.now();
      u.balance -= bet;
      if (st.over) return settle(st);
      u.bj = st; db.save();
      return msg.reply(`🃏 *Blackjack* — bahis ${fmt(bet)}\n${view(st, false)}\n\n.hit (kart çek)  .stand (dur)  .double (bahsi ikile)${riskNote(plan.T)}`);
    }

    if (!s) return msg.reply('Aktif blackjack elin yok. Başlamak için: .blackjack <bahis>');

    if (cmd === 'hit' || cmd === 'vur') {
      bj.hit(s);
      if (s.over) return settle(s);
      db.save();
      return msg.reply(`${view(s, false)}\n\n.hit  .stand`);
    }
    if (cmd === 'stand' || cmd === 'dur') { bj.stand(s); return settle(s); }
    if (cmd === 'double' || cmd === 'ikile') {
      if (s.player.length !== 2 || s.doubled) return msg.reply('Sadece ilk iki kartta ikileyebilirsin.');
      if (u.balance < s.bet) return msg.reply(`İkilemek için cebinde ${fmt(s.bet)} daha olmalı.`);
      u.balance -= s.bet;
      bj.double(s);
      return settle(s);
    }
  }
};
