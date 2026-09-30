// Sticker araçları: kırpma (WhatsApp sticker oranına getirme) ve Telegram sticker paketi.
const { MessageMedia } = require('whatsapp-web.js');
const sharp = require('sharp');
const { getTargetMedia } = require('../lib/media');
const { getText } = require('../lib/http');
const config = require('../config');

const SIZE = 512;

// Görseli WhatsApp sticker formatına çevirir: 512x512 WebP, ortadan kare kırpma.
async function toSticker(media) {
  const src = Buffer.from(media.data, 'base64');
  return sharp(src)
    .resize({ width: SIZE, height: SIZE, fit: 'cover', position: 'centre', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toBuffer();
}

module.exports = {
  name: ['stickerkirp', 'telesticker', 'telepaket'],
  run: async ({ client, msg, chat, cmd, args }) => {
    if (cmd === 'stickerkirp') {
      const media = await getTargetMedia(msg).catch(() => null);
      if (!media) return msg.reply('Bir görsele yanıt ver ya da görselle birlikte komutu yaz.');
      try {
        const data = await toSticker(media);
        return client.sendMessage(chat.id._serialized,
          new MessageMedia('image/webp', data.toString('base64'), 'sticker.webp'),
          { sendMediaAsSticker: true });
      } catch (e) {
        return msg.reply(`Sticker oluşturulamadı: ${e.message}`);
      }
    }

    // Telegram sticker paketi
    const raw = args[0] || config.media.telegramPack;
    if (!raw) {
      return msg.reply(`Paket belirtilmedi.\nKullanım: .${cmd} <paket_adi> [adet]\nÖrnek: .${cmd} AnimalsPack 15\n\nVarsayılan paket için TELEGRAM_STICKER_PACK ayarla.`);
    }
    const name = String(raw).replace(/^.*addstickers\//, '').replace(/^https?:\/\/t\.me\//, '').trim();
    if (!/^\w+$/.test(name)) return msg.reply('Geçersiz paket adı. Örnek: .telesticker AnimalsPack');

    const html = await getText(`https://t.me/addstickers/${name}`).catch((e) => {
      msg.reply(`Paket okunamadı: ${e.message}`);
      return null;
    });
    if (!html) return;

    const urls = [...new Set((html.match(/background-image:url\((https:\/\/cdn[^)]+)\)/g) || [])
      .map((s) => s.replace('background-image:url(', '').replace(')', '')))];
    if (!urls.length) return msg.reply(`"${name}" paketi bulunamadı veya sticker içermiyor.`);

    const limit = Math.min(urls.length, parseInt(args[1], 10) || 10);
    await msg.reply(`📦 ${name} → ${limit} sticker gönderiliyor…`);
    let sent = 0;
    for (const u of urls.slice(0, limit)) {
      try {
        const media = await MessageMedia.fromUrl(u);
        await client.sendMessage(chat.id._serialized, media, { sendMediaAsSticker: true });
        sent++;
        await new Promise((r) => setTimeout(r, 350));
      } catch (e) { console.error('sticker indirme hatası:', e.message); }
    }
    return msg.reply(`✅ ${sent} sticker gönderildi.${urls.length > limit ? `\n(Pakette ${urls.length} sticker var.)` : ''}`);
  }
};
