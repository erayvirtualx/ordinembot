// Metinden sese (TTS) üretimi ve ses dosyasını WhatsApp ses mesajına hazırlama.
const fs = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { postBuffer } = require('./http');
const { tmpFile, cleanup } = require('./media');

const execFileAsync = promisify(execFile);

const LANGUAGES = {
  tr: 'tr', az: 'az', en: 'en', de: 'de', fr: 'fr', es: 'es', it: 'it',
  ru: 'ru', ar: 'ar', fa: 'fa', ja: 'ja', ko: 'ko', zh: 'zh', nl: 'nl', pt: 'pt'
};
const normalizeLang = (l) => LANGUAGES[String(l || 'tr').toLowerCase().slice(0, 2)] || 'tr';

// Google Translate TTS isteğinde uzun metin reddediliyor; kelime sınırlarında bölüyoruz.
function chunk(text, max = 180) {
  const words = text.split(/\s+/).filter(Boolean);
  const out = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) { if (cur) out.push(cur); cur = w; }
    else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  return out;
}

async function gTts(text, lang) {
  const parts = chunk(text);
  const buffers = [];
  for (const part of parts) {
    const url = new URL('https://translate.google.com/translate_tts');
    url.searchParams.set('ie', 'UTF-8');
    url.searchParams.set('client', 'tw-ob');
    url.searchParams.set('tl', lang);
    url.searchParams.set('q', part);
    buffers.push(await postBuffer(url.href, null, { timeout: 20000 }));
  }
  return { data: Buffer.concat(buffers), mimetype: 'audio/mpeg' };
}

async function openaiTts(text, config) {
  const key = config.ai.openaiKey;
  if (!key) throw new Error('OPENAI_API_KEY ayarlı değil.');
  const base = (config.ai.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const data = await postBuffer(`${base}/audio/speech`, JSON.stringify({
    model: config.media.openaiTtsModel, voice: config.media.openaiTtsVoice, input: text
  }), {
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    timeout: 90000
  });
  return { data, mimetype: 'audio/mpeg' };
}

async function elevenLabsTts(text, config) {
  const key = config.media.elevenlabsKey;
  if (!key) throw new Error('ELEVENLABS_API_KEY ayarlı değil.');
  const data = await postBuffer(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.media.elevenlabsVoice)}`,
    JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
    { headers: { 'xi-api-key': key, 'content-type': 'application/json', accept: 'audio/mpeg' }, timeout: 90000 }
  );
  return { data, mimetype: 'audio/mpeg' };
}

async function speak(text, config) {
  const provider = (config.media.ttsProvider || 'gtts').toLowerCase();
  const lang = normalizeLang(config.media.ttsLang);
  if (provider === 'openai') return openaiTts(text, config);
  if (provider === 'elevenlabs') return elevenLabsTts(text, config);
  if (provider !== 'gtts') throw new Error(`Desteklenmeyen TTS sağlayıcısı: ${provider}`);
  return gTts(text, lang);
}

// MP3 -> OGG/Opus. WhatsApp ses mesajı (ptt) yalnızca ses biçimlerini kabul eder.
async function toVoiceNote(audio, mimetype) {
  const ffmpeg = require('ffmpeg-static');
  const input = tmpFile(mimetype.includes('mpeg') ? 'mp3' : 'bin');
  const output = tmpFile('ogg');
  fs.writeFileSync(input, audio.data);
  try {
    await execFileAsync(ffmpeg, ['-y', '-i', input, '-c:a', 'libopus', '-b:a', '48k', '-ar', '48000', '-ac', '1', '-vn', output],
      { timeout: 60000, windowsHide: true });
    return output;
  } catch (e) {
    cleanup(input, output);
    throw new Error('Ses dönüştürülemedi (ffmpeg): ' + e.message);
  }
}

// Metni ses mesajı olarak hazırlar. Dönüş: { media, cleanup }
async function toVoice(text, config) {
  const audio = await speak(text, config);
  const ogg = await toVoiceNote(audio, audio.mimetype);
  return { file: ogg, inputWas: 'mp3' };
}

module.exports = { speak, toVoice, toVoiceNote, normalizeLang, LANGUAGES, chunk };
