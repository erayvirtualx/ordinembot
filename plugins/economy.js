const { targetRtp, parseAmount } = require('../lib/risk');
const { getBuff } = require('../lib/items');
const quests = require('../lib/quests');
const achievements = require('../lib/achievements');
const fmt = (n) => Math.floor(n).toLocaleString('tr-TR');

module.exports = {
  name: ['bakiye', 'cuzdan', 'banka', 'yatir', 'cek', 'daily', 'gunluk', 'slot', 'yazitura', 'cal', 'gonder', 'zenginler'],
  run: async ({ msg, cmd, args, senderNum, db, config }) => {
    const eco = config.economy;
    const u = db.user(senderNum);
    const buff = getBuff(u);
    const withBuff = (net) => (net > 0 ? Math.floor(net * buff / 100) : 0);
    const buffLine = (bonus) => (bonus ? `\n🎒 Buff +%${buff}: +${fmt(bonus)}` : '');
    const questLine = (arr) => arr.map((q) => `\n\n✅ *Görev tamam:* ${q.desc} — +${fmt(q.reward)} TL`).join('');
    const achLine = (arr) => arr.map((a) => `\n\n🏆 *Başarım:* ${a.name} — +${fmt(a.reward)} TL`).join('');
    const afterWin = (net) => {
      const qs = net > 0 ? quests.addProgress(u, 'win', 1).concat(quests.addProgress(u, 'earn', net)) : [];
      const un = []; if (net > 0) { const g = achievements.checkGameWin(u); if (g) un.push(g); }
      const w = achievements.checkWealth(u); if (w) un.push(w);
      return questLine(qs) + achLine(un);
    };

    // Bahis okuma + risk hesabı
    const getBet = () => {
      const b = parseAmount(args[0], u.balance);
      if (!b || b <= 0) { msg.reply('Geçerli bir bahis yaz. Örn: .slot 500, .slot 10k, .slot hepsi'); return null; }
      if (b > u.balance) { msg.reply(`Cebinde yeterli para yok. Cebin: ${fmt(u.balance)}`); return null; }
      return b;
    };
    const riskNote = (rtp) => (rtp < 0.9 ? `\n⚠️ Büyük bahis, risk yüksek (RTP %${Math.round(rtp * 100)})` : '');

    if (cmd === 'bakiye' || cmd === 'cuzdan') {
      return msg.reply(`💰 Cüzdan: ${fmt(u.balance)}\n🏦 Banka: ${fmt(u.bank)}\n📊 Toplam: ${fmt(u.balance + u.bank)}\n⭐ Seviye: ${require('../lib/level').levelOf(u.xp)} (XP ${u.xp})`);
    }

    if (cmd === 'banka') {
      return msg.reply(`🏦 *Banka*\nBankadaki para çalınamaz.\n\nBanka: ${fmt(u.bank)}\nCüzdan: ${fmt(u.balance)}\n\n.yatir <miktar|hepsi>\n.cek <miktar|hepsi>`);
    }
    if (cmd === 'yatir') {
      const a = parseAmount(args[0], u.balance);
      if (!a || a <= 0 || a > u.balance) return msg.reply('Kullanım: .yatir <miktar|hepsi> (cüzdanındaki kadar)');
      u.balance -= a; u.bank += a; db.save();
      return msg.reply(`🏦 ${fmt(a)} yatırıldı.\nCüzdan: ${fmt(u.balance)} | Banka: ${fmt(u.bank)}`);
    }
    if (cmd === 'cek') {
      const a = parseAmount(args[0], u.bank);
      if (!a || a <= 0 || a > u.bank) return msg.reply('Kullanım: .cek <miktar|hepsi> (bankandaki kadar)');
      u.bank -= a; u.balance += a; db.save();
      return msg.reply(`💵 ${fmt(a)} çekildi.\nCüzdan: ${fmt(u.balance)} | Banka: ${fmt(u.bank)}`);
    }

    if (cmd === 'daily' || cmd === 'gunluk') {
      const left = eco.dailyCooldownMs - (Date.now() - u.lastDaily);
      if (left > 0) {
        const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
        return msg.reply(`⏳ Günlük ödül için ${h}s ${m}dk bekle.`);
      }
      u.lastDaily = Date.now(); u.balance += eco.dailyReward;
      const qs = quests.addProgress(u, 'earn', eco.dailyReward); db.save();
      return msg.reply(`🎁 Günlük ödül: +${fmt(eco.dailyReward)}\nCüzdan: ${fmt(u.balance)}${questLine(qs)}`);
    }

    if (cmd === 'slot') {
      const bet = getBet(); if (!bet) return;
      const rtp = targetRtp(bet, u.balance);
      // Çıkışlar: 3'lü (x25), ikili (x2), boş. Olasılıklar hedef RTP'ye göre ayarlanır.
      const x3 = 25, x2 = 2;
      const p3 = Math.min(0.02, rtp / (x3 * 2));
      const p2 = Math.max(0, (rtp - p3 * x3) / x2);
      const roll = Math.random();
      const S = ['🍒', '🍋', '🍇', '💎', '7️⃣'];
      const pick = () => S[Math.floor(Math.random() * S.length)];
      let reels, mult;
      if (roll < p3) { const s = pick(); reels = [s, s, s]; mult = x3; }
      else if (roll < p3 + p2) {
        const a = pick(); let b = pick(); while (b === a) b = pick();
        reels = [a, a, b].sort(() => Math.random() - 0.5); mult = x2;
      } else {
        const pool = [...S].sort(() => Math.random() - 0.5);
        reels = pool.slice(0, 3); mult = 0;
      }
      const net = bet * mult - bet;
      const bonus = withBuff(net);
      u.balance += net + bonus; const extra1 = afterWin(net); db.save();
      return msg.reply(`🎰 ${reels.join(' ')}\n${mult ? `Kazandın: +${fmt(net)}` : `Kaybettin: -${fmt(bet)}`}${buffLine(bonus)}\nCüzdan: ${fmt(u.balance)}${riskNote(rtp)}${extra1}`);
    }

    if (cmd === 'yazitura') {
      const bet = getBet(); if (!bet) return;
      const rtp = targetRtp(bet, u.balance);
      const win = Math.random() < rtp / 2; // 2x ödemede kazanma şansı = RTP/2
      const bonus = win ? withBuff(bet) : 0;
      u.balance += (win ? bet : -bet) + bonus; const extra2 = afterWin(win ? bet : 0); db.save();
      return msg.reply(`🪙 ${win ? `Kazandın! +${fmt(bet)}` : `Kaybettin! -${fmt(bet)}`}${buffLine(bonus)}\nCüzdan: ${fmt(u.balance)}${riskNote(rtp)}${extra2}`);
    }

    if (cmd === 'cal') {
      const target = (await msg.getMentions())[0];
      if (!target) return msg.reply('Kimden çalacaksın? Etiketle. Örn: .cal @kişi');
      if (target.id.user === senderNum) return msg.reply('Kendinden mi çalacaksın 😄');
      const v = db.user(target.id.user);
      if (v.shield > 0) { v.shield--; db.save(); return msg.reply('🛡️ Kurbanın kalkanı vardı, soygun başarısız!'); }
      if (v.balance < eco.stealMinVictimCash) return msg.reply('Kurbanın cüzdanı neredeyse boş (para bankada olabilir), değmez.');
      if (Math.random() < eco.stealChance) {
        const pct = eco.stealMinPct + Math.random() * (eco.stealMaxPct - eco.stealMinPct);
        const amt = Math.floor(v.balance * pct);
        v.balance -= amt; u.balance += amt;
        const a = achievements.grant(u, 'ilk_soygun');
        const qs = quests.addProgress(u, 'earn', amt);
        db.save();
        return msg.reply(`🦹 Başardın! +${fmt(amt)} çaldın.${questLine(qs)}${a ? `\n\n🏆 *Başarım:* ${a.name} — +${fmt(a.reward)} TL` : ''}`);
      }
      const fine = u.balance; // ceza: cebindeki paranın tamamı
      u.balance = 0; db.save();
      return msg.reply(`🚔 Yakalandın! Cebindeki ${fmt(fine)} gitti.\n(Bankadaki paran güvende: ${fmt(u.bank)})`);
    }

    if (cmd === 'gonder') {
      const target = (await msg.getMentions())[0];
      const amt = parseAmount(args[args.length - 1], u.balance);
      if (!target || !amt || amt <= 0 || amt > u.balance) return msg.reply('Kullanım: .gonder @kişi miktar (cüzdanından gider)');
      u.balance -= amt; db.user(target.id.user).balance += amt; db.save();
      return msg.reply(`💸 ${fmt(amt)} gönderildi.`);
    }

    if (cmd === 'zenginler') {
      const top = Object.entries(db.data.users).sort((a, b) => (b[1].balance + b[1].bank) - (a[1].balance + a[1].bank)).slice(0, 10);
      return msg.reply('🏆 *Zenginler* (cüzdan + banka)\n' + top.map(([id, x], i) => `${i + 1}. wa.me/${id} — ${fmt(x.balance + x.bank)}`).join('\n'));
    }
  }
};
