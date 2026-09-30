// Metin okuma (OCR) — anahtarsız, yerel.
//
// Neden kalıcı worker? tesseract.js her seferinde yeniden kurulursa model
// belleğe tekrar yüklenir. Ölçülen: ilk kurulum ~1.3 sn, tanıma 190 ms,
// sonrakiler 90 ms. Aynı mantık lib/background.js (rembg) ile birebir aynı.
//
// OCR.space anahtarı varsa o yol da kullanılabilir; ancak anahtarsız da
// çalıştığı için varsayılan yol bu. ocr.space ücretsiz katmanı günde sınırlı
// istek kabul ediyor ve anahtar olmadan reddediyor.

const fs = require('fs');
const path = require('path');

const VERI = path.join(__dirname, '..', '.tessdata');
const KURULMA_SURESI = 90 * 1000;   // model belleğe alınana kadar
const TANIMA_SURESI = 45 * 1000;    // tek görsel için üst sınır

let isci = null;         // tesseract worker
const kurulum = {};      // dil → Promise
let sonHata = '';
let siradakiDil = 'tur+eng';
let kuyrukDerinligi = 0;

function diller(config) {
  const ayar = (config && config.media && config.media.ocrLang) || 'tur+eng';
  return String(ayar).split('+').map((x) => x.trim().toLowerCase()).filter((x) => /^[a-z]{2,3}$/.test(x)).join('+') || 'tur+eng';
}

// Eğitim dosyaları .tessdata içinde mi? Yoksa tesseract.js ilk kullanımda
// indirip oraya yazar; ama indirme başarısız olursa komut açıklama yerine
// "şunu yap" demeli.
function modelVarMi(dil) {
  return dil.split('+').every((d) => fs.existsSync(path.join(VERI, `${d}.traineddata`)));
}

function workerKur(config) {
  const dil = diller(config);
  siradakiDil = dil;
  if (modelVarMi(dil)) sonHata = '';
  const { createWorker } = require('tesseract.js');
  return createWorker(dil, 1, {
    langPath: VERI,
    cachePath: VERI,
    // Kurulum ilerlemesini stdout'a yazdırmak botun günlüğünü bozuyor.
    logger: () => {},
    errorHandler: (e) => { sonHata = String(e && e.message ? e.message : e).slice(0, 300); }
  });
}

async function hazirWorker(config) {
  const dil = diller(config);
  if (isci) return isci;
  if (kurulum[dil]) return kurulum[dil];

  kurulum[dil] = new Promise((coz, red) => {
    const zamanAsimi = setTimeout(() => {
      delete kurulum[dil];
      red(new Error('OCR modeli zamanında yüklenemedi.'));
    }, KURULMA_SURESI);

    workerKur(config).then((w) => {
      clearTimeout(zamanAsimi);
      isci = w;
      delete kurulum[dil];
      coz(w);
    }).catch((e) => {
      clearTimeout(zamanAsimi);
      delete kurulum[dil];
      sonHata = String(e && e.message ? e.message : e).slice(0, 300);
      red(new Error(sonHata || 'OCR motoru başlatılamadı.'));
    });
  });
  return kurulum[dil];
}

/**
 * Görseldeki metni okur.
 * tesseract.js v5+ `recognize()` sözleşmesi { data: { text, confidence } } döndürüyor;
 * eski sürümler doğrudan { text, confidence }. İkisini de karşıla.
 * @param {Buffer|string} media base64 ya da Buffer
 * @param {{config:object}} secenek
 * @returns {Promise<{text:string, confidence:number}>}
 */
async function oku(media, { config } = {}) {
  const veri = Buffer.isBuffer(media) ? media : Buffer.from(String(media), 'base64');
  if (!veri.length) throw new Error('Görsel boş.');
  if (veri.length > 12 * 1024 * 1024) throw new Error('Görsel çok büyük (en fazla 12 MB).');

  const worker = await hazirWorker(config);
  kuyrukDerinligi++;
  try {
    const ham = await Promise.race([
      worker.recognize(veri),
      new Promise((_, red) => setTimeout(() => red(new Error('Metin okuma zaman aşımına uğradı.')), TANIMA_SURESI))
    ]);
    const veri2 = (ham && ham.data && typeof ham.data === 'object') ? ham.data : (ham || {});
    return { text: String(veri2.text || ''), confidence: Number(veri2.confidence) || 0 };
  } finally {
    kuyrukDerinligi--;
  }
}

/** Sonucu WhatsApp'a gönderilecek kısa metne çevirir. */
function bicimle(sonuc) {
  const metin = String((sonuc && sonuc.text) || '')
    .split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
  return metin.slice(0, 3500);
}

/** .ayarlar ve açılış mesajı için: OCR kullanılabilir mi? */
function durum(config) {
  if (isci) return { hazir: true, dil: siradakiDil, bekleyen: kuyrukDerinligi, hata: '' };
  const dil = diller(config);
  if (!modelVarMi(dil)) {
    return { hazir: false, dil, bekleyen: 0, hata: `${dil} modeli yok (.tessdata klasörüne indirilecek)` };
  }
  return { hazir: false, dil, bekleyen: 0, hata: '' };
}

const kapat = async () => {
  const w = isci;
  isci = null;
  for (const d of Object.keys(kurulum)) delete kurulum[d];
  if (w) { try { await w.terminate(); } catch { /* zaten kapanmış */ } }
};

module.exports = { oku, bicimle, durum, kapat, modelVarMi, VERI };
