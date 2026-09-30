// Hafif eğlence komutları: bilgi, espri, alıntı, şarkı sözü, iltifat, iltiham, sekiztop, selamlar, cesaret, soru.
const q = require('../lib/quotes');

const pickMention = async (msg, args, i = 0) => {
  const mentions = await msg.getMentions();
  return mentions[i] || (args.find((a) => /^\d{6,}$/.test(a)) ? { id: { user: args.find((a) => /^\d{6,}$/.test(a)), _serialized: args.find((a) => /^\d{6,}$/.test(a)) + '@c.us' } } : null);
};

module.exports = {
  name: ['bilgi', 'espri', 'alinti', 'sarkisoz', 'iltifat', 'iltiham', 'sekiztop', '8ball',
    'günaydin', 'gunaydin', 'iyiaksam', 'iyigeceler', 'cesaret', 'sor', 'dogruluk', 'doğruluk'],
  run: async ({ msg, cmd, args }) => {
    if (cmd === 'bilgi') return msg.reply(`💡 *Biliyor muydun?*\n${q.randomBilgi()}`);
    if (cmd === 'espri') return msg.reply(`😄 ${q.randomEspri()}`);
    if (cmd === 'alinti') {
      const [text, author] = q.randomAlinti();
      return msg.reply(`💬 *Alıntı*\n"${text}"`);
    }
    if (cmd === 'sarkisoz') return msg.reply(`🎵 ${q.randomSarki()}`);
    if (cmd === 'iltifat') {
      const t = await pickMention(msg, args);
      const line = q.randomIltifat();
      return t ? msg.reply(`💖 @${t.id.user} — ${line}`, { mentions: [t.id._serialized] }) : msg.reply(`💖 ${line}`);
    }
    if (cmd === 'iltiham') {
      const t = await pickMention(msg, args);
      const line = q.randomIltiham();
      return t ? msg.reply(`😏 @${t.id.user} — ${line}`, { mentions: [t.id._serialized] }) : msg.reply(`😏 ${line}`);
    }
    if (cmd === 'sekiztop' || cmd === '8ball') {
      const question = args.join(' ').trim();
      if (!question) return msg.reply('Kullanım: .sekiztop <soru>');
      return msg.reply(`🎱 ${question}\n\n*${q.randomSekizTop()}*`);
    }
    if (cmd === 'günaydin' || cmd === 'gunaydin') return msg.reply(q.GUNAYDIN[Math.floor(Math.random() * q.GUNAYDIN.length)]);
    if (cmd === 'iyiaksam') return msg.reply(q.IYIAKSAM[Math.floor(Math.random() * q.IYIAKSAM.length)]);
    if (cmd === 'iyigeceler') return msg.reply(q.IYIGECELER[Math.floor(Math.random() * q.IYIGECELER.length)]);
    if (cmd === 'cesaret') return msg.reply(`🎲 Cesaret görevin: ${q.randomCesaret()}`);
    if (cmd === 'sor' || cmd === 'dogruluk' || cmd === 'doğruluk') {
      const t = await pickMention(msg, args);
      const question = q.randomDogruluk();
      return t ? msg.reply(`❓ @${t.id.user} — ${question}`, { mentions: [t.id._serialized] }) : msg.reply(`❓ ${question}`);
    }
  }
};
