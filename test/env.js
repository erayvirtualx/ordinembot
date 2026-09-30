// .env dosyası gerçekten okunuyor mu, anahtarlar config'e düşüyor mu?
//
// DİKKAT: Bu test ASLA proje kökündeki gerçek .env dosyasına dokunmaz.
// dotenv, .env dosyasını process.cwd() üzerinden arar; bu yüzden test
// geçici bir klasöre geçip oraya .env yazar. (Eski hâli gerçek .env'i
// üzerine yazıp sonra siliyordu.)
const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// Testin başında proje kökündeki gerçek .env'in durumunu not al.
const GERCEK_ENV = path.join(ROOT, '.env');
const onceki = fs.existsSync(GERCEK_ENV) ? fs.readFileSync(GERCEK_ENV, 'utf8') : null;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'wabot-env-'));
const realCwd = process.cwd();
const CONFIG = path.join(ROOT, 'config.js');

let pass = 0, fail = 0;
const ok = (c, l) => { if (c) pass++; else { fail++; console.log('  ✗ ' + l); } };

const ENV = [
  'WABOT_SESSIONS=s1,s2',
  'OWNER=9051234567',
  'ANTHROPIC_API_KEY=TEST_ANTHROPIC',
  'AI_PROVIDER=openai',
  'OPENAI_API_KEY=TEST_OPENAI',
  'GEMINI_API_KEY=TEST_GEMINI',
  'GROQ_KEYS=GK1,GK2',
  'MISTRAL_KEYS=MK1',
  'OPENROUTER_KEYS=OK1',
  'AI_ORDER=groq,mistral',
  'GROQ_MODELS=gm1,gm2',
  'OPENAI_MODEL=gpt-4o-mini',
  'IMAGE_PROVIDER=openai',
  'TTS_PROVIDER=elevenlabs',
  'TTS_LANG=en',
  'ELEVENLABS_API_KEY=TEST_ELEVEN',
  'REMOVEBG_API_KEY=TEST_RMBG',
  'REMBG_MODEL=isnet-general-use',
  'REMBG_PYTHON=C:/Python/python.exe',
  'OCR_SPACE_API_KEY=TEST_OCR',
  'GOOGLE_SEARCH_API_KEY=TEST_GKEY',
  'GOOGLE_SEARCH_CX=TEST_GCX',
  'BING_SEARCH_API_KEY=TEST_BING',
  'TAVILY_KEYS=tvly-test1,tvly-test2',
  'TELEGRAM_STICKER_PACK=TestPaket',
  'YT_DLP_PATH=C:/yt-dlp.exe',
  'DASHBOARD_ENABLED=true',
  'DASHBOARD_PORT=3099',
  'NEWS_FEEDS=https://a.com/rss.xml,https://b.com/rss.xml',
  'AUTODL_HOSTS=a.com,b.com'
].join('\n') + '\n';

const KNOWN = ENV.split('\n').filter(Boolean).map((l) => l.split('=')[0]);

// config önbelleğini ve dotenv'in doldurduğu ortam değişkenlerini temizle.
// dotenv gerçek ortam değişkenlerini .env ile ezmez, bu yüzden elle silmeliyiz.
function reload() {
  for (const k of Object.keys(require.cache)) if (path.resolve(k) === CONFIG) delete require.cache[k];
  for (const k of KNOWN) delete process.env[k];
}

function yukle(icerik) {
  reload();
  if (icerik === null) { if (fs.existsSync(path.join(TMP, '.env'))) fs.unlinkSync(path.join(TMP, '.env')); }
  else fs.writeFileSync(path.join(TMP, '.env'), icerik);
  return require(CONFIG);
}

function temizle() {
  process.chdir(realCwd);
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* geçici klasör kalsın, zararsız */ }
}

// İçinde gerçek .env olmayan boş bir ortamda çalış.
process.chdir(TMP);

const cfg = yukle(ENV);

ok(cfg.owner === '9051234567', `OWNER → ${cfg.owner}`);
ok(cfg.ai.openaiKey === 'TEST_OPENAI', 'OPENAI_API_KEY');
ok(cfg.ai.openaiModel === 'gpt-4o-mini', 'OPENAI_MODEL');
ok(cfg.ai.imageProvider === 'openai', `IMAGE_PROVIDER → ${cfg.ai.imageProvider}`);
ok(cfg.media.ttsProvider === 'elevenlabs', `TTS_PROVIDER → ${cfg.media.ttsProvider}`);
ok(cfg.media.ttsLang === 'en', `TTS_LANG → ${cfg.media.ttsLang}`);
ok(cfg.media.elevenlabsKey === 'TEST_ELEVEN', 'ELEVENLABS_API_KEY');
ok(cfg.media.removeBgKey === 'TEST_RMBG', 'REMOVEBG_API_KEY');
ok(cfg.media.ocrSpaceKey === 'TEST_OCR', 'OCR_SPACE_API_KEY');
ok(cfg.media.googleApiKey === 'TEST_GKEY', 'GOOGLE_SEARCH_API_KEY');
ok(cfg.media.googleCx === 'TEST_GCX', 'GOOGLE_SEARCH_CX');
ok(cfg.media.bingApiKey === 'TEST_BING', 'BING_SEARCH_API_KEY');
ok(cfg.media.tavilyKeys === 'tvly-test1,tvly-test2', 'TAVILY_KEYS (virgüllü liste korunuyor)');
ok(cfg.media.telegramPack === 'TestPaket', 'TELEGRAM_STICKER_PACK');
ok(cfg.media.ytdlpPath === 'C:/yt-dlp.exe', 'YT_DLP_PATH');
ok(cfg.dashboard.enabled === true, 'DASHBOARD_ENABLED');
ok(cfg.dashboard.port === 3099, `DASHBOARD_PORT → ${cfg.dashboard.port}`);
ok(cfg.media.newsFeeds.length === 2, `NEWS_FEEDS → ${cfg.media.newsFeeds.length} kaynak`);
ok(cfg.media.autoDownloadHosts.length === 2, `AUTODL_HOSTS → ${cfg.media.autoDownloadHosts.length} alan adı`);
ok(cfg.sessionIds.length === 2, `WABOT_SESSIONS → ${cfg.sessionIds.length} oturum`);

// --- Çoklu sağlayıcı havuzu ---
const adlar = cfg.ai.havuz.map((p) => p.ad);
const bul = (a) => cfg.ai.havuz.find((p) => p.ad === a);
ok(adlar.length > 0, 'havuz kurulmali');
ok(adlar[0] === 'groq' && adlar[1] === 'mistral', `AI_ORDER ilk iki → ${adlar.slice(0, 2).join(',')}`);
ok(bul('gemini') !== undefined, 'gemini anahtarsiz da havuza girmeli');
ok(bul('anthropic') !== undefined, 'anthropic ANTHROPIC_API_KEY ile havuza girmeli');
ok(bul('groq').anahtarlar.length === 2, `GROQ_KEYS virgülle 2 anahtar → ${bul('groq').anahtarlar.length}`);
ok(bul('mistral').anahtarlar.length === 1, `MISTRAL_KEYS → ${bul('mistral').anahtarlar.length}`);
ok(bul('gemini').anahtarlar[0] === 'TEST_GEMINI', `GEMINI_API_KEY havuza girmeli → ${bul('gemini').anahtarlar[0]}`);
// Anahtarı olmayan sağlayıcı havuza girmemeli (boş yere denenmesin).
// Burada hepsi anahtar var; tek başına anahtarsız kalabilen biri aşağıda sınanıyor.
ok(bul('openai') !== undefined, 'OPENAI_API_KEY (tekil) havuza girmeli');
ok(bul('openai').anahtarlar[0] === 'TEST_OPENAI', `OPENAI_API_KEY okunmali → ${bul('openai').anahtarlar[0]}`);
ok(bul('groq').modeller.length === 2 && bul('groq').modeller[0] === 'gm1', `GROQ_MODELS → ${bul('groq').modeller.join(',')}`);
ok(bul('groq').modeller.length !== 1, 'model listesi cozulmemis olmamali');
ok(bul('groq').tur === 'openai' && bul('gemini').tur === 'gemini' && bul('anthropic').tur === 'anthropic', 'saglayici turleri dogru olmali');

// Anahtar gerektirmeyen sağlayıcı (Gemini) listede olsa bile havuza giremiyorsa
// havuz boş kalır; .env'de hiç anahtar yokken en az bir şey denemeli.
const sadeceGemini = yukle('GEMINI_API_KEY=ONLY_GEMINI\n');
ok(sadeceGemini.ai.havuz.some((p) => p.ad === 'gemini'), 'tek anahtarli ortamda gemini havuzda olmali');
ok(!sadeceGemini.ai.havuz.some((p) => p.ad === 'groq'), 'anahtari olmayan groq havuza girmemeli');

// Çoklu anahtar virgülle verilince tek tek ayrılmalı, tekrarlar elenmeli.
const coklu = yukle('GROQ_KEYS=A,B,A,C\n');
const groqAnahtar = coklu.ai.havuz.find((p) => p.ad === 'groq');
ok(groqAnahtar.anahtarlar.length === 3, `virgullu anahtarlar tekrarsiz ayrilmali → ${groqAnahtar.anahtarlar.join(',')}`);
ok(groqAnahtar.anahtarlar.join(',') === 'A,B,C', `sira korunmali → ${groqAnahtar.anahtarlar.join(',')}`);

// Anahtar yokken yine de patlamamalı: Gemini anahtarsız çalışabiliyor.
const havuzsuz = yukle('AI_ORDER=\n');
ok(Array.isArray(havuzsuz.ai.havuz), 'havuz her zaman dizi olmali');
ok(havuzsuz.ai.havuz.every((p) => Array.isArray(p.anahtarlar) && Array.isArray(p.modeller) && p.modeller.length > 0), 'her kaydin anahtar/model dizisi dolu olmali');

// Anahtar yoksa bot çökmemeli, boş dönüp graceful çalışmalı.
const bos = yukle('ANTHROPIC_API_KEY=\n');
ok(bos.ai.openaiKey === '', 'bos deger configi bozmamali');
ok(Array.isArray(bos.media.newsFeeds) && bos.media.newsFeeds.length === 1, 'varsayilan haber kaynagi korunmali');
ok(bos.media.autoDownloadHosts.length === 11, 'varsayilan alan adlari korunmali');

// .env hiç yokken de patlamamalı.
const yok = yukle(null);
ok(yok.ai.openaiKey === '', '.env yokken bos anahtar donmeli');
ok(yok.defaultMode === 'public', '.env yokken varsayilanlar korunmali');
ok(yok.media.ttsProvider === 'gtts', '.env yokken TTS varsayilani korunmali');
ok(Array.isArray(yok.ai.havuz) && yok.ai.havuz.length > 0, '.env yokken havuz en az bir saglayici icermeli (gemini)');

// Gerçek .env dosyasına dokunulmadığını doğrula.
const gercek = path.join(ROOT, '.env');
const sonra = fs.existsSync(gercek) ? fs.readFileSync(gercek, 'utf8') : null;
ok(sonra === onceki, 'proje kokundeki gercek .env DEGISDIRILMEMIS olmali');

temizle();
console.log(`\nOrtam değişkeni testi: ${pass} geçti, ${fail} başarısız`);
process.exit(fail ? 1 : 0);
