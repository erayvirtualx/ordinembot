// Bot denetimi: sözdizimi, komut çakışmaları, meta eksikleri, config anahtarları ve
// HER komutun tüm gövdesinin çalıştırılması (ağ çağrıları hızlıca reddettirilir ki
// hata yolları da test edilsin).
// Çalıştırma: node test/audit.js
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const problems = [];
const note = (lvl, msg) => problems.push(`[${lvl}] ${msg}`);

// ---------------------------------------------------------------- 1. sözdizimi
const jsFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.js')) jsFiles.push(p);
  }
})(ROOT);

for (const f of jsFiles) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); }
  catch (e) { note('SÖZDİZİMİ', `${path.relative(ROOT, f)}: ${String(e.stderr).split('\n')[2] || e.message}`); }
}
console.log(`1) Sözdizimi: ${jsFiles.length} dosya denetlendi.`);

// ---------------------------------------------------------------- 2. ağ kapalı
// Gerçek ağa çıkmadan, hızlı reddeden fetch. Böylece async komutlar zaman aşımına
// uğramaz ve fonksiyonun devamı (hata yolu) da test edilmiş olur.
const blocked = [];
global.fetch = (url) => {
  blocked.push(String(url).slice(0, 60));
  return Promise.reject(new Error('çevrimdışı (test)'));
};

// Harici komutlar (yt-dlp, ffmpeg) gerçekten çalışıp ağa çıkmasın diye
// spawn edilen tüm süreçler anında başarısız olsun. (yt-dlp kuruluysa .ytsearch
// gibi komutlar aksi halde gerçek YouTube'a gidiyor ve denetimi kilitliyor.)
const cp = require('child_process');
const HATA = Object.assign(new Error('çevrimdışı (test)'), { code: 'ENETDOWN', killed: true });
const oldExec = cp.exec, oldExecFile = cp.execFile, oldSpawn = cp.spawn;
cp.exec = (cmd, ...a) => (typeof a[0] === 'function' ? a[0](HATA) : a[0]?.(HATA) ?? Promise.reject(HATA));
cp.execFile = (...args) => {
  const cb = args.find((a) => typeof a === 'function');
  if (cb) { process.nextTick(() => cb(HATA, '', '')); const p = { on() {}, kill() {} }; return p; }
  return { ...oldExecFile.apply(cp, args) };
};
cp.spawn = () => { const fake = { on() { return fake; }, once() { return fake; }, kill() {}, stdout: null, stderr: null, stdin: null }; return fake; };
for (const k of ['exec', 'execFile', 'spawn']) {
  for (const variant of ['Sync', 'FileSync', 'Sync']) {
    const n = k + variant;
    if (typeof cp[n] === 'function') cp[n] = () => { throw HATA; };
  }
}

const config = require('../config');
const db = require('../lib/db');
db.save = () => {};

// Gerçek bir PNG (görsel işleyen komutlar sahte 1x1 görselde hata veriyor).
// Not: sharp().toBuffer() bir Promise döndürür; ilk kullanımda üretilir.
const sharp = require('sharp');
let realPngB64 = null;
const realPng = async () => {
  if (!realPngB64) {
    const buf = await sharp({
      create: { width: 640, height: 480, channels: 3, background: { r: 30, g: 120, b: 200 } }
    }).png().toBuffer();
    realPngB64 = buf.toString('base64');
  }
  return realPngB64;
};

// ---------------------------------------------------------------- 3. plugin yükleme
const commands = new Map();
const owners = new Map();
const pluginDir = path.join(ROOT, 'plugins');
const pluginFiles = fs.readdirSync(pluginDir).filter((f) => f.endsWith('.js'));

for (const f of pluginFiles) {
  let plugin;
  try { plugin = require(path.join(pluginDir, f)); }
  catch (e) { note('YÜKLEME', `${f}: ${e.message}`); continue; }
  if (!Array.isArray([].concat(plugin.name)) || !plugin.name) note('YAPI', `${f}: name eksik`);
  if (typeof plugin.run !== 'function') note('YAPI', `${f}: run() yok`);
  for (const n of [].concat(plugin.name)) {
    if (owners.has(n)) note('ÇAKIŞMA', `".${n}" → ${owners.get(n)} ve ${f} (${f} eziyor)`);
    owners.set(n, f);
    commands.set(n, Object.assign({}, plugin, { _f: f }));
  }
}
console.log(`2) Plugin: ${pluginFiles.length} dosya, ${commands.size} komut.`);

// ---------------------------------------------------------------- 4. meta eksikleri
const { resolve } = require('../lib/commandmeta');
const noMeta = [...commands.keys()].filter((n) => !resolve(n.toLowerCase()));
if (noMeta.length) note('META', `meta verisi olmayanlar: ${noMeta.join(', ')}`);
console.log(`3) Meta: ${commands.size - noMeta.length}/${commands.size} komut tanımlı.`);

// ---------------------------------------------------------------- 5. komut gövdelerini çalıştır
const { client, groupChat, privateChat, makeMessage } = require('./whatsapp');

const SAMPLE = {
  günaydin: 'selam', gunaydin: 'selam', iyiaksam: 'a', iyigeceler: 'a',
  haber: 'spor', ara: 'test', etikettencikar: '1 123@g.us', etiketekle: '1 123@g.us',
  '8ball': 'soru', sekiztop: 'soru', tts: 'merhaba', sesli: 'merhaba', konus: 'merhaba',
  ttsdil: 'en', botbio: 'yeni durum', botisim: 'Test', cagrilink: 'ses',
  grupolustur: 'Test Grubu', numarainfo: '905000000000', warn: 'kural ihlali',
  sustur: '10m', konum: 'Istanbul', konum2: '41.0 29.0', sarkisoz: 'şarkı',
  stickertext: 'üst|alt', meme: 'üst|alt', tas: 'a', zincir: 'kitap', kelime: 'kitap',
  evlat: 'evlat', flort: 'flort', yumrukla: 'yumruk', ship: 'a b', kelimeler: 'x',
  gorsel: 'kedi', sarki: 'şarkı adı', duvar: 'manzara', hava: 'Istanbul', emoji: '😀',
  kanalara: '123@newsletter', kanaldan: '123@newsletter', kanaldin: '123@newsletter',
  kanalar: 'spor', ciftlik: '', çiftlik: '', ciz: 'kedi', çiz: 'kedi', resimuret: 'kedi',
  herkes: 'selam', stam: 'selam', basvurular: '', oy: 'x'
};

(async () => {
  const failures = [];
  let ran = 0;
  const REAL_PNG_B64 = await realPng();

  for (const [name, plugin] of commands) {
    for (const chat of [groupChat, privateChat]) {
      if (!chat.isGroup && (plugin.group || plugin.admin)) continue;

      // Kurulum varyantları: sadece .komut, args'lı, alıntılı ve medyalı.
      const variants = [
        { body: '.' + name, quoted: null, media: false },
        { body: '.' + name + ' ' + (SAMPLE[name] || 'ornek'), quoted: null, media: false },
        { body: '.' + name, quoted: { body: 'alıntı metni', hasMedia: false }, media: false },
        { body: '.' + name, quoted: null, media: true }
      ];

      for (const v of variants) {
        const msg = makeMessage(`a_${name}_${v.media}`, chat);
        msg.body = v.body;
        msg.hasQuotedMsg = !!v.quoted;
        msg.hasMedia = !!v.media;
        msg.quoted = v.quoted;
        msg.downloadMedia = async () => ({ mimetype: 'image/png', data: REAL_PNG_B64, filename: 'x.png' });
        if (v.quoted) msg.getQuotedMessage = async () => Object.assign(makeMessage('q', chat), v.quoted, { hasMedia: false });

        const args = v.body.split(/\s+/).slice(1);
        const ctx = {
          client, msg, chat, cmd: name, args,
          sender: '111@s.whatsapp.net', senderNum: '111',
          isOwner: true, isSudo: true, isAdmin: true, isGroup: chat.isGroup,
          db, config
        };

        try {
          const p = plugin.run(ctx);
          if (p && typeof p.then === 'function') {
            let timer;
            const guard = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('zaman aşımı')), 4000); });
            await Promise.race([p, guard]).finally(() => clearTimeout(timer));
          }
          ran++;
        } catch (e) {
          const where = (e && e.stack ? String(e.stack).split('\n').slice(1, 4).map((l) => l.trim().replace(process.cwd(), '.')) : []);
          failures.push(`."${name}" [${chat.isGroup ? 'grup' : 'özel'}] [${v.media ? 'medya' : v.quoted ? 'alıntı' : 'sade'}] → ${e && e.message !== undefined ? e.message : 'DEĞER=' + String(e)}${where.length ? '\n        ' + where.join('\n        ') : ''}`);
        }
      }
    }
  }

  const uniq = [...new Set(failures)];
  console.log(`4) Gövde testi: ${ran} çalıştırma, ${uniq.length} benzersiz hata.`);
  for (const f of uniq.slice(0, 40)) note('ÇALIŞTIRMA', f);

  // ---------------------------------------------------------------- 6. lib modülleri
  const libOk = [];
  for (const f of fs.readdirSync(path.join(ROOT, 'lib')).filter((x) => x.endsWith('.js'))) {
    try { require(path.join(ROOT, 'lib', f)); libOk.push(f); }
    catch (e) { note('LIB', `${f}: ${e.message}`); }
  }
  console.log(`5) Kütüphane: ${libOk.length} modül yüklendi.`);

  // ---------------------------------------------------------------- 7. rapor
  console.log('\n' + '='.repeat(60));
  if (!problems.length) {
    console.log('DENETİM TEMİZ — hiçbir sorun bulunamadı.');
  } else {
    console.log(`${problems.length} sorun:\n`);
    for (const p of problems) console.log('  ' + p);
  }
  console.log('='.repeat(60));
  console.log(`Engellenen ağ isteği: ${blocked.length}`);
  process.exit(problems.length ? 1 : 0);
})();
