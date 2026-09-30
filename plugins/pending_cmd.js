const pending = require('../lib/pending');
const { resolveFight } = require('../lib/duel');
const achievements = require('../lib/achievements');
const { fmt } = require('../lib/format');

module.exports = {
  name: ['kabulet', 'reddet'],
  run: async ({ msg, cmd, sender, senderNum, db }) => {
    const p = pending.get(senderNum);
    if (!p) return msg.reply('Bekleyen bir teklifin/isteğin yok.');
    pending.resolve(senderNum, p.id);

    if (cmd === 'reddet') {
      const label = { evlilik: 'Evlilik teklifi', evlat: 'Evlat edinme teklifi', kavga: 'Kavga daveti' }[p.type] || 'Teklif';
      return msg.reply(`❌ ${label} reddedildi.`, { mentions: [`${p.from}@c.us`] });
    }

    if (p.type === 'evlilik') {
      const u = db.user(senderNum), other = db.user(p.from);
      if (u.marriedTo || other.marriedTo) { db.save(); return msg.reply('Taraflardan biri bu arada evlendi, teklif geçersiz.'); }
      u.marriedTo = p.from; other.marriedTo = senderNum;
      const a1 = achievements.grant(u, 'evli'); const a2 = achievements.grant(other, 'evli');
      db.save();
      let extra = '';
      if (a1) extra += `\n\n🏆 @${senderNum}: ${a1.name} — +${fmt(a1.reward)} TL`;
      if (a2) extra += `\n\n🏆 @${p.from}: ${a2.name} — +${fmt(a2.reward)} TL`;
      return msg.reply(`💒 @${p.from} ve @${senderNum} artık evli! 🎉${extra}`, { mentions: [`${p.from}@c.us`, sender] });
    }

    if (p.type === 'evlat') {
      db.user(p.from).kids.push(senderNum); db.save();
      return msg.reply(`👨‍👩‍👧 @${p.from} artık @${senderNum}'in ebeveyni!`, { mentions: [`${p.from}@c.us`, sender] });
    }

    if (p.type === 'kavga') {
      const result = resolveFight(db, p.from, senderNum, p.bet || 0);
      if (result.insufficientFunds) return msg.reply('Taraflardan birinin bahis kadar parası kalmamış, kavga iptal.');
      db.save();
      return msg.reply(result.text, { mentions: result.mentions });
    }
  }
};
