// Çoklu sağlayıcılı yapay zekâ istemcisi.
//
// Çalışma mantığı:
//   1) config.ai.havuz sırayla denenir (Gemini → Groq → Mistral → OpenRouter …).
//   2) Her sağlayıcıda anahtarlar döngüsel (round-robin) dağıtılır, böylece
//      kota tek anahtarda bitince diğerleri devralır.
//   3) Bir sağlayıcıda model de sırayla denenir; ücretsiz katmanlarda modeller
//      "high demand" / "rate limit" verip çalışmadığı için bu şart.
//   4) Sağlayıcı arka arkaya hata verirse kısa süreli "soğutma"ya alınır ki
//      her istekte aynı ölü sağlayıcıda vakit kaybetmeyelim.
//   5) Hepsini deneyip hiçbiri çalışmazsa anlaşılır Türkçe hata fırlatılır.

const { SAGLAYICILAR } = require('./aiproviders');

// Sağlayıcı adı -> sıradaki anahtar imleci
const imlec = {};
// Sağlayıcı adı -> { hata: art arda hata sayısı, sonHata, bitecegi }
const sogutma = new Map();

const SOGUTMA_ESIK = 2;               // kaç arka arkaya hatadan sonra soğutulsun
const SOGUTMA_SURE = 5 * 60 * 1000;  // 5 dakika (geçici hatalar)
const UZUN_SOGUTMA = 60 * 60 * 1000; // 1 saat (kredi bitti / anahtar bozuk)

// ---------------------------------------------------------------- hata çevirisi

function hatayaCevir(status, err) {
  const m = String((err && (err.message || err.code)) || err || '');
  if (/credit balance|insufficient.?quota|no credits remaining|billing|not.*balance/i.test(m)) {
    return 'Hesap kredisi bitti. Bu sağlayıcı artık kullanılamıyor.';
  }
  if (status === 401 || /invalid.?x.?api.?key|unauthorized|api key not valid|permission/i.test(m)) {
    return 'API anahtarı geçersiz veya yetkisiz.';
  }
  if (status === 429 || /rate.?limit|quota|high demand|overloaded|resource.?exhausted/i.test(m)) {
    return 'Servis şu an kapasitesini doldurmuş.';
  }
  if (status === 404 || /model.*not found|not_found_error|no such model/i.test(m)) {
    return 'Model bulunamadı.';
  }
  if (/overloaded|503|502|500|timeout|fetch failed|econnreset|aborted/i.test(m)) {
    return 'Servise şu an ulaşılamıyor.';
  }
  return m || `HTTP ${status}`;
}

// Bu hatadan sonra başka sağlayıcı denemek anlamlı mı?
// 401/403 anahtarın bozuk olduğunu söyler; aynı sağlayıcının diğer anahtarları
// farklı olabilir, bu yüzden onları deneriz ama MODEL denemeyi bırakırız.
function kaliciHata(err) {
  return [400, 401, 403, 404].includes(err && err.status);
}

// ------------------------------------------------------------------ soğutma

// Sağlayıcı soğutmada mı? Sayaç eşiğe ulaşmadan soğutma başlamaz; süre
// dolunca kayıt silinir ve sağlayıcı yeniden denenir.
function sogutulduMu(ad) {
  const s = sogutma.get(ad);
  if (!s) return false;
  if (s.hata < SOGUTMA_ESIK) return false;
  if (Date.now() < s.bitecegi) return true;
  sogutma.delete(ad);          // süresi doldu, tekrar dene
  return false;
}

function hatasiIsle(ad, err) {
  const s = sogutma.get(ad) || { hata: 0, sonHata: '', bitecegi: 0 };
  s.hata += 1;
  s.sonHata = err.message;
  s.bitecegi = Date.now() + (kaliciEngelMi(err) ? UZUN_SOGUTMA : SOGUTMA_SURE);
  // Sayaç yalnızca eşiğe ulaşınca haritada tutuluyordu; böylece her hatada
  // sıfırdan başlıyor ve soğutma hiç devreye girmiyordu. Şimdi her hatada
  // yazıyoruz, eşiğe ulaşınca da aynı kayıt geçerli kalıyor.
  sogutma.set(ad, s);
  return s;
}

// Kredi bitmiş ya da anahtar bozuk sağlayıcıyı 5 dakika soğutmak anlamsız:
// dakikalar içinde düzelmeyecek, her istekte boşuna iki çağrı gidecek.
function kaliciEngelMi(err) {
  return /kredisi bitti|anahtarı geçersiz|yetkisiz/i.test(String((err && err.message) || ''));
}

function basari(ad) {
  if (sogutma.has(ad)) sogutma.delete(ad);
}

// ------------------------------------------------------------------ anahtar

// Anahtarları döngüsel sırada döndürür: [1,2,3] → 1,2,3,1,2,3…
function siradakiAnahtarlar(ad, anahtarlar) {
  if (!anahtarlar || anahtarlar.length <= 1) return anahtarlar || [];
  const bas = imlec[ad] || 0;
  imlec[ad] = (bas + 1) % anahtarlar.length;
  return anahtarlar.map((_, i) => anahtarlar[(bas + i) % anahtarlar.length]);
}

// Gemini anahtar vermeden de (ücretsiz katman) çalışabiliyor.
function anahtarListesi(p) {
  return p.anahtarlar && p.anahtarlar.length ? p.anahtarlar : [null];
}

// ------------------------------------------------------------------- çağrı

function govdeHazirla(p, key, model, system, messages, image) {
  const son = messages[messages.length - 1];

  if (p.tur === 'gemini') {
    const parts = image
      ? [{ text: son.content }, { inline_data: { mime_type: image.mimetype, data: image.data } }]
      : [{ text: son.content }];
    return {
      // Anahtar sorgu dizesinde; başlıkta gönderilmez.
      url: `${p.baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key || '')}`,
      govde: {
        systemInstruction: { parts: [{ text: system }] },
        contents: [
          ...messages.slice(0, -1).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          { role: 'user', parts }
        ],
        generationConfig: { maxOutputTokens: 900 }
      },
      anahtarUrlDizininde: true
    };
  }

  if (p.tur === 'openai') {
    const content = image
      ? [{ type: 'text', text: son.content }, { type: 'image_url', image_url: { url: `data:${image.mimetype};base64,${image.data}` } }]
      : son.content;
    return {
      url: `${p.baseUrl.replace(/\/$/, '')}/chat/completions`,
      govde: {
        model,
        messages: [{ role: 'system', content: system }, ...messages.slice(0, -1), { role: 'user', content }],
        max_tokens: 900
      },
      anahtarYerinde: 'authorization',
      anahtarBicim: 'bearer'
    };
  }

  // anthropic
  const content = image
    ? [{ type: 'image', source: { type: 'base64', media_type: image.mimetype, data: image.data } }, { type: 'text', text: son.content }]
    : son.content;
  return {
    url: `${p.baseUrl}/messages`,
    govde: { model, max_tokens: 900, system, messages: [...messages.slice(0, -1), { role: 'user', content }] },
    basliklar: { 'anthropic-version': '2023-06-01' },
    anahtarYerinde: 'x-api-key',
    anahtarBicim: 'düz'
  };
}

async function tekDene(p, key, model, system, messages, image) {
  const h = govdeHazirla(p, key, model, system, messages, image);
  const basliklar = { 'content-type': 'application/json', ...(p.ekBasliklar || {}), ...(h.basliklar || {}) };
  if (h.anahtarYerinde) basliklar[h.anahtarYerinde] = h.anahtarBicim === 'bearer' ? `Bearer ${key}` : key;

  const res = await fetch(h.url, { method: 'POST', headers: basliklar, body: JSON.stringify(h.govde) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(hatayaCevir(res.status, data.error || data)), { status: res.status });

  if (p.tur === 'gemini') {
    const m = data.candidates?.[0]?.content?.parts?.map((x) => x.text || '').join('') || '';
    if (!m.trim()) throw Object.assign(new Error('Boş cevap döndü.'), { status: 502 });
    return m.trim();
  }
  if (p.tur === 'openai') {
    const m = data.choices?.[0]?.message?.content || '';
    if (!m.trim()) throw Object.assign(new Error('Boş cevap döndü.'), { status: 502 });
    return m.trim();
  }
  const m = data.content?.[0]?.text || '';
  if (!m.trim()) throw Object.assign(new Error('Boş cevap döndü.'), { status: 502 });
  return m.trim();
}

// ------------------------------------------------------------------ dış API

/**
 * Havuzu sırayla dener, ilk çalışan cevabı döndürür.
 * @param {object} config
 * @param {string} system
 * @param {Array<{role:string,content:string}>} messages
 * @param {{image?:{mimetype:string,data:string}}} [secenek]
 * @returns {Promise<{metin:string, saglayici:string, model:string}>}
 */
async function complete(config, system, messages, { image } = {}) {
  const havuz = (config.ai && config.ai.havuz) || [];
  const yedekler = (config.ai && config.ai.apiKeys) || [];
  // AI_API_KEYS verildiyse havuzun başına, OpenAI uyumlu genel bir sağlayıcı olarak ekle.
  const kayitler = yedekler.length
    ? [{ ad: 'ai_api_keys', adTR: 'Yedek anahtarlar', tur: 'openai', baseUrl: (config.ai.openaiBaseUrl || 'https://api.openai.com/v1'), anahtarlar: yedekler, modeller: [config.ai.openaiModel || 'gpt-4o-mini'] }, ...havuz]
    : havuz;

  if (!kayitler.length) {
    throw new Error('Yapay zekâ anahtarı yok. .env içine en az bir anahtar ekle (örn. GROQ_KEYS=...).');
  }

  const denenenler = [];
  for (const p of kayitler) {
    if (sogutulduMu(p.ad)) { denenenler.push(`${p.ad}: soğutmada`); continue; }
    for (const key of siradakiAnahtarlar(p.ad, anahtarListesi(p))) {
      for (const model of p.modeller) {
        try {
          const metin = await tekDene(p, key, model, system, messages, image);
          basari(p.ad);
          return { metin, saglayici: p.adTR || p.ad, model };
        } catch (e) {
          denenenler.push(`${p.ad}/${model}: ${e.message}`);
          hatasiIsle(p.ad, e);
          // Anahtar/model seviyesinde kalıcı hata → diğerlerini denemeye değmez
          if (kaliciHata(e)) break;
        }
      }
    }
  }

  const ozet = denenenler.slice(-4).join(' · ');
  throw new Error(`Şu anda hiçbir yapay zekâ sağlayıcısı cevap vermiyor. (${ozet})`);
}

/** Sadece sağlayıcı sağlık durumu — açılış banner'ı ve .ayarlar için. */
function saglik(config) {
  const havuz = (config.ai && config.ai.havuz) || [];
  return havuz.map((p) => {
    const s = sogutma.get(p.ad);
    return {
      ad: p.ad,
      adTR: p.adTR,
      tur: p.tur,
      anahtarSayisi: p.anahtarlar.length,
      modelSayisi: p.modeller.length,
      ilkModel: p.modeller[0],
      durum: sogutulduMu(p.ad) ? 'soğutmada' : 'hazır',
      sonHata: s ? s.sonHata : ''
    };
  });
}

module.exports = { complete, saglik, SAGLAYICILAR };
