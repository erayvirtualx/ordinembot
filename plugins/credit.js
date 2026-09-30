const { levelOf } = require('../lib/level');
const { parseAmount } = require('../lib/risk');
const { fmt } = require('../lib/format');

module.exports = {
  name: ['kredi', 'borcum'],
  run: async ({ msg, cmd, args, senderNum, db, config }) => {
    const u = db.user(senderNum);
    const c = config.economy.credit;
    const limit = c.baseLimit + levelOf(u.xp) * c.perLevelLimit;

    if (cmd === 'borcum') {
      if (!u.debt) return msg.reply(`✅ Borcun yok.\nKredi limitin: ${fmt(limit)} TL (günlük faiz %${c.dailyInterest * 100})`);
      return msg.reply(`💳 Güncel borcun: *${fmt(u.debt)} TL*\nGünlük faiz: %${c.dailyInterest * 100}\nÖdemek için: .kredi ode <miktar|hepsi>`);
    }

    const sub = args[0];
    if (sub === 'al') {
      if (u.debt > 0) return msg.reply('Zaten bir borcun var, önce onu kapat: .kredi ode');
      const amt = parseAmount(args[1], limit);
      if (!amt || amt <= 0) return msg.reply(`Kullanım: .kredi al <miktar>\nLimitin: ${fmt(limit)} TL`);
      if (amt > limit) return msg.reply(`Bu kadar kredi veremeyiz. Limitin: ${fmt(limit)} TL`);
      u.debt = amt; u.balance += amt; u.lastInterestDay = require('../lib/quests').dayIndex(); db.save();
      return msg.reply(`💳 ${fmt(amt)} TL kredi çekildi.\nCüzdan: ${fmt(u.balance)}\nGünlük faiz: %${c.dailyInterest * 100} (borcu ödemezsen her gün büyür)`);
    }
    if (sub === 'ode') {
      if (u.debt <= 0) return msg.reply('Zaten borcun yok.');
      const amt = Math.min(parseAmount(args[1], Math.min(u.balance, u.debt)) || 0, u.balance, u.debt);
      if (amt <= 0) return msg.reply('Kullanım: .kredi ode <miktar|hepsi>');
      u.balance -= amt; u.debt -= amt; db.save();
      return msg.reply(`✅ ${fmt(amt)} TL ödendi.\nKalan borç: ${fmt(u.debt)}\nCüzdan: ${fmt(u.balance)}`);
    }
    return msg.reply(`Kullanım:\n.kredi al <miktar>\n.kredi ode <miktar|hepsi>\n.borcum`);
  }
};
