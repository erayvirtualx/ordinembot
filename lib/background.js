// Yerel arka plan kaldırma (rembg) istemcisi.
//
// Neden ayrı bir Python işçisi? rembg modelini yüklemek 1.5-19 saniye sürüyor.
// Her komutta yeni Python süreci başlatılsak her görselde o süre tekrar
// yaşanırdı. Bunun yerine tek bir süreç açılır, model bir kez yüklenir ve
// işler kuyruğa girer. Ölçülen: ilk iş ~0.4 sn, sonrakiler ~0.35 sn.
//
// Bu sayede .arka komutu anahtar, kota ve internet gerektirmez. remove.bg
// 1 Aralık 2026'da kapanıyor; bu yol ondan sonra da çalışır.

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const IS = path.join(__dirname, '..', 'tools', 'rembg_worker.py');
const IS_BEKLEME = 90 * 1000;   // model yüklemesi için üst sınır
const IS_SURESI = 60 * 1000;    // tek görsel için üst sınır

// Python yorumlayıcısı bulma sırası. Windows'ta iki yerleşik konum oluyor;
// hangisinde rembg kurulu olduğunu varsaymak yerine sırayla deniyoruz.
function adayYorumlayicilar(config) {
  const ayar = config && config.media && config.media.rembgPython;
  const liste = ayar ? [ayar] : [];
  const kok = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  liste.push(
    path.join(kok, 'Python', 'bin', 'python.exe'),
    path.join(kok, 'Python', 'pythoncore-3.14-64', 'python.exe'),
    'python3',
    'python'
  );
  return liste;
}

// Bu iki yoklama spawnSync kullanır: hem yavaştır (saniyeler) hem de test
// ortamında stub'lanmış olabilir. Sonuçları bir kez saklarız ki .ayarlar gibi
// durum komutları her seferinde beklemesin, ve olası hatalar yutulsun — bir
// yorumlayıcı yoklamasının patlaması durum raporunu bozmamalı.
const yorumlayiciOnbellek = { sonuc: undefined };   // undefined = henüz bakılmadı
const kurulumOnbellek = { sonuc: undefined };

function yorumlayiciBul(config) {
  if (yorumlayiciOnbellek.sonuc !== undefined) return yorumlayiciOnbellek.sonuc;
  let bulunan = null;
  for (const aday of adayYorumlayicilar(config)) {
    try {
      if (path.isAbsolute(aday) && !fs.existsSync(aday)) continue;
      // Yalnızca yorumlayıcının çalıştığını doğrula, rembg'ye bakma (yavaş).
      const dene = spawnSync(aday, ['-c', 'print(1)'], { timeout: 15000, windowsHide: true });
      if (!dene.error && dene.status === 0) { bulunan = aday; break; }
    } catch { /* bu aday çalışmıyor, sıradakine geç */ }
  }
  yorumlayiciOnbellek.sonuc = bulunan;
  return bulunan;
}

// rembg gerçekten kurulu mu? (Yoksa .arka komutu sessizce çalışmaz.)
function rembgKuruluMu(yorumlayici) {
  if (!yorumlayici) return false;
  if (kurulumOnbellek[yorumlayici] !== undefined) return kurulumOnbellek[yorumlayici];
  let kurulu = false;
  try {
    const dene = spawnSync(yorumlayici, ['-c', 'import rembg'], { timeout: 30000, windowsHide: true });
    kurulu = !dene.error && dene.status === 0;
  } catch { kurulu = false; }
  kurulumOnbellek[yorumlayici] = kurulu;
  return kurulu;
}

let cocuk = null;      // çalışan süreç
let hazir = false;    // model yüklendi mi
let kuyruk = [];      // bekleyen işler: { coz, red, zamanAsimi }
let tampon = '';
let sonHata = '';
let modelAdi = 'u2net';

function isCoerce(c) { clearTimeout(c); }

function isleyiciKapat() {
  hazir = false;
  const bekleyenler = kuyruk;
  kuyruk = [];
  for (const is of bekleyenler) is.red(new Error('Arka plan kaldırma servisi yeniden başlatıldı.'));
  if (cocuk) { try { cocuk.kill(); } catch { /* zaten ölmüş */ } }
  cocuk = null;
  tampon = '';
}

function isBaslat(yorumlayici) {
  cocuk = spawn(yorumlayici, [IS], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  hazir = false;
  tampon = '';
  modelAdi = '';

  cocuk.stdout.setEncoding('utf8');
  cocuk.stdout.on('data', (parca) => {
    tampon += parca;
    let i;
    while ((i = tampon.indexOf('\n')) >= 0) {
      const satir = tampon.slice(0, i).trim();
      tampon = tampon.slice(i + 1);
      if (!satir) continue;
      let mesaj;
      try { mesaj = JSON.parse(satir); } catch { continue; }

      if (mesaj.hazir === true) { hazir = true; sonHata = ''; continue; }
      if (mesaj.hazir === false) { sonHata = mesaj.hata || 'rembg baslatilamadi'; hazir = false; isleyiciKapat(); continue; }

      const is = kuyruk.shift();
      if (!is) continue;
      isCoerce(is.zamanAsimi);
      if (mesaj.tamam) is.coz(Buffer.from(mesaj.goruntu, 'base64'));
      else is.red(new Error(mesaj.hata || 'Arka plan silinemedi.'));
    }
  });

  // Python uyarıları stdout'a karışmasın; sadece hatada not al.
  cocuk.stderr.setEncoding('utf8');
  cocuk.stderr.on('data', (d) => { if (!hazir) sonHata = String(d).trim().slice(0, 300) || sonHata; });

  cocuk.on('error', (h) => { sonHata = `Python baslatilamadi: ${h.message}`; isleyiciKapat(); });
  cocuk.on('exit', (kod) => {
    if (kod && !sonHata) sonHata = `Arka plan servisi kapandi (kod ${kod}).`;
    isleyiciKapat();
  });

  // Model yüklenmezse sonsuza kadar beklemek yerine hata ver.
  const bekleme = setTimeout(() => {
    if (hazir) return;
    sonHata = sonHata || 'rembg modeli zamaninda yuklenemedi.';
    isleyiciKapat();
  }, IS_BEKLEME);
  cocuk.on('exit', () => clearTimeout(bekleme));
  cocuk.on('error', () => clearTimeout(bekleme));
}

function hazirOlanaKadar(config) {
  if (hazir) return Promise.resolve();
  if (cocuk) return new Promise((coz, red) => { const dene = setInterval(() => { if (hazir) { clearInterval(dene); coz(); } else if (!cocuk) { clearInterval(dene); red(new Error(sonHata || 'rembg baslatilamadi.')); } }, 150); });
  const yorumlayici = yorumlayiciBul(config);
  if (!yorumlayici) return Promise.reject(new Error('Python bulunamadi. REMBG_PYTHON ayarla veya rembg kurulumunu yap.'));
  isBaslat(yorumlayici);
  return hazirOlanaKadar(config);
}

/**
 * Görselin arka planını kaldırır.
 * @param {{data:string, mimetype:string}} media base64 medya
 * @param {{config:object, model?:string}} secenek
 * @returns {Promise<{data:Buffer, mimetype:string, filename:string}>}
 */
async function kaldir(media, { config, model } = {}) {
  const veri = Buffer.from(media.data, 'base64');
  if (!veri.length) throw new Error('Görsel boş.');
  if (veri.length > 12 * 1024 * 1024) throw new Error('Görsel çok büyük (en fazla 12 MB).');

  await hazirOlanaKadar(config);
  const secilen = model || modelAdi || (config && config.media && config.media.rembgModel) || 'u2net';

  return new Promise((coz, red) => {
    const is = { coz, red, zamanAsimi: null };
    is.zamanAsimi = setTimeout(() => {
      // Takılan işi çıkar; süreç güvenilmezse olduğu için yeniden başlat.
      kuyruk = kuyruk.filter((x) => x !== is);
      isleyiciKapat();
      red(new Error('Arka plan kaldırma zaman aşımına uğradı.'));
    }, IS_SURESI);
    kuyruk.push(is);
    try { cocuk.stdin.write(JSON.stringify({ goruntu: veri.toString('base64'), model: secilen }) + '\n'); }
    catch (h) { isCoerce(is.zamanAsimi); kuyruk = kuyruk.filter((x) => x !== is); red(h); }
  }).then((bayt) => ({ data: bayt, mimetype: 'image/png', filename: 'arka-plansiz.png' }));
}

/**
 * .ayarlar ve açılış mesajı için: servis kullanılabilir mi?
 *
 * Bu fonksiyon bilerek hızlıdır. "rembg kurulu mu" yoklaması saniyeler
 * sürdüğü için burada yapılmaz; ilk çağrıda arka planda tetiklenir, sonraki
 * çağrılarda önbellekten okunur. Böylece .ayarlar asla yavaşlamaz.
 */
function durum(config) {
  if (hazir) return { hazir: true, bekleyen: kuyruk.length, model: modelAdi, hata: '', kuruluMu: true };
  if (cocuk) return { hazir: false, bekleyen: kuyruk.length, model: modelAdi, hata: sonHata || 'ilk model yükleniyor', kuruluMu: true };

  let yorumlayici = null;
  try { yorumlayici = yorumlayiciBul(config); } catch { /* yoklama patladı, yok say */ }
  if (!yorumlayici) return { hazir: false, bekleyen: 0, model: '', hata: 'Python bulunamadi', kuruluMu: false };

  // Kurulum durumu bilinmiyorsa sessizce öğrenmeye çalış, cevabı bekleme.
  const bilinen = kurulumOnbellek[yorumlayici];
  if (bilinen === undefined) kurnulmaYoklamasiniBaslat(yorumlayici);
  if (bilinen === false) return { hazir: false, bekleyen: 0, model: '', hata: 'rembg kurulu degil (pip install rembg)', kuruluMu: false };
  return { hazir: false, bekleyen: 0, model: '', hata: '', kuruluMu: bilinen === true };
}

// Arka plan yoklaması: süreç sona ermeden bitsin diye unref'li.
function kurnulmaYoklamasiniBaslat(yorumlayici) {
  const zamanlayici = setTimeout(() => { try { rembgKuruluMu(yorumlayici); } catch { /* yoksay */ } }, 0);
  if (zamanlayici.unref) zamanlayici.unref();
}

const kapat = () => isleyiciKapat();

module.exports = { kaldir, durum, kapat, yorumlayiciBul, rembgKuruluMu, IS };
