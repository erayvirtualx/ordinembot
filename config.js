// .env dosyasını OKUMAK İÇİN ŞART. Bu satır module.exports'tan ÖNCE olmalı,
// çünkü aşağıdaki tüm process.env.* okumaları dosya yüklenirken çalışır.
// dotenv, gerçek ortam değişkenlerinin .env'yi ezmesine izin verir.
require('dotenv').config({ quiet: true });

const list = (v, fallback) => (v || fallback).split(',').map((x) => x.trim()).filter(Boolean);

const { SAGLAYICILAR, ANAHTARSIZ, VARSAYILAN_SIRA } = require('./lib/aiproviders');

// Yapay zekâ sağlayıcı havuzunu .env'den kurar.
// Her sağlayıcı için anahtarlar (virgülle ayrılmış) ve model listesi okunur.
// Anahtarı olmayan sağlayıcı (Gemini hariç) havuza katılmaz, böylece istek
// yaparken gereksiz yere denenmez.
function havuzKur() {
  const istenen = list(process.env.AI_ORDER, VARSAYILAN_SIRA.join(','));
  const sira = [...istenen.filter((a) => SAGLAYICILAR[a]), ...VARSAYILAN_SIRA.filter((a) => !istenen.includes(a))];
  const liste = [];
  for (const ad of [...new Set(sira)]) {
    const t = SAGLAYICILAR[ad];
    const anahtarlar = [...new Set(t.anahtarOrtami.flatMap((o) => list(process.env[o], '')))];
    if (!anahtarlar.length && !ANAHTARSIZ.has(ad)) continue;
    liste.push({
      ad,
      adTR: t.adTR,
      tur: t.tur,
      baseUrl: t.baseUrl,
      ekBasliklar: t.ekBasliklar || null,
      anahtarlar,
      modeller: list(process.env[t.modelOrtami], t.modeller.join(','))
    });
  }
  return liste;
}

module.exports = {
  prefix: '.',
  botName: 'OrdinemBot',
  creatorName: 'VirtualGod',
  owner: process.env.OWNER || '905XXXXXXXXX',   // kendi numaran (ülke kodu ile, + olmadan)
  defaultMode: 'public',          // public | private
  cooldownMs: 2000,
  personalities: {
    normal: 'Kısa, samimi ve Türkçe cevap ver.',
    sert:   'Sert, kısa ve alaycı bir üslupla Türkçe cevap ver, ama küfür etme ve kimseyi gerçekten incitme.',
    komik:  'Çok esprili, şakacı ve komik bir üslupla Türkçe cevap ver, espri katmadan geçme.',
    ogretmen: 'Sabırlı, öğretici ve detaylı bir öğretmen gibi Türkçe açıkla.'
  },
  logChatId: process.env.LOG_CHAT_ID || '',   // hata bildirimleri için grup/numara id'si (opsiyonel)
  defaultLang: 'tr',

  // Toplu mesaj gönderiminde mesajlar arası bekleme (WhatsApp spam koruması)
  broadcastDelayMs: 1200,
  broadcastMaxPerRun: 1000,

  sessionIds: list(process.env.WABOT_SESSIONS, 'session'),

  dashboard: {
    enabled: process.env.DASHBOARD_ENABLED === 'true',
    host: process.env.DASHBOARD_HOST || '127.0.0.1',
    port: Number(process.env.DASHBOARD_PORT || 3080),
    apiKey: process.env.DASHBOARD_API_KEY || ''
  },

  ai: {
    // Sıralı sağlayıcı listesi. İstek sırayla dener; biri çalışmazsa
    // sıradakine kendiliğinden geçer. Sıra AI_ORDER ortam değişkeninden gelir.
    havuz: havuzKur(),
    apiKeys: list(process.env.AI_API_KEYS, ''),     // havuza girmeden ek yedek anahtarlar
    // Aşağıdaki tekil alanlar görsel/ses üretimi tarafından kullanılıyor
    // (sohbet havuzdan geçiyor, bunlardan değil).
    openaiKey: process.env.OPENAI_API_KEY || '',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    // Görsel üretimi: auto = OpenAI anahtarı varsa dener, hata verirse
    // anahtarsız Pollinations'a düşer (OpenAI kredisi bitse bile çalışır).
    imageProvider: process.env.IMAGE_PROVIDER || 'auto',  // auto | openai | pollinations
    openaiImageModel: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1',
    pollinationsModel: process.env.POLLINATIONS_MODEL || 'flux'
  },

  media: {
    ttsProvider: process.env.TTS_PROVIDER || 'gtts',      // gtts (anahtarsız) | openai | elevenlabs
    ttsLang: process.env.TTS_LANG || 'tr',
    openaiTtsModel: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
    openaiTtsVoice: process.env.OPENAI_TTS_VOICE || 'alloy',
    elevenlabsKey: process.env.ELEVENLABS_API_KEY || '',
    elevenlabsVoice: process.env.ELEVENLABS_VOICE || '21m00Tcm4TlvDq8ikWAM',
    removeBgKey: process.env.REMOVEBG_API_KEY || '',
    // Web araması sağlayıcı zinciri: Tavily → Bing → Google → DuckDuckGo.
    // Virgülle ayrılmış birden çok anahtar round-robin kullanılır.
    tavilyKeys: process.env.TAVILY_KEYS || '',
    // Yerel arka plan kaldırma (rembg). Anahtarsız ve limitsiz olduğu için
    // varsayılan yol bu; remove.bg anahtarı yalnızca yedek.
    rembgPython: process.env.REMBG_PYTHON || '',
    rembgModel: process.env.REMBG_MODEL || 'u2net',
    ocrSpaceKey: process.env.OCR_SPACE_API_KEY || '',
    // Yerel OCR dili. Tesseract dil kodu, '+' ile birleştirilir.
    ocrLang: process.env.OCR_LANG || 'tur+eng',
    googleApiKey: process.env.GOOGLE_SEARCH_API_KEY || '',
    googleCx: process.env.GOOGLE_SEARCH_CX || '',
    bingApiKey: process.env.BING_SEARCH_API_KEY || '',
    telegramPack: process.env.TELEGRAM_STICKER_PACK || '',
    ytdlpPath: process.env.YT_DLP_PATH || 'yt-dlp',
    mediaUploadUrl: process.env.MEDIA_UPLOAD_URL || '',
    mediaUploadToken: process.env.MEDIA_UPLOAD_TOKEN || '',
    autoDownloadHosts: list(process.env.AUTODL_HOSTS, 'youtube.com,youtu.be,tiktok.com,instagram.com,facebook.com,fb.watch,x.com,twitter.com,threads.net,spotify.com,pinterest.com'),
    newsFeeds: list(process.env.NEWS_FEEDS, 'https://feeds.bbci.co.uk/turkce/rss.xml')
  },

  // Tek kullanımlık iksirler (.al <ad> al, .kullan <ad> kullan)
  consumables: {
    kalkan: { name: 'Kalkan İksiri', price: 40000, desc: 'Bir sonraki soygun girişimini başarısız yapar.' },
    sans:   { name: 'Şans İksiri',   price: 60000, desc: 'Bir sonraki oyunda 4 katına kadar yüksek bahis koyabilirsin.' },
    cifte:  { name: 'Çifte İksir',  price: 55000, desc: 'Bir sonraki oyunda kumar buff\'ın iki katına çıkar.' }
  },

  // Quiz soru bankası: [soru, cevap]
  quiz: [
    ['Türkiye\'nin başkenti?', 'ankara'],
    ['Türkiye\'nin en uzun nehri?', 'kizilirmak'],
    ['Dünyanın en büyük okyanusu?', 'pasifik'],
    ['Mimar Sinan\'ın doğduğu şehir?', 'ağırnas'],
    ['Türk bayrağındaki ay yıldız kaç köşeli?', 'beş'],
    ['Hangi gezegen Güneş\'e en yakındır?', 'merkür'],
    ['Türkiye hangi kıtada yer alır?', 'avrupa'],
    ['"Güneşin doğduğu yer" hangi ülkedir?', 'japonya'],
    ['Türkçede kaç harf vardır?', '29'],
    ['Ünlü "Benim Milletim, Benim Dilim" sözü kime aittir?', 'atatürk'],
    ['Deniz seviyesine göre Türkiye\'nin en alçak noktası neresi?', 'akdeniz'],
    ['Hangi gezegen \"kırmızı gezegen\" olarak bilinir?', 'mars'],
    ['Türkiye\'de kaç bölge vardır?', '7'],
    ['En uzun kara sınırı hangi ülkeyle?', 'suriye'],
    ['Bir yılda kaç ay vardır?', '12'],
    ['Suyun kaynaktan sonraki haline ne denir?', 'nehir'],
    ['İlk Türk harfli alfabeyi kullanan devlet?', 'göktürk'],
    ['Hangi yıldız "Kuzey Yıldızı" olarak bilinir?', 'kuzey'],
    ['Türkiye\'nin en kalabalık ili?', 'istanbul'],
    ['Aynı saat dilimindeki şehirler arası saat farkı?', '0']
  ],

  economy: {
    startBalance: 5000,
    levelGrowth: 1.15,                    // seviye başına gelir çarpanı
    dailyCooldownMs: 24 * 60 * 60 * 1000,
    dailyReward: 7500,
    stealMinPct: 0.05, stealMaxPct: 0.15, stealChance: 0.35, stealMinVictimCash: 2000,

    level: {
      xpCurve: 500,                      // L'ye ulaşmak için gereken toplam XP = xpCurve * L * (L-1)
      tzOffsetHours: 3,                  // gün sınırı (Türkiye saati)
      ranks: [[1, 'Çaylak'], [5, 'Acemi'], [10, 'Kalfa'], [15, 'Usta'], [20, 'Efsane'], [30, 'Tanrısal']],
      message: { min: 3, max: 10, minLength: 2, cooldownMs: 60 * 1000, dailyCap: 300 }
    },

    risk: { baseRtp: 0.95, safeRatio: 0.05, allInRtp: 0.55 },

    games: { blackjackRtp0: 0.995, blackjackPushShare: 0.09, blackjackRtpFlipped: 0.42, blackjackRtp: 0.995 },

    credit: { baseLimit: 5000, perLevelLimit: 2000, dailyInterest: 0.05 },

    auction: { minMinutes: 5, maxMinutes: 1440, us: 100, minRaisePct: 0.05 },

    // İşler: id -> tanım. `aliases` içindeki her ad ayrı bir komut olur,
    // bu yüzden lib/commandmeta.js içindeki META tablosuna da karşılık girilmeli.
    jobs: {
      ciftlik: { name: 'Çiftçi', min: 1200, max: 2600, xp: 18, cooldownMs: 5 * 60 * 1000, aliases: ['ciftlik', 'çiftlik'],
        texts: ['tarlayı ektin', 'hasatı topladın', 'sürüyü suladın'],
        rare: { chance: 0.08, mult: 2.5, text: 'Nadir bir verim çıktı!' } },
      balik: { name: 'Balıkçı', min: 1500, max: 3200, xp: 20, cooldownMs: 5 * 60 * 1000, aliases: ['balik', 'balık'],
        texts: ['ağını attın', 'tekneyle döndün', 'balık tuttun'],
        rare: { chance: 0.1, mult: 2.5, text: 'Dev bir balık yakaladın!' } },
      maden: { name: 'Madenci', min: 2200, max: 4600, xp: 26, cooldownMs: 8 * 60 * 1000, aliases: ['maden'],
        texts: ['kömür kazdın', 'derinlere indin', 'cevher çıkardın'],
        rare: { chance: 0.12, mult: 2.5, text: 'Muhteşem bir cevher buldun!' } },
      calis: { name: 'Kurye', min: 900, max: 2100, xp: 14, cooldownMs: 3 * 60 * 1000, aliases: ['calis', 'çalış'],
        texts: ['paket teslim ettin', 'şehirde koşturdu', 'kurye turu yaptın'],
        rare: { chance: 0.14, mult: 2, text: 'Ard arda 10 tur yaptın!' } }
    }

  }
};
