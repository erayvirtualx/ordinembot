const { getYonkou, WIN_SCORE } = require('../lib/yonkou');
const { fmt } = require('../lib/format');

module.exports = {
  name: ['yonkolar', 'yonkou'],
  run: async ({ msg, db }) => {
    const list = getYonkou(db);
    if (!list.length) return msg.reply('Henüz Yonkou sıralaması için oyuncu verisi yok.');

    const rows = list.map((player) =>
      `${player.rank}. wa.me/${player.id}\n` +
      `   Seviye ${player.level} · ${fmt(player.xp)} XP · ${player.wins} galibiyet\n` +
      `   Güç: ${fmt(player.score)} · Başındaki ödül: ${fmt(player.bounty)} TL`
    );

    return msg.reply(
      `🏴‍☠️ *Yonkou — En Güçlü 4 Oyuncu*\n${rows.join('\n')}\n\n` +
      `Güç puanı = XP + her kavga galibiyeti için ${fmt(WIN_SCORE)} puan. ` +
      `Para, banka ve eşyalar güce dahil değildir. Yonkou'yu yenen kişi ödülünü alır; ` +
      `aynı kişiden ödül günde bir kez alınabilir.`
    );
  }
};
