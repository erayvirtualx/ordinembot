const { pctHash, shipName, displayName } = require('../lib/pair');

const SHIP_COMMENT = (p) => (p >= 80 ? '💞 Mükemmel çift!' : p >= 50 ? '💗 Güzel gidebilir' : '💔 Pek olmaz gibi');
const METER_COMMENT = (p) => (p >= 80 ? 'Yüzde bu kadar yüksekse belli olmaz 👀' : p >= 40 ? 'Kim bilir 🤷' : 'Sanmıyorum 😄');

module.exports = {
  name: ['ship', 'gay', 'lezbiyen'],
  run: async ({ msg, cmd, senderNum }) => {
    const mentions = await msg.getMentions();

    if (cmd === 'ship') {
      let aId, bId, aName, bName;
      if (mentions.length >= 2) {
        aId = mentions[0].id.user; bId = mentions[1].id.user;
        aName = displayName(mentions[0], aId); bName = displayName(mentions[1], bId);
      } else if (mentions.length === 1) {
        aId = senderNum; bId = mentions[0].id.user;
        aName = 'Sen'; bName = displayName(mentions[0], bId);
      } else {
        return msg.reply('Kullanım: .ship @kişi1 @kişi2  (ya da tek kişi etiketle, seninle eşleştirilir)');
      }
      const pct = pctHash(aId, bId);
      const name = shipName(aName, bName);
      return msg.reply(`💘 *${aName} + ${bName} = ${name}*\nUyum: %${pct}\n${SHIP_COMMENT(pct)}`);
    }

    // gay / lezbiyen: tamamen rastgele, şaka amaçlı ölçer
    const target = mentions[0];
    const label = target ? displayName(target, '@' + target.id.user) : 'Sen';
    const pct = Math.floor(Math.random() * 101);
    const emoji = cmd === 'gay' ? '🏳️‍🌈' : '🏳️‍⚧️';
    return msg.reply(`${emoji} *${label}* ${cmd === 'gay' ? 'gaylik' : 'lezbiyenlik'} oranı: *%${pct}*\n${METER_COMMENT(pct)}\n\n(Sadece şaka, ciddiye alma 😄)`);
  }
};
