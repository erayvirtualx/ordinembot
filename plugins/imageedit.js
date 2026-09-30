// Görsel düzenleme: bulanıklaştırma, keskinleştirme, boyutlandırma, kırpma, döndürme, gri, çevirme.
const { MessageMedia } = require('whatsapp-web.js');
const img = require('../lib/imgtools');
const { getTargetMedia } = require('../lib/media');

const OPS = {
  bulaniklastir: (m, a) => img.blur(m, parseFloat(a[0]) || 6),
  bulanıklastir: (m, a) => img.blur(m, parseFloat(a[0]) || 6),
  keskinlestir: (m, a) => img.sharpen(m, parseFloat(a[0]) || 1),
  yaklastir: (m, a) => img.resize(m, parseFloat(a[0]) || 2),
  kucult: (m, a) => img.resize(m, 1 / (parseFloat(a[0]) || 2)),
  kirp: (m) => img.cropSquare(m),
  dondur: (m, a) => img.rotate(m, parseInt(a[0], 10) || 90),
  cevir: (m) => img.flip(m),
  gri: (m) => img.grayscale(m)
};

module.exports = {
  name: Object.keys(OPS),
  run: async ({ client, msg, chat, cmd, args }) => {
    const media = await getTargetMedia(msg).catch(() => null);
    if (!media) return msg.reply('Bir görsele yanıt ver ya da görselle birlikte komutu yaz.');

    try {
      const result = await OPS[cmd](media, args);
      const out = new MessageMedia(result.mimetype, result.data.toString('base64'), result.filename);
      return client.sendMessage(chat.id._serialized, out, { caption: `🖼️ ${cmd}` });
    } catch (e) {
      return msg.reply(`İşlem başarısız: ${e.message}`);
    }
  }
};
