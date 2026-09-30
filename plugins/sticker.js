const { MessageMedia } = require('whatsapp-web.js');
const { getTargetMedia } = require('../lib/media');

module.exports = {
  name: ['sticker', 's', 'toimg', 'stickertext'],
  run: async ({ client, msg, chat, cmd, args }) => {
    if (cmd === 'sticker' || cmd === 's') {
      const media = await getTargetMedia(msg);
      if (!media) return msg.reply('Bir resim/video gönder ya da yanıtla.');
      await client.sendMessage(chat.id._serialized, media, {
        sendMediaAsSticker: true,
        stickerName: require('../config').botName,
        stickerAuthor: require('../config').creatorName
      });
      return;
    }

    if (cmd === 'toimg') {
      const media = await getTargetMedia(msg);
      if (!media || !media.mimetype.includes('webp')) return msg.reply('Bir sticker\'ı yanıtlayarak kullan.');
      const img = new MessageMedia('image/png', media.data, 'sticker.png');
      return client.sendMessage(chat.id._serialized, img);
    }

    if (cmd === 'stickertext') {
      const media = await getTargetMedia(msg);
      if (!media || !media.mimetype.startsWith('image/')) return msg.reply('Bir resmi yanıtlayarak kullan: .stickertext Üst yazı | Alt yazı');
      const [top = '', bottom = ''] = args.join(' ').split('|').map((s) => s.trim());
      if (!top && !bottom) return msg.reply('Kullanım: .stickertext Üst yazı | Alt yazı');
      try {
        const Jimp = require('jimp');
        const img = await Jimp.read(Buffer.from(media.data, 'base64'));
        img.resize(512, 512);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        if (top) img.print(font, 0, 10, { text: top, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 512);
        if (bottom) img.print(font, 0, 450, { text: bottom, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 512);
        const buf = await img.getBufferAsync(Jimp.MIME_PNG);
        const out = new MessageMedia('image/png', buf.toString('base64'), 'sticker.png');
        await client.sendMessage(chat.id._serialized, out, { sendMediaAsSticker: true, stickerName: require('../config').botName, stickerAuthor: require('../config').creatorName });
      } catch (e) {
        return msg.reply('⚠️ Yazı eklenemedi: ' + e.message);
      }
    }
  }
};
