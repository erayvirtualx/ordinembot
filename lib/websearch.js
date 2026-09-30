// Web araması: sağlayıcı zinciri.
//
// Sıra: Tavily (2 anahtar, 1000 arama/ay) → Bing → Google → DuckDuckGo HTML.
// Amaç: anahtarlı sağlayıcı kotayı bitene kadar devrede olsun, anahtar yoksa
// da komut sessizce ölmesin diye DuckDuckGo devreye girsin.
//
// DuckDuckGo'nun HTML uç noktası resmî API değildir; ara sıra markup
// değişirse sonuç boş döner. Bu yüzden en sonda durur ve hatası ayrı bildirilir.

const { getJson, getText } = require('./http');

const TAVILY_URL = 'https://api.tavily.com/search';
const KUTLE_ETIKETI = { tavily: 'Tavily', bing: 'Bing', google: 'Google', duckduckgo: 'DuckDuckGo' };

// Anahtarlar virgülle ayrılmış tek satırda tutulur (bkz. .env AI_ORDER düzeni).
function anahtarlar(config) {
  const ham = (config && config.media && config.media.tavilyKeys) || '';
  return String(ham).split(',').map((x) => x.trim()).filter(Boolean);
}

// Round-robin: her aramada sıradaki anahtara geç. 429/401 gelirse sıradakini dene.
let imlec = 0;
function siradakiAnahtar(liste) {
  if (!liste.length) return null;
  const anahtar = liste[imlec % liste.length];
  imlec = (imlec + 1) % liste.length;
  return anahtar;
}

async function tavilyDene(query, { sayfa = 5, derinlik = 'basic', anahtar }) {
  const veri = await getJson(TAVILY_URL, {
    method: 'POST',
    // Tavily hem "Authorization: Bearer" hem gövdede api_key kabul ediyor;
    // başlık standart, gövde yedeği (bazı uygulamalar gövdeye bakıyor).
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${anahtar}` },
    body: JSON.stringify({ api_key: anahtar, query, max_results: sayfa, search_depth: derinlik, include_answer: true }),
    timeout: 20000
  });
  const sonuclar = (veri.results || []).map((r) => ({
    baslik: r.title, baglanti: r.url, ozet: r.content, puan: r.score
  }));
  if (!sonuclar.length) throw new Error('sonuç yok');
  return { saglayici: 'tavily', cevap: veri.answer || '', sonuclar };
}

async function bingDene(query, { sayfa = 5, anahtar }) {
  const params = new URLSearchParams({ q: query, count: String(sayfa), 'responseFilter': 'Webpages', 'textDecorations': 'false' });
  const veri = await getJson(`https://api.bing.microsoft.com/v7.0/search?${params}`, {
    headers: { 'Ocp-Apim-Subscription-Key': anahtar }, timeout: 15000
  });
  const sonuclar = (veri.webPages?.value || []).map((r) => ({
    baslik: r.name, baglanti: r.url, ozet: (r.snippet || '').replace(/<[^>]+>/g, ''), puan: null
  }));
  if (!sonuclar.length) throw new Error('sonuç yok');
  return { saglayici: 'bing', cevap: '', sonuclar };
}

async function googleDene(query, { sayfa = 5, anahtar, cx }) {
  const params = new URLSearchParams({ key: anahtar, cx, q: query, num: String(Math.min(sayfa, 10)) });
  const veri = await getJson(`https://www.googleapis.com/customsearch/v1?${params}`, { timeout: 15000 });
  const sonuclar = (veri.items || []).map((r) => ({
    baslik: r.title, baglanti: r.link, ozet: r.snippet || '', puan: null
  }));
  if (!sonuclar.length) throw new Error('sonuç yok');
  return { saglayici: 'google', cevap: '', sonuclar };
}

// DuckDuckGo HTML: resmî API değil, sadece anahtarsız yedek. Başlık ve bağlantı
// çıkarılamazsa hata fırlatıp zincirin sonuna düşeriz.
async function duckduckgoDene(query, { sayfa = 5 }) {
  const html = await getText(`https://html.duckduckgo.com/html/?${new URLSearchParams({ q: query })}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', 'Accept-Language': 'tr-TR,tr;q=0.9' },
    timeout: 20000
  });
  const sonuclar = [];
  const blogu = /<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let eslesme;
  while ((eslesme = blogu.exec(html)) !== null && sonuclar.length < sayfa) {
    let baglanti = eslesme[1];
    // DuckDuckGo yönlendirme bağlantılarını gerçek adrese çevir.
    const yonlendirme = baglanti.match(/[?&]uddg=([^&]+)/);
    if (yonlendirme) { try { baglanti = decodeURIComponent(yonlendirme[1]); } catch { /* olduğu gibi bırak */ } }
    sonuclar.push({
      baslik: eslesme[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim(),
      baglanti,
      ozet: '', puan: null
    });
  }
  if (!sonuclar.length) throw new Error('sonuç yok');
  return { saglayici: 'duckduckgo', cevap: '', sonuclar };
}

/**
 * Zinciri sırayla dener, ilk çalışanı döndürür.
 * @returns {Promise<{saglayici:string, cevap:string, sonuclar:Array, denemeler:string[]}>}
 */
async function ara(query, { config, sayfa = 5, zengin = false } = {}) {
  const m = (config && config.media) || {};
  const denemeler = [];

  // 1) Tavily — anahtar varsa her zaman birinci sırada.
  const havuz = anahtarlar(config);
  for (let deneme = 0; deneme < havuz.length; deneme++) {
    const anahtar = siradakiAnahtar(havuz);
    try {
      const sonuc = await tavilyDene(query, { sayfa, derinlik: zengin ? 'advanced' : 'basic', anahtar });
      sonuc.denemeler = denemeler;
      return sonuc;
    } catch (h) { denemeler.push(`Tavily anahtarı ${deneme + 1}: ${h.message}`); }
  }
  if (!havuz.length) denemeler.push('Tavily: anahtar yok');

  // 2) Bing
  if (m.bingApiKey) {
    try {
      const sonuc = await bingDene(query, { sayfa, anahtar: m.bingApiKey });
      sonuc.denemeler = denemeler;
      return sonuc;
    } catch (h) { denemeler.push(`Bing: ${h.message}`); }
  }

  // 3) Google
  if (m.googleApiKey && m.googleCx) {
    try {
      const sonuc = await googleDene(query, { sayfa, anahtar: m.googleApiKey, cx: m.googleCx });
      sonuc.denemeler = denemeler;
      return sonuc;
    } catch (h) { denemeler.push(`Google: ${h.message}`); }
  }

  // 4) Anahtarsız yedek
  try {
    const sonuc = await duckduckgoDene(query, { sayfa });
    sonuc.denemeler = denemeler;
    return sonuc;
  } catch (h) { denemeler.push(`DuckDuckGo: ${h.message}`); }

  const hata = new Error(`Tüm arama sağlayıcıları başarısız: ${denemeler.join(' | ')}`);
  hata.denemeler = denemeler;
  throw hata;
}

/** Sonuçları WhatsApp mesajına çevirir. */
function bicimle(query, { saglayici, cevap, sonuclar }, { ozet = true } = {}) {
  const satirlar = sonuclar.map((r, i) => {
    const govde = ozet && r.ozet ? `${r.ozet}\n` : '';
    return `${i + 1}. *${r.baslik}*\n${govde}${r.baglanti}`;
  });
  const baslik = `🔎 *${query}* — ${KUTLE_ETIKETI[saglayici] || saglayici} (${sonuclar.length} sonuç)`;
  return [baslik, ...(cevap ? [`💡 ${cevap}`, ''] : []), satirlar.join('\n\n')].join('\n').slice(0, 3900);
}

module.exports = { ara, bicimle, anahtarlar, KUTLE_ETIKETI };
