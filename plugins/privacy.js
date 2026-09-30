const { getTargetMedia } = require('../lib/media');
const { MessageMedia } = require('whatsapp-web.js');

function isViewOnce(msg) { return !!(msg?.isViewOnce || msg?.rawData?.isViewOnce || msg?._data?.isViewOnce); }

module.exports = {
  name: ['vv'],
  owner: true,
  run: async ({ client, msg, config }) => {
    const target = msg.hasQuotedMsg ? await msg.getQuotedMessage() : null;
    if (!target || !isViewOnce(target)) return msg.reply('Tek görüntülemelik bir fotoğraf veya videoyu yanıtlayıp .vv yaz.');
    const media = await getTargetMedia({ hasMedia: false, hasQuotedMsg: true, getQuotedMessage: () => Promise.resolve(target) }).catch(() => null);
    if (!media) return msg.reply('Bu WhatsApp Web sürümü tek görüntülemelik medyayı indirmeye izin vermedi.');
    const copy = new MessageMedia(media.mimetype, media.data, media.filename || 'view-once');
    return client.sendMessage(`${config.owner}@c.us`, copy, { caption: `Tek görüntülemelik içerik kopyası · ${msg.from}`, sendMediaAsDocument: true });
  }
};
