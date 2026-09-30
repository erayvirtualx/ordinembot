const pending = require('../lib/pending');
const { parseAmount } = require('../lib/risk');

const TTL = 2 * 60 * 1000;

module.exports = {
  name: ['kavga', 'duello'],
  group: true,
  run: async ({ client, msg, chat, args, sender, senderNum, db }) => {
    const target = (await msg.getMentions())[0];
    if (!target || target.id.user === senderNum) return msg.reply('Kullanım: .kavga @kişi [bahis]');
    const oppNum = target.id.user;

    if (pending.get(oppNum)) return msg.reply('Bu kişinin zaten bekleyen bir isteği var, biraz sonra tekrar dene.');

    let bet = 0;
    if (args[0]) {
      const u = db.user(senderNum);
      bet = parseAmount(args[0], u.balance);
      if (!bet || bet <= 0) return msg.reply('Geçersiz bahis.');
      if (bet > u.balance) return msg.reply('Cüzdanında yeterli para yok.');
    }

    const chatId = chat.id._serialized;
    pending.create(oppNum, { type: 'kavga', from: senderNum, bet }, TTL, async () => {
      await client.sendMessage(chatId, `⌛ @${oppNum} zamanında cevap vermedi, @${senderNum} kavga teklifi otomatik reddedildi.`, { mentions: [`${oppNum}@c.us`, sender] });
    });

    return msg.reply(
      `🥊 @${oppNum}, @${senderNum} seni kavgaya davet ediyor!${bet ? `\n💰 Bahis: ${bet.toLocaleString('tr-TR')} TL` : ''}\n\n2 dakika içinde kabul etmezsen teklif otomatik reddedilir.\nKabul: .kabulet  |  Reddet: .reddet`,
      { mentions: [`${oppNum}@c.us`, sender] }
    );
  }
};
