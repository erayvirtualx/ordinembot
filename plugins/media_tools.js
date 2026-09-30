const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { MessageMedia } = require('whatsapp-web.js');
const { getTargetMedia, cleanup } = require('../lib/media');
const execFileAsync = promisify(execFile);

function fancy(text) {
  return [...text].map((c) => {
    const n = c.codePointAt(0);
    if (n >= 65 && n <= 90) return String.fromCodePoint(0x1d400 + n - 65);
    if (n >= 97 && n <= 122) return String.fromCodePoint(0x1d41a + n - 97);
    if (n >= 48 && n <= 57) return String.fromCodePoint(0x1d7ce + n - 48);
    return c;
  }).join('');
}

module.exports = {
  name: ['ocr', 'removebg', 'arka', 'remini', 'fancy', 'calc', 'shorturl', 'emojimix', 'meme', 'animatedtext', 'togif', 'sticker2gif', 'sticker2mp4', 'mediaurl'],
  run: async ({ client, msg, chat, cmd, args, config }) => {
    if (cmd === 'fancy') {
      const text = args.join(' ').trim(); if (!text) return msg.reply('Kullanım: .fancy <metin>');
      return msg.reply(fancy(text).slice(0, 3000));
    }
    if (cmd === 'calc') {
      const expression = args.join(' ').trim(); if (!expression || expression.length > 300) return msg.reply('Kullanım: .calc <matematik işlemi>');
      try { return msg.reply(`🧮 ${expression} = ${require('mathjs').evaluate(expression)}`); }
      catch { return msg.reply('Bu matematik ifadesi hesaplanamadı.'); }
    }
    if (cmd === 'shorturl') {
      let url; try { url = new URL(args[0]); } catch { return msg.reply('Kullanım: .shorturl https://...'); }
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return msg.reply('Yalnızca web bağlantıları kısaltılabilir.');
      try {
        const response = await fetch(`https://is.gd/create.php?${new URLSearchParams({ format: 'simple', url: url.href })}`, { signal: AbortSignal.timeout(12000) });
        const value = await response.text(); if (!response.ok || !value.startsWith('https://')) throw new Error('Servis bağlantıyı kısaltamadı.');
        return msg.reply(value);
      } catch (e) { return msg.reply(`Bağlantı kısaltılamadı: ${e.message}`); }
    }
    if (cmd === 'emojimix') {
      const emojis = [...args.join(' ').trim()];
      if (emojis.length < 2) return msg.reply('Kullanım: .emojimix 😀 🔥');
      try {
        const url = `https://emojik.vercel.app/s/${encodeURIComponent(emojis[0])}_${encodeURIComponent(emojis[1])}?size=512`;
        const media = await MessageMedia.fromUrl(url, { unsafeMime: true, filename: 'emoji-mix.png' });
        return client.sendMessage(chat.id._serialized, media);
      } catch { return msg.reply('Bu emoji çifti için karışım bulunamadı.'); }
    }
    if (cmd === 'ocr' || cmd === 'removebg' || cmd === 'arka' || cmd === 'remini') {
      const media = await getTargetMedia(msg);
      if (!media || !media.mimetype.startsWith('image/')) return msg.reply(`Bir görseli yanıtlayıp .${cmd} yaz.`);
      const bytes = Buffer.from(media.data, 'base64');
      if (cmd === 'ocr') {
        // Anahtarsız yol: yerel Tesseract. OCR.space yalnızca anahtar varsa
        // denenir — ücretsiz katmanı günde sınırlı isteğe izin veriyor.
        const yerel = require('../lib/ocr');
        const d = yerel.durum(config);
        const t = Date.now();
        try {
          await msg.react('⏳').catch(() => {});
          const sonuc = await yerel.oku(bytes, { config });
          const metin = yerel.bicimle(sonuc);
          if (!metin) {
            await msg.react('❌').catch(() => {});
            if (!config.media.ocrSpaceKey) return msg.reply('Görselde okunabilir metin bulunamadı. (Yerel Tesseract)');
          } else {
            await msg.react('✅').catch(() => {});
            const guven = (sonuc.confidence || 0).toFixed(0);
            return msg.reply(`📝 *Okunan metin* _(${Date.now() - t} ms · güven %${guven} · yerel Tesseract)_\n\n${metin}`);
          }
        } catch (e) {
          await msg.react('❌').catch(() => {});
          if (!config.media.ocrSpaceKey) return msg.reply(`OCR başarısız: ${e.message}`);
        }
        // OCR.space yedeği (yalnızca anahtar varsa buraya düşeriz)
        try {
          const body = new URLSearchParams({ apikey: config.media.ocrSpaceKey, base64Image: `data:${media.mimetype};base64,${media.data}`, language: 'tur', isOverlayRequired: 'false' });
          const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body, signal: AbortSignal.timeout(30000) });
          const data = await res.json();
          const text = data.ParsedResults?.map((x) => x.ParsedText).filter(Boolean).join('\n');
          if (!res.ok || data.IsErroredOnProcessing || !text) return msg.reply('Görselden okunabilir metin çıkarılamadı.');
          return msg.reply(text.slice(0, 3500));
        } catch (e) { return msg.reply(`OCR başarısız: ${e.message}`); }
      }
      if (cmd === 'removebg' || cmd === 'arka') {
        // Önce yerel rembg (anahtarsız, limitsiz). remove.bg yalnızca yedek:
        // 1 Aralık 2026'da kapanıyor ve tek deneme kredisi kalmıştı.
        const yerel = require('../lib/background');
        const durum = yerel.durum(config);
        if (durum.hazir || !config.media.removeBgKey) {
          try {
            await msg.react('⏳').catch(() => {});
            const out = await yerel.kaldir(media, { config });
            await msg.react('✅').catch(() => {});
            return client.sendMessage(chat.id._serialized, new MessageMedia('image/png', out.data.toString('base64'), 'arka-plansiz.png'), { caption: `✂️ Arka plan silindi (yerel rembg)\n_Süreç: ${durum.hazir ? 'sıcak' : 'ilk yükleme'} · model: ${config.media.rembgModel}_` });
          } catch (e) {
            await msg.react('❌').catch(() => {});
            // remove.bg anahtarı varsa onu dene, yoksa anlaşılır hata ver.
            if (!config.media.removeBgKey) return msg.reply(`Arka plan silinemedi: ${e.message}`);
          }
        }
        if (!config.media.removeBgKey) return msg.reply('Arka plan silinemedi: yerel rembg kullanılamıyor ve REMOVEBG_API_KEY da yok.');
        try {
          const form = new FormData(); form.append('image_file', new Blob([bytes], { type: media.mimetype }), media.filename || 'image.png'); form.append('size', 'auto');
          const res = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': config.media.removeBgKey }, body: form, signal: AbortSignal.timeout(60000) });
          if (!res.ok) throw new Error((await res.text()).slice(0, 300));
          const image = Buffer.from(await res.arrayBuffer());
          await msg.react('✅').catch(() => {});
          return client.sendMessage(chat.id._serialized, new MessageMedia('image/png', image.toString('base64'), 'arka-plansiz.png'), { caption: '✂️ Arka plan silindi (remove.bg)' });
        } catch (e) { return msg.reply(`Arka plan silinemedi: ${e.message}`); }
      }
      try {
        const sharp = require('sharp');
        const meta = await sharp(bytes).metadata();
        const width = Math.min((meta.width || 512) * 2, 2048);
        const out = await sharp(bytes).resize({ width, withoutEnlargement: false, kernel: 'lanczos3' }).sharpen().png().toBuffer();
        return client.sendMessage(chat.id._serialized, new MessageMedia('image/png', out.toString('base64'), 'iyilestirilmis.png'));
      } catch (e) { return msg.reply(`Görsel iyileştirilemedi: ${e.message}`); }
    }
    if (cmd === 'meme') {
      const media = await getTargetMedia(msg); if (!media || !media.mimetype.startsWith('image/')) return msg.reply('Bir görseli yanıtlayıp .meme ÜST | ALT yaz.');
      const [top = '', bottom = ''] = args.join(' ').split('|').map((x) => x.trim());
      try {
        const Jimp = require('jimp'); const img = await Jimp.read(Buffer.from(media.data, 'base64'));
        img.cover(512, 512); const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        if (top) img.print(font, 8, 8, { text: top.toUpperCase(), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 496);
        if (bottom) img.print(font, 8, 430, { text: bottom.toUpperCase(), alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER }, 496);
        const out = await img.getBufferAsync(Jimp.MIME_PNG);
        return client.sendMessage(chat.id._serialized, new MessageMedia('image/png', out.toString('base64'), 'meme.png'), { sendMediaAsSticker: true });
      } catch (e) { return msg.reply(`Meme çıkartması hazırlanamadı: ${e.message}`); }
    }
    if (cmd === 'animatedtext') {
      const text = args.join(' ').trim(); if (!text) return msg.reply('Kullanım: .animatedtext <metin>');
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wabot-text-'));
      const imagePath = path.join(dir, 'text.png'), videoPath = path.join(dir, 'text.mp4');
      try {
        const Jimp = require('jimp'); const image = new Jimp(512, 512, 0x18222cff);
        const font = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
        image.print(font, 24, 200, { text, alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER, alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE }, 464, 112);
        await image.writeAsync(imagePath);
        const ffmpeg = require('ffmpeg-static');
        await execFileAsync(ffmpeg, ['-y', '-loop', '1', '-i', imagePath, '-t', '2', '-vf', 'scale=512:512,fps=15', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', videoPath], { timeout: 30000, windowsHide: true });
        const out = MessageMedia.fromFilePath(videoPath);
        return client.sendMessage(chat.id._serialized, out, { sendMediaAsSticker: true, stickerName: config.botName, stickerAuthor: config.creatorName });
      } catch (e) { return msg.reply(`Hareketli yazı çıkartması üretilemedi: ${e.message}`); }
      finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    if (cmd === 'togif') {
      const media = await getTargetMedia(msg); if (!media || !media.mimetype.startsWith('video/')) return msg.reply('Bir videoyu yanıtlayıp .togif yaz.');
      return client.sendMessage(chat.id._serialized, new MessageMedia(media.mimetype, media.data, 'animasyon.mp4'), { sendVideoAsGif: true });
    }
    if (cmd === 'sticker2gif' || cmd === 'sticker2mp4') {
      const media = await getTargetMedia(msg);
      if (!media || (!media.mimetype.includes('webp') && !media.mimetype.startsWith('image/'))) return msg.reply(`Reply to an animated sticker with .${cmd}.`);
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wabot-sticker-'));
      const input = path.join(dir, 'input.webp');
      const output = path.join(dir, cmd === 'sticker2gif' ? 'output.gif' : 'output.mp4');
      try {
        fs.writeFileSync(input, Buffer.from(media.data, 'base64'));
        const ffmpeg = require('ffmpeg-static');
        const args = cmd === 'sticker2gif'
          ? ['-y', '-i', input, '-vf', 'fps=15,scale=512:-1:flags=lanczos', '-loop', '0', output]
          : ['-y', '-i', input, '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output];
        await execFileAsync(ffmpeg, args, { timeout: 45000, windowsHide: true });
        return client.sendMessage(chat.id._serialized, MessageMedia.fromFilePath(output));
      } catch (e) { return msg.reply(`Sticker conversion failed: ${e.message}`); }
      finally { fs.rmSync(dir, { recursive: true, force: true }); }
    }
    if (cmd === 'mediaurl') {
      const media = await getTargetMedia(msg); if (!media) return msg.reply('Bir medya dosyasını yanıtlayıp .mediaurl yaz.');
      if (!config.media.mediaUploadUrl) return msg.reply('Medya bağlantısı oluşturmak için MEDIA_UPLOAD_URL yapılandırılmalı.');
      try {
        const res = await fetch(config.media.mediaUploadUrl, { method: 'POST', headers: { 'content-type': 'application/json', ...(config.media.mediaUploadToken ? { authorization: `Bearer ${config.media.mediaUploadToken}` } : {}) }, body: JSON.stringify({ filename: media.filename || 'media', mimetype: media.mimetype, data: media.data }), signal: AbortSignal.timeout(60000) });
        const data = await res.json(); if (!res.ok || !data.url || !/^https:\/\//i.test(data.url)) throw new Error(data.error || 'Yükleme servisinden geçerli https URL gelmedi.');
        return msg.reply(data.url);
      } catch (e) { return msg.reply(`Medya yüklenemedi: ${e.message}`); }
    }
  }
};
