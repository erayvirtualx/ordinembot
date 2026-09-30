// AI ile görsel üretimi. Sağlayıcı: pollinations (anahtarsız) | openai (gpt-image-1)
const { MessageMedia } = require('whatsapp-web.js');
const { getJson, postBuffer } = require('../lib/http');

const buildUrl = (prompt, model) => {
  const url = new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt.slice(0, 400))}`);
  url.searchParams.set('width', '768');
  url.searchParams.set('height', '768');
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('model', model);
  url.searchParams.set('seed', String(Math.floor(Math.random() * 1e6)));
  return url.href;
};

async function pollinations(prompt, config) {
  return postBuffer(buildUrl(prompt, config.ai.pollinationsModel), null, { method: 'GET', timeout: 120000 });
}

async function openaiImage(prompt, config) {
  const key = config.ai.openaiKey;
  const base = (config.ai.openaiBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
  const data = await getJson(`${base}/images/generations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: config.ai.openaiImageModel, prompt: prompt.slice(0, 900), n: 1, size: '1024x1024' }),
    timeout: 120000
  });
  const item = data?.data?.[0];
  if (!item) throw new Error('Görsel dönmedi.');
  if (item.b64_json) return Buffer.from(item.b64_json, 'base64');
  if (item.url) return postBuffer(item.url, null, { method: 'GET', timeout: 60000 });
  throw new Error('Bilinmeyen yanıt biçimi.');
}

// OpenAI kredisi bitince her .imagine çağrısında 10 saniye beklemenin anlamı yok.
// İlk hatada bir süre Pollinations'a kayar, sonra tekrar dener.
const ACIK_KAL = 30 * 60 * 1000;
let openaiBeklemede = 0;

// Pollinations anonim katmanı hızlı ardışık isteklerde 402 (kota) döndürüyor.
// Kısa bir bekleyip bir kez daha denemek çoğu zaman kurtarıyor.
const kotaHatasi = (e) => /HTTP (402|429)/.test(String(e && e.message));
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

async function pollinationsDene(prompt, config) {
  try {
    return await pollinations(prompt, config);
  } catch (e) {
    if (!kotaHatasi(e)) throw e;
    await bekle(8000);
    return pollinations(prompt, config);
  }
}

module.exports = {
  name: ['imagine', 'ciz', 'çiz', 'resimuret'],
  run: async ({ client, msg, chat, args, config }) => {
    const prompt = (args.join(' ').trim() || msg.quoted?.body || '').trim();
    if (!prompt) return msg.reply('Kullanım: .imagine <çizim açıklaması>\n\nÖrnek: .imagine İstanbul\'da gün batımında sahil, sinematik');

    const pref = config.ai.imageProvider || 'auto';
    // auto: anahtar varsa OpenAI dene, çalışmazsa Pollinations'a düş.
    const openaiVar = pref === 'openai' || (pref === 'auto' && !!config.ai.openaiKey && Date.now() >= openaiBeklemede);
    if (pref === 'openai' && !config.ai.openaiKey) return msg.reply('OPENAI_API_KEY ayarlı değil.');

    await msg.react('⏳').catch(() => {});
    let uretici = openaiVar ? 'OpenAI' : 'Pollinations';
    try {
      let buf, ureten;
      if (openaiVar) {
        try {
          buf = await openaiImage(prompt, config);
          ureten = config.ai.openaiImageModel;
        } catch (e) {
          // Kredi/erişim hatası kalıcıdır: her seferinde yeniden denemeyelim.
          openaiBeklemede = Date.now() + ACIK_KAL;
          uretici = 'Pollinations';
          ureten = config.ai.pollinationsModel;
          buf = await pollinationsDene(prompt, config);
        }
      } else {
        buf = await pollinationsDene(prompt, config);
        ureten = config.ai.pollinationsModel;
      }
      const media = new MessageMedia('image/png', buf.toString('base64'), 'ai.png');
      await msg.react('✅').catch(() => {});
      return client.sendMessage(chat.id._serialized, media, { caption: `🎨 ${prompt}\n\n_${ureten} ile üretildi_` });
    } catch (e) {
      await msg.react('❌').catch(() => {});
      const ipucu = kotaHatasi(e) ? '\n\n_Ücretsiz görsel servisi şu an kotayı doldurmuş görünüyor; birkaç dakika sonra tekrar dene._' : '';
      return msg.reply(`🎨 Görsel üretilemedi (${uretici}): ${e.message}${ipucu}`);
    }
  }
};
