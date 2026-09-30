// Görsel araması: Openverse → Google → Wikimedia Commons.
//
// Openverse anahtarsızdır (Flickr, Wikimedia, NASA ve 20+ kaynağı tarar),
// bu yüzden varsayılan yol o. Google Custom Search kalitesi iyi ama anahtar
// ve CX gerektirir; varsa tercih edilir. Son çare Wikimedia Commons her
// zaman açıktır.
//
// Küçük ve nadir görseller olduğu için sonuçlar önbelleklenir: aynı sorgu
// dakikalar içinde tekrar sorulursa ağa gidilmez.

const { getJson } = require('./http');

const BELLEK = new Map();
const BELLEK_SURESI = 10 * 60 * 1000;   // 10 dakika
const BELLEK_LIMITI = 100;

function bellekAl(anahtar) {
  const kayit = BELLEK.get(anahtar);
  if (!kayit) return null;
  if (Date.now() - kayit.zaman > BELLEK_SURESI) { BELLEK.delete(anahtar); return null; }
  return kayit.deger;
}

function bellekYaz(anahtar, deger) {
  BELLEK.set(anahtar, { zaman: Date.now(), deger });
  if (BELLEK.size > BELLEK_LIMITI) BELLEK.delete(BELLEK.keys().next().value);
}

async function openverseDene(query, { sayfa = 5 }) {
  // Dil süzgeci BILINCLI OLARAK KULLANILMAZ. Openverse ISO 639-1 ("tr")
  // beklerken OCR_LANG bir Tesseract kodu ("tur"); yanlış kod tüm sonuçları
  // eliyor. Sorgu zaten kullanıcının dilinde geliyor.
  const params = new URLSearchParams({ q: query, page_size: String(sayfa), mature: 'false' });
  const veri = await getJson(`https://api.openverse.org/v1/images/?${params}`, {
    headers: { 'User-Agent': 'OrdinemBot/1.0 (WhatsApp botu)' }, timeout: 20000
  });
  const sonuclar = (veri.results || []).map((r) => ({
    baslik: r.title || 'Görsel',
    baglanti: r.url,
    onizleme: r.thumbnail || r.url,
    kaynak: r.source || r.creator || '',
    lisans: r.license || ''
  })).filter((r) => r.baglanti);
  if (!sonuclar.length) throw new Error(`sonuç yok (toplam ${veri.result_count ?? 0})`);
  return { saglayici: 'openverse', sonuclar };
}

async function googleDene(query, { sayfa = 5, anahtar, cx }) {
  const params = new URLSearchParams({ key: anahtar, cx, q: query, num: String(Math.min(sayfa, 10)), searchType: 'image', safe: 'active' });
  const veri = await getJson(`https://www.googleapis.com/customsearch/v1?${params}`, { timeout: 15000 });
  const sonuclar = (veri.items || []).map((r) => ({
    baslik: r.title || 'Görsel', baglanti: r.link, onizleme: r.pagemap?.cse_image?.[0]?.src || r.link,
    kaynak: '', lisans: ''
  }));
  if (!sonuclar.length) throw new Error('sonuç yok');
  return { saglayici: 'google', sonuclar };
}

async function commonsDene(query, { sayfa = 5 }) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', generator: 'search',
    // filetype:bitmap olmadan PDF/vektör de geliyor ve MIME süzgeci onları
    // eliyor; sonuç kutusunda hep boş kalıyordu.
    gsrsearch: `${query} filetype:bitmap`, gsrlimit: String(sayfa), gsrnamespace: '6',
    prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '800'
  });
  const veri = await getJson(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': 'OrdinemBot/1.0 (WhatsApp botu)' }, timeout: 15000
  });
  const sayfalar = Object.values(veri.query?.pages || {});
  const sonuclar = sayfalar.map((p) => ({
    baslik: p.title?.replace(/^Dosya:/, '') || 'Görsel',
    baglanti: p.imageinfo?.[0]?.url,
    onizleme: p.imageinfo?.[0]?.thumburl || p.imageinfo?.[0]?.url,
    kaynak: 'Wikimedia Commons',
    lisans: String(p.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value || '')
  })).filter((r) => r.baglanti && /\.png|\.jpe?g|\.webp/i.test(r.baglanti));
  if (!sonuclar.length) throw new Error('sonuç yok');
  return { saglayici: 'commons', sonuclar };
}

/**
 * Openverse çok kelimeli sorgularda AND mantığı uyguluyor: "panda yavrusu"
 * 0 sonuç verirken "panda" 240 verir. Kullanıcı cümle yazdığında sıfıra
 * düşmemek için kelimeleri teker teker düşürüp yeniden deniyoruz.
 *
 * Dikkat: anonim kova 20 istek/dk sınırında. Bu yüzden en fazla iki gevşetme
 * yapılıyor, sonra diğer sağlayıcılara geçiliyor.
 */
async function openverseDeneEsnek(query, { sayfa = 5 }) {
  const kelimeler = query.split(/\s+/).filter(Boolean);
  const adaylar = [query];
  if (kelimeler.length > 1) {
    adaylar.push(kelimeler.slice(0, -1).join(' '));   // sondaki kelimeyi at
    adaylar.push(kelimeler[0]);                       // sadece ilk kelime
  }
  let sonHata = 'sonuç yok';
  for (const aday of adaylar) {
    try { return await openverseDene(aday, { sayfa }); }
    catch (e) { sonHata = e.message; }
  }
  throw new Error(sonHata);
}

/**
 * @returns {Promise<{saglayici:string, sonuclar:Array, denemeler:string[], gevsetildi?:string}>}
 */
async function ara(query, { config, sayfa = 5 } = {}) {
  const m = (config && config.media) || {};
  const anahtar = `${query}|${sayfa}|${!!m.googleApiKey}`;
  const onbellek = bellekAl(anahtar);
  if (onbellek) return { ...onbellek, onbellekten: true };

  const denemeler = [];
  const siralar = [];
  if (m.googleApiKey && m.googleCx) siralar.push(['google', () => googleDene(query, { sayfa, anahtar: m.googleApiKey, cx: m.googleCx })]);
  siralar.push(['openverse', () => openverseDeneEsnek(query, { sayfa })]);
  siralar.push(['commons', () => commonsDene(query, { sayfa })]);

  for (const [ad, dene] of siralar) {
    try {
      const sonuc = await dene();
      sonuc.denemeler = denemeler;
      bellekYaz(anahtar, sonuc);
      return sonuc;
    } catch (e) { denemeler.push(`${ad}: ${e.message}`); }
  }
  const hata = new Error(`Görsel araması başarısız: ${denemeler.join(' | ')}`);
  hata.denemeler = denemeler;
  throw hata;
}

/**
 * Sonucu WhatsApp'a gönderilecek hale getirir.
 *
 * Kaynak URL'lerine doğrudan güvenilmez: Flickr tarayıcı dışı isteğe 403
 * veriyor, Openverse'ın thumbnail vekil adresi ara sıra 424 döndürüyor,
 * Commons'daki orijinal dosyalar 3 MB'a çıkabiliyor. Bu yüzden aday aday
 * denenir, içerik gerçekten görsel mi diye doğrulanır ve gerekiyorsa küçültülür.
 *
 * @returns {Promise<{data:Buffer, mimetype:string, baslik:string, lisans:string, kaynak:string}>}
 */
async function getir(sonuc) {
  // Sıra: önce vekil küçük görsel, sonra kaynak. Aynı adres iki kez denenmesin.
  const adaylar = [...new Set([sonuc.onizleme, sonuc.baglanti].filter(Boolean))];

  const hatalar = [];
  for (const aday of adaylar) {
    if (!aday) continue;
    try {
      const res = await fetch(aday, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36', Accept: 'image/*,*/*' },
        redirect: 'follow', signal: AbortSignal.timeout(20000)
      });
      if (!res.ok) { hatalar.push(`${aday.slice(0, 50)}: HTTP ${res.status}`); continue; }
      const tur = (res.headers.get('content-type') || '').split(';')[0].trim();
      if (!/^image\//.test(tur)) { hatalar.push(`${aday.slice(0, 50)}: görsel değil (${tur})`); continue; }
      let veri = Buffer.from(await res.arrayBuffer());
      if (veri.length > 4 * 1024 * 1024) veri = await kucult(veri);
      return { data: veri, mimetype: tur, baslik: sonuc.baslik, lisans: sonuc.lisans, kaynak: sonuc.kaynak };
    } catch (e) { hatalar.push(`${String(aday).slice(0, 50)}: ${e.message}`); }
  }
  throw new Error(`görsel indirilemedi — ${hatalar.join(' | ')}`);
}

// WhatsApp'a 3 MB'lık fotoğraf göndermek gereksiz; genişliği 1280'e indir.
async function kucult(veri) {
  try {
    const sharp = require('sharp');
    return await sharp(veri).rotate().resize({ width: 1280, height: 1280, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  } catch { return veri; }
}

module.exports = { ara, getir, BELLEK };
