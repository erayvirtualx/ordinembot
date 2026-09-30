const pending = require('../lib/pending');
const achievements = require('../lib/achievements');
const TTL = 2 * 60 * 1000;

module.exports = {
  name: ['evlen', 'evlat', 'bosan', 'aile'],
  run: async ({ client, msg, chat, cmd, sender, senderNum, db }) => {
    const u = db.user(senderNum);

    if (cmd === 'evlen') {
      if (u.marriedTo) return msg.reply('Zaten evlisin. Önce .bosan.');
      const target = (await msg.getMentions())[0];
      if (!target || target.id._serialized === sender) return msg.reply('Kullanım: .evlen @kişi');
      const v = db.user(target.id.user);
      if (v.marriedTo) return msg.reply('O kişi zaten evli.');
      if (pending.get(target.id.user)) return msg.reply('Bu kişinin zaten bekleyen bir isteği var, biraz sonra tekrar dene.');
      const chatId = chat.id._serialized;
      pending.create(target.id.user, { type: 'evlilik', from: senderNum }, TTL, async () => {
        await client.sendMessage(chatId, `⌛ @${target.id.user} zamanında cevap vermedi, evlilik teklifi otomatik reddedildi.`, { mentions: [target.id._serialized] });
      });
      return msg.reply(`💍 @${target.id.user}, @${senderNum} sana evlenme teklif etti!\n2 dk içinde kabul için: .kabulet`, { mentions: [target.id._serialized, sender] });
    }

    if (cmd === 'evlat') {
      const target = (await msg.getMentions())[0];
      if (!target || target.id._serialized === sender) return msg.reply('Kullanım: .evlat @kişi');
      if (pending.get(target.id.user)) return msg.reply('Bu kişinin zaten bekleyen bir isteği var, biraz sonra tekrar dene.');
      const chatId = chat.id._serialized;
      pending.create(target.id.user, { type: 'evlat', from: senderNum }, TTL, async () => {
        await client.sendMessage(chatId, `⌛ @${target.id.user} zamanında cevap vermedi, evlat edinme teklifi otomatik reddedildi.`, { mentions: [target.id._serialized] });
      });
      return msg.reply(`👨‍👧 @${target.id.user}, @${senderNum} seni evlat edinmek istiyor!\n2 dk içinde kabul için: .kabulet`, { mentions: [target.id._serialized, sender] });
    }

    if (cmd === 'bosan') {
      if (!u.marriedTo) return msg.reply('Zaten evli değilsin.');
      const other = db.user(u.marriedTo);
      other.marriedTo = null; u.marriedTo = null; db.save();
      return msg.reply('💔 Boşandınız.');
    }

    if (cmd === 'aile') {
      const parts = [];
      parts.push(u.marriedTo ? `💍 Eşin: wa.me/${u.marriedTo}` : '💍 Bekarsın');
      parts.push(u.kids.length ? `👶 Evlatların: ${u.kids.map((k) => 'wa.me/' + k).join(', ')}` : '👶 Evladın yok');
      return msg.reply(parts.join('\n'));
    }
  }
};
