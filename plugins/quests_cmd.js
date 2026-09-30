const quests = require('../lib/quests');

module.exports = {
  name: ['gorevler', 'gorev'],
  run: async ({ msg, senderNum, db }) => {
    const u = db.user(senderNum);
    const q = quests.ensureDaily(u);
    db.save();
    const lines = q.list.map((i) => `${i.done ? '✅' : '▫️'} ${i.desc} (${i.progress}/${i.target}) — ödül ${i.reward.toLocaleString('tr-TR')} TL`);
    return msg.reply(`📋 *Günlük Görevler*\n${lines.join('\n')}\n\nİlerleme otomatik, tamamlayınca ödül kendiliğinden yatar. Yarın yenileri gelir.`);
  }
};
