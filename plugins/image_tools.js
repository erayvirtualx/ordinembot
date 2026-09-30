const { MessageMedia } = require('whatsapp-web.js');
const { getTargetMedia } = require('../lib/media');

module.exports = {
  name: ['qr', 'qroku', 'topdf'],
  run: async ({ client, msg, chat, cmd, args }) => {
    if (cmd === 'qr') {
      const text = args.join(' ');
      if (!text) return msg.reply('Kullanım: .qr <metin veya link>');
      const QRCode = require('qrcode');
      const dataUrl = await QRCode.toDataURL(text, { width: 512 });
      const b64 = dataUrl.split(',')[1];
      const media = new MessageMedia('image/png', b64, 'qr.png');
      return client.sendMessage(chat.id._serialized, media, { caption: '📱 QR kod hazır' });
    }

    if (cmd === 'qroku') {
      const media = await getTargetMedia(msg);
      if (!media || !media.mimetype.startsWith('image/')) return msg.reply('Bir QR kod resmini yanıtlayarak kullan.');
      try {
        const Jimp = require('jimp');
        const QrReader = require('qrcode-reader');
        const img = await Jimp.read(Buffer.from(media.data, 'base64'));
        const value = await new Promise((resolve, reject) => {
          const qr = new QrReader();
          qr.callback = (err, v) => (err ? reject(err) : resolve(v));
          qr.decode(img.bitmap);
        });
        return msg.reply(`📄 QR içeriği:\n${value.result}`);
      } catch {
        return msg.reply('QR kod okunamadı, net bir görsel dene.');
      }
    }

    if (cmd === 'topdf') {
      const media = await getTargetMedia(msg);
      if (!media || !media.mimetype.startsWith('image/')) return msg.reply('Bir resmi yanıtlayarak kullan.');
      const { PDFDocument } = require('pdf-lib');
      const pdf = await PDFDocument.create();
      const bytes = Buffer.from(media.data, 'base64');
      const img = media.mimetype.includes('png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
      const page = pdf.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      const out = await pdf.save();
      const doc = new MessageMedia('application/pdf', Buffer.from(out).toString('base64'), 'resim.pdf');
      return client.sendMessage(chat.id._serialized, doc, { sendMediaAsDocument: true });
    }
  }
};
