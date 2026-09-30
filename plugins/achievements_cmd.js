const { ACH } = require('../lib/achievements');

module.exports = {
  name: ['basarimlar', 'basarim'],
  run: async ({ msg, senderNum, db }) => {
    const u = db.user(senderNum);
    const have = u.achievements || [];
    const lines = Object.entries(ACH).map(([id, a]) => `${have.includes(id) ? '✅' : '🔒'} *${a.name}* — ${a.desc} (+${a.reward.toLocaleString('tr-TR')} TL)`);
    return msg.reply(`🏆 *Başarımlar* (${have.length}/${Object.keys(ACH).length})\n\n${lines.join('\n')}`);
  }
};
