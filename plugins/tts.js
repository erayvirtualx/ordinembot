// Metinden sese (TTS). Sağlayıcı: gtts (varsayılan) | openai | elevenlabs
const { MessageMedia } = require('whatsapp-web.js');
const { toVoice, normalizeLang, LANGUAGES } = require('../lib/tts');
const { cleanup } = require('../lib/media');
const db = require('../lib/db');

module.exports = {
  name: ['tts', 'sesli', 'konus'],
  run: async ({ client, msg, chat, args, cmd, config, senderNum }) => {
    const u = db.user(senderNum);

    if (cmd === 'ttsdil') {
      const lang = normalizeLang(args[0]);
      if (!LANGUAGES[lang]) return msg.reply(`Desteklenmeyen dil. Seçenekler: ${Object.keys(LANGUAGES).join(', ')}`);
      u.ttsLang = lang; db.save();
      return msg.reply(`🌐 TTS dili: *${lang}* olarak ayarlandı.`);
    }

    let text = args.join(' ').trim();
    let lang = normalizeLang(u.ttsLang || config.media.ttsLang);

    // ".tts en hello" biçiminde dil ön eki desteklenir.
    if (args[0] && LANGUAGES[args[0].toLowerCase().slice(0, 2)]) {
      lang = normalizeLang(args[0]);
      text = args.slice(1).join(' ').trim();
    }

    if (!text) {
      return msg.reply(`🌐 Şu an: *${lang}*\nKullanım: .tts <metin> · .tts <dil> <metin>\n\nDiller: ${Object.keys(LANGUAGES).join(', ')}\nVarsayılanı değiştir: .ttsdil <dil>`);
    }
    if (text.length > 900) return msg.reply('Metin çok uzun (en fazla 900 karakter).');

    await msg.react('⏳').catch(() => {});
    let file;
    try {
      ({ file } = await toVoice(text, { ...config, media: { ...config.media, ttsLang: lang } }));
      const media = await MessageMedia.fromFilePath(file);
      await client.sendMessage(chat.id._serialized, media, { sendAudioAsVoice: true, mimetype: 'audio/ogg; codecs=opus' });
    } catch (e) {
      return msg.reply(`🔇 Ses oluşturulamadı: ${e.message}`);
    } finally {
      if (file) cleanup(file);
      await msg.react('✅').catch(() => {});
    }
  }
};

module.exports.name = ['tts', 'sesli', 'konus', 'ttsdil'];
