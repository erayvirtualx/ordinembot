const LINES = [
  'Google\'da arattım, sana benzer bir tane daha yokmuş 💫',
  'Yandığım için itfaiyeyi mi arasam, senin gözlerine mi baksam? 🔥',
  'Sen bir yıldızsın, ben de gökyüzüne bakmayı seviyorum ✨',
  'Bugün hava çok güzel ama sen daha güzelsin ☀️',
  'Kalbim GPS gibi çalışıyor, hep sana yön gösteriyor 📍',
  'Kahve gibisin, sabah seni düşünmeden güne başlayamıyorum ☕'
];
const { pctHash } = require('../lib/pair');
const comment = (p) => (p >= 80 ? 'Efsane bir uyum! 💯' : p >= 50 ? 'Fena değil, denemeye değer 😌' : 'Hmm, biraz zorlama olabilir 😅');

module.exports = {
  name: 'flort',
  run: async ({ msg, senderNum }) => {
    const target = (await msg.getMentions())[0];
    if (!target) return msg.reply(`💘 ${LINES[Math.floor(Math.random() * LINES.length)]}`);
    const pct = pctHash(senderNum, target.id.user);
    return msg.reply(`💘 Uyum: *%${pct}*\n${comment(pct)}`);
  }
};
