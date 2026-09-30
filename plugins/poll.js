module.exports = {
  name: 'anket',
  group: true,
  run: async ({ client, msg, chat, args }) => {
    const raw = args.join(' ').split('|').map((s) => s.trim()).filter(Boolean);
    if (raw.length < 3) return msg.reply('Kullanım: .anket Soru | Seçenek1 | Seçenek2 | ...(en fazla 12)');
    const [question, ...options] = raw;
    try {
      const { Poll } = require('whatsapp-web.js');
      await client.sendMessage(chat.id._serialized, new Poll(question, options.slice(0, 12)));
    } catch (e) {
      const nums = '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣9️⃣🔟'.match(/./gu);
      const text = `📊 *${question}*\n\n` + options.map((o, i) => `${nums[i] || i + 1 + '.'} ${o}`).join('\n');
      await msg.reply(`${text}\n\n(Bu whatsapp-web.js sürümü native anketi desteklemiyor, numaraya göre cevap verin.)`);
    }
  }
};
