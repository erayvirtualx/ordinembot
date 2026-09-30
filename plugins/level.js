const { levelOf, xpForLevel, incomeMult, rankOf } = require('../lib/level');
const { short, fmt } = require('../lib/format');
const { getBuff, ITEMS } = require('../lib/items');
const { dayIndex } = require('../lib/xp');

const bar = (p, n = 10) => '▓'.repeat(Math.round(p * n)) + '░'.repeat(n - Math.round(p * n));

module.exports = {
  name: ['seviye', 'level', 'profil', 'top', 'siralama'],
  run: async ({ msg, cmd, senderNum, db, config }) => {
    const u = db.user(senderNum);
    const L = levelOf(u.xp);
    const cur = xpForLevel(L), next = xpForLevel(L + 1);
    const cap = config.economy.level.message.dailyCap;
    const todayXp = u.msgXpDay === dayIndex() ? u.msgXpToday || 0 : 0;

    if (cmd === 'seviye' || cmd === 'level') {
      return msg.reply(
        `⭐ *Seviye ${L} — ${rankOf(L)}*\n${bar((u.xp - cur) / (next - cur))}\nXP: ${fmt(u.xp)} / ${fmt(next)}\n\n` +
        `💼 İş gelir çarpanı: x${short(incomeMult(L))}\n💬 Bugün mesajdan XP: ${todayXp}/${cap}\n\n` +
        `*XP nasıl kazanılır?*\n• Grupta mesaj yazmak (ana kaynak, ${config.economy.level.message.min}-${config.economy.level.message.max} XP, ${config.economy.level.message.cooldownMs / 1000}sn'de bir)\n• İşler: .calis .balik .maden .ciftlik`
      );
    }

    if (cmd === 'profil') {
      const owned = ITEMS.filter((i) => u.inventory.includes(i.id)).length;
      return msg.reply(
        `👤 *Profil*\n⭐ Seviye ${L} — ${rankOf(L)} (XP ${fmt(u.xp)})\n💬 Ödüllü mesaj: ${fmt(u.msgs || 0)}\n\n` +
        `💰 Cüzdan: ${fmt(u.balance)}\n🏦 Banka: ${fmt(u.bank)}\n📊 Toplam: ${fmt(u.balance + u.bank)}\n\n` +
        `🎒 Eşya: ${owned}/${ITEMS.length} | 🎲 Kumar buff: %${getBuff(u)}`
      );
    }

    // top / siralama: XP'ye göre ilk 10
    const top = Object.entries(db.data.users).sort((a, b) => b[1].xp - a[1].xp).slice(0, 10);
    return msg.reply('🏆 *Seviye Sıralaması*\n' + top.map(([id, x], i) => `${i + 1}. wa.me/${id} — Seviye ${levelOf(x.xp)} (${rankOf(levelOf(x.xp))}) • ${fmt(x.xp)} XP`).join('\n'));
  }
};
