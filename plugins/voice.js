const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(require('ffmpeg-static'));
const { tmpFile, getTargetMedia, cleanup } = require('../lib/media');
const { MessageMedia } = require('whatsapp-web.js');

// efekt adı -> ffmpeg filtresi
const EFFECTS = {
  tiz:    'asetrate=44100*1.35,aresample=44100',
  kalin:  'asetrate=44100*0.75,aresample=44100',
  robot:  'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75,volume=2',
  hizli:  'atempo=1.5',
  yavas:  'atempo=0.7'
};

module.exports = {
  name: ['ses', 'sesefekt'],
  run: async ({ client, msg, chat, args }) => {
    const effect = (args[0] || '').toLocaleLowerCase('tr');
    if (!EFFECTS[effect]) return msg.reply(`Kullanım: .ses <efekt> (bir ses/video mesajını yanıtla)\nEfektler: ${Object.keys(EFFECTS).join(', ')}`);
    const media = await getTargetMedia(msg);
    if (!media) return msg.reply('Bir ses mesajını yanıtlayarak kullan.');

    const inFile = tmpFile('ogg'), outFile = tmpFile('ogg');
    fs.writeFileSync(inFile, Buffer.from(media.data, 'base64'));
    try {
      await new Promise((resolve, reject) => {
        ffmpeg(inFile).audioFilters(EFFECTS[effect]).format('ogg').audioCodec('libopus')
          .on('end', resolve).on('error', reject).save(outFile);
      });
      const out = MessageMedia.fromFilePath(outFile);
      await client.sendMessage(chat.id._serialized, out, { sendAudioAsVoice: true });
    } catch (e) {
      await msg.reply('⚠️ Ses işlenemedi. ffmpeg sistemde çalışıyor mu kontrol et.\n' + e.message);
    } finally {
      cleanup(inFile, outFile);
    }
  }
};
