// Hangi servisler yapılandırılmış? Bot açılışında ve `.ayarlar` komutunda
// tek bakışta görülsün diye. config.js bunu require eder, o yüzden burada
// config'e bağımlı olmadan çalışır.
const fs = require('fs');

// yt-dlp yolu ya tam yol ya da PATH'te aranan bir dosya adı olabilir.
// İkinci durumda PATH'in her klasörünü tek tek kontrol etmek gerekir.
function ytdlpVar(path) {
  if (!path) return false;
  if (path.includes('/') || path.includes('\\')) {
    try { return fs.existsSync(path); } catch { return false; }
  }
  const exts = process.platform === 'win32' ? ['.exe', '.cmd', '.bat', ''] : [''];
  for (const dir of (process.env.PATH || '').split(process.platform === 'win32' ? ';' : ':')) {
    if (!dir) continue;
    for (const ext of exts) {
      try { if (fs.existsSync(path.join(dir.trim(), path + ext))) return true; } catch { /* geçersiz yol */ }
    }
  }
  return false;
}

// Arka plan kaldırma: yerel rembg anahtarsız ve limitsiz olduğu için tercih
// edilen yol. remove.bg anahtarı yalnızca yedek.
function arkaPlanDurumu(config) {
  const yerel = require('./background');
  const d = yerel.durum(config);
  const yedek = config.media.removeBgKey ? ' · remove.bg yedek' : '';
  if (d.hazir) return `yerel rembg (sıcak, ${d.model})${yedek}`;
  if (d.hata) return `yerel rembg KULLANILAMIYOR — ${d.hata}${yedek}`;
  if (config.media.removeBgKey) return `remove.bg (yerel rembg kurulu değil)`;
  return `yerel rembg (ilk kullanımda yüklenecek)${yedek}`;
}

// Metin okuma: yerel Tesseract anahtarsız ve limitsiz olduğu için tercih edilen
// yol. OCR.space yalnızca anahtar varsa yedek olarak devreye girer.
function ocrDurumu(config) {
  const ocr = require('./ocr');
  const d = ocr.durum(config);
  const yedek = config.media.ocrSpaceKey ? ' · ocr.space yedek' : '';
  if (d.hazir) return `yerel Tesseract (sıcak, ${d.dil})${yedek}`;
  if (d.hata) return `yerel Tesseract KULLANILAMIYOR — ${d.hata}${yedek}`;
  return `yerel Tesseract (${d.dil}, ilk kullanımda yüklenecek)${yedek}`;
}

// Web araması zinciri: Tavily → Bing → Google → DuckDuckGo. Sırada olan
// sağlayıcı ilk çalışan olacağı için hepsini sırayla göstermek gereksiz;
// aktif olanı ve yedekleri tek satırda özetle.
function webAramaDurumu(m) {
  const tavily = String(m.tavilyKeys || '').split(',').map((x) => x.trim()).filter(Boolean).length;
  if (tavily) {
    const yedek = [];
    if (m.bingApiKey) yedek.push('Bing');
    if (m.googleApiKey && m.googleCx) yedek.push('Google');
    yedek.push('DuckDuckGo');
    return `Tavily (${tavily} anahtar)${yedek.length ? ` → ${yedek.join(' → ')}` : ''}`;
  }
  if (m.bingApiKey) return 'Bing (Tavily anahtarı yok)';
  if (m.googleApiKey && m.googleCx) return 'Google (Tavily anahtarı yok)';
  return 'DuckDuckGo (anahtarsız — kırılgan, kalitesiz)';
}

function apiDurumu(config) {
  const a = config.ai;
  const m = config.media;

  // Yapay zekâ havuzu: kaç sağlayıcı, kaç anahtar, hangileri soğutmada.
  const havuz = a.havuz || [];
  const ai = require('./ai');
  const sag = ai.saglik(config);
  const anahtarToplam = havuz.reduce((t, p) => t + p.anahtarlar.length, 0) + a.apiKeys.length;
  const sogutulan = sag.filter((s) => s.durum !== 'hazır').length;
  const ytdlpBulundu = ytdlpVar(m.ytdlpPath);

  return {
    'Yapay zekâ': havuz.length
      ? `${havuz.length} sağlayıcı · ${anahtarToplam} anahtar${sogutulan ? ` · ${sogutulan} soğutmada` : ''}`
      : 'havuz boş — .env içine anahtar ekle',
    'Yapay zekâ sırası': havuz.length ? havuz.map((p) => p.ad).join(' → ') : '-',
    'Görsel üretimi': a.imageProvider === 'openai'
      ? (a.openaiKey ? 'OpenAI' : 'OpenAI seçili ama anahtar yok → Pollinations')
      : a.imageProvider === 'pollinations' ? 'Pollinations (anahtarsız)'
      : a.openaiKey ? 'auto → OpenAI, hata olursa Pollinations' : 'auto → Pollinations (anahtarsız)',
    'Metinden sese': m.ttsProvider,
    'Arka plan kaldırma': arkaPlanDurumu(config),
    'Metin okuma (OCR)': ocrDurumu(config),
    'Web araması': webAramaDurumu(m),
    'Haber kaynağı': `${m.newsFeeds.length} kaynak`,
    'Otomatik indirme': ytdlpBulundu ? `yt-dlp (${m.ytdlpPath})` : 'yt-dlp BULUNAMADI'
  };
}

/** Eksik olan kritik şeyleri tek listeye toplar. */
function eksikler(config) {
  const s = apiDurumu(config);
  const out = [];
  if (s['Yapay zekâ'].startsWith('havuz boş')) out.push('Yapay zekâ anahtarı yok — `.ai` komutu boş cevap verir');
  if (s['Yapay zekâ'].includes('0 anahtar')) out.push('Havuzdaki sağlayıcıların hiçbirinin anahtarı yok');
  if (s['Arka plan kaldırma'].includes('KULLANILAMIYOR') && !config.media.removeBgKey) {
    out.push('Arka plan kaldırma için rembg kurulu değil (pip install rembg) ve REMOVEBG_API_KEY da yok');
  }
  if (s['Metin okuma (OCR)'].includes('KULLANILAMIYOR') && !config.media.ocrSpaceKey) {
    out.push('Metin okuma için Tesseract modeli eksik ve OCR_SPACE_API_KEY da yok');
  }
  if (s['Otomatik indirme'].includes('BULUNAMADI')) out.push('yt-dlp bulunamadı — tüm indirme komutları çalışmaz');
  if (s['Web araması'].includes('anahtarsız')) out.push('Web araması anahtarsız yedekte — TAVILY_KEYS eklemek kaliteyi ciddi artırır');
  if (config.owner === '905XXXXXXXXX') out.push('config.owner ayarlanmadı — sahip komutları kilitli');
  return out;
}

module.exports = { apiDurumu, eksikler };
