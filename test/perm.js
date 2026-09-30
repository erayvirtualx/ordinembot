// Yetki sistemi testi: her komut her seviyede doğru sonucu veriyor mu?
// Çalıştırma: node test/perm.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const perm = require('../lib/perm');
global.fetch = () => Promise.reject(new Error('çevrimdışı (test)'));

let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) { pass++; } else { fail++; console.log('  ✗ ' + label); } };

// ---------------------------------------------------------------- 1. spec çözümleme
ok(perm.spec({ owner: true }, 'x').level === 'owner', 'owner:true → owner');
ok(perm.spec({ admin: true }, 'x').level === 'admin', 'admin:true → admin');
ok(perm.spec({}, 'x').level === 'all', 'bayraksız → all');
ok(perm.spec({ owner: true, perm: { x: 'admin' } }, 'x').level === 'admin', 'perm komutu ezer');
ok(perm.spec({ group: true, perm: { x: { level: 'admin', group: false } } }, 'x').group === false, 'perm group:false ezebiliyor');
ok(perm.spec({ group: true, perm: { x: 'admin' } }, 'x').group === true, 'perm seviyesi group bayrağını korur');
ok(perm.spec({ perm: { 'TÜRK ÇAĞRI': 'owner' } }, 'türk çağrı').level === 'owner', 'komut adı küçük harfe çevrilir');
ok(perm.spec({ perm: { x: 'BOGUS' } }, 'x').level === 'all', 'geçersiz seviye → all');

// ---------------------------------------------------------------- 2. check mantığı
const ctx = (o = {}) => ({ isGroup: true, isAdmin: false, isOwner: false, isSudo: false, ...o });
ok(perm.check(perm.spec({}, 'x'), ctx()) === null, 'all: herkes geçer');
ok(!!perm.check(perm.spec({ admin: true }, 'x'), ctx()), 'admin: normal üye reddedilir');
ok(perm.check(perm.spec({ admin: true }, 'x'), ctx({ isAdmin: true })) === null, 'admin: yönetici geçer');
ok(perm.check(perm.spec({ admin: true }, 'x'), ctx({ isOwner: true })) === null, 'admin: sahip geçer');
ok(perm.check(perm.spec({ admin: true }, 'x'), ctx({ isSudo: true })) === null, 'admin: sudo geçer');
ok(!!perm.check(perm.spec({ owner: true }, 'x'), ctx({ isAdmin: true })), 'owner: yönetici reddedilir');
ok(!!perm.check(perm.spec({ owner: true }, 'x'), ctx({ isSudo: true })), 'owner: sudo reddedilir');
ok(perm.check(perm.spec({ owner: true }, 'x'), ctx({ isOwner: true })) === null, 'owner: sahip geçer');
ok(!!perm.check(perm.spec({ group: true }, 'x'), ctx({ isGroup: false })), 'group: özelde reddedilir');
ok(perm.check(perm.spec({ group: true }, 'x'), ctx()) === null, 'group: grupta geçer');
ok(!!perm.check(perm.spec({ admin: true }, 'x'), ctx({ isGroup: false })), 'admin: özel sohbette admin olamaz');
ok(perm.check(perm.spec({ admin: true }, 'x'), ctx({ isGroup: false, isOwner: true })) === null, 'admin: özelde sahip geçer');

// ---------------------------------------------------------------- 3. gerçek komutlar
const commands = new Map();
for (const f of fs.readdirSync(path.join(ROOT, 'plugins')).filter((x) => x.endsWith('.js'))) {
  const p = require(path.join(ROOT, 'plugins', f));
  for (const n of [].concat(p.name)) commands.set(n, Object.assign({}, p, { _f: f }));
}

// Her admin/owner komutu normal üyeye kapalı olmalı, "all" komutlar açık olmalı.
let byLevel = { all: 0, admin: 0, owner: 0 };
for (const [name, plugin] of commands) {
  const s = perm.spec(plugin, name);
  byLevel[s.level]++;
  const normal = ctx();
  const denied = !!perm.check(s, normal);
  if (s.level === 'all') ok(!denied, `.${name} all olmalı ama reddediliyor`);
  else ok(denied, `.${name} ${s.level} olmalı ama normal üyeye açık`);
}
ok(byLevel.all + byLevel.admin + byLevel.owner === commands.size, 'seviye dağılımı komut sayısına eşit');

// Sahip her şeyi kullanabilmeli.
for (const [name, plugin] of commands) {
  ok(perm.check(perm.spec(plugin, name), ctx({ isOwner: true })) === null, `.${name} sahibe kapalı`);
}

// ---------------------------------------------------------------- 4. kritik komutlar
const level = (n) => perm.spec(commands.get(n), n).level;
const CRITICAL = {
  stam: 'admin', herkes: 'owner', toplumsil: 'admin', iptalstam: 'admin',
  kanalolustur: 'owner', kanaldin: 'owner', kanallar: 'owner', kanalmute: 'owner', kanalar: 'admin',
  engelle: 'owner', engellenenler: 'owner', grupolustur: 'owner',
  kart: 'admin', grupkart: 'admin', grupvcf: 'admin', numarainfo: 'admin', hakkinda: 'admin',
  etiketler: 'owner', etiketekle: 'owner', temizle: 'owner',
  privacy: 'owner', history: 'owner', aiprovider: 'owner', autai: 'owner', autoreact: 'owner',
  broadcast: 'owner', yedekgeri: 'owner', botprefix: 'owner', leavegroup: 'owner',
  groupname: 'admin', groupdesc: 'admin', kick: 'admin', ban: 'admin',
  warn: 'admin', antitag: 'admin', basvurular: 'admin', onayla: 'admin',
  groupinfo: 'all', ara: 'all', yardim: 'all', ping: 'all'
};
for (const [n, want] of Object.entries(CRITICAL)) {
  ok(commands.has(n), `.${n} komutu bulunamadı`);
  ok(level(n) === want, `.${n} → ${want} olmalı, ${level(n)} bulundu`);
}

// ---------------------------------------------------------------- 5. uçtan uca (handler)
// Gerçek komut yönlendiricisi: normal üye reddediliyor mu, yönetici geçiyor mu?
const db = require('../lib/db');
const handler = require('../lib/handler');
const { client, groupChat, makeMessage, config } = require('./whatsapp');

db.save = () => {};
db.data.settings.mode = 'public';
db.data.banned = [];
db.data.sudo = ['999999999'];
const realCooldown = config.cooldownMs;
config.cooldownMs = 0;

// Tam reddetme mesajları — yardım metni gibi "sahip" geçen yanıtları yanlış saymamak için.
const DENY = ['Bu komut için grup yöneticisi olmalısın', 'Bu komut sadece bot sahibine özel',
  'Bu komut sadece gruplarda çalışır', 'Bu komut gruplarda kullanılabilir'];
const blocked = (r) => DENY.some((d) => r.trim().startsWith(d));

// Sahte istemci config.owner'ı '111' yapıyor; o yüzden roller ayrı numaralarla:
const MEMBER = '333@s.whatsapp.net';   // ne sahip ne yönetici
const ADMIN = '999@s.whatsapp.net';    // grup yöneticisi
const OWNER = '111@s.whatsapp.net';    // config.owner

async function tryCmd(body, opts = {}) {
  const { who = MEMBER, inGroup = true } = opts;
  const mock = require('./whatsapp');
  const chat = inGroup ? mock.groupChat : mock.privateChat;
  const msg = mock.makeMessage('e2e' + Math.random().toString(36).slice(2), chat);
  msg.body = body;
  msg.from = who;
  msg.author = inGroup ? who : undefined;
  msg.fromMe = false;
  msg.hasQuotedMsg = false;
  msg.hasMedia = false;
  await handler(client, msg);
  return msg.replied.join(' | ');
}

(async () => {
  const SPOT = ['stam', 'grupkart', 'kart', 'numarainfo', 'kanalar', 'groupname', 'sabitle',
    'etiketler', 'kanalolustur', 'herkes', 'broadcast', 'privacy', 'temizle', 'otodl'];
  // 1) Normal grup üyesi reddedilmeli.
  for (const n of SPOT) {
    const r = await tryCmd('.' + n);
    ok(blocked(r), `[üye] .${n} reddedilmeliydi → "${r.slice(0, 60)}"`);
  }
  // 2) Grup yöneticisi admin seviyesindekileri kullanabilmeli.
  for (const n of SPOT) {
    if (perm.spec(commands.get(n), n).level === 'owner') continue;
    const r = await tryCmd('.' + n, { who: ADMIN });
    ok(!blocked(r), `[yönetici] .${n} geçmeliydi → "${r.slice(0, 60)}"`);
  }
  // 3) Grup yöneticisi owner seviyesindekileri kullanamamalı.
  for (const n of SPOT) {
    if (perm.spec(commands.get(n), n).level !== 'owner') continue;
    const r = await tryCmd('.' + n, { who: ADMIN });
    ok(blocked(r), `[yönetici] .${n} reddedilmeliydi → "${r.slice(0, 60)}"`);
  }
  // 4) Sahip her şeyi kullanabilmeli.
  for (const n of SPOT) {
    const r = await tryCmd('.' + n, { who: OWNER });
    ok(!blocked(r), `[sahip] .${n} geçmeliydi → "${r.slice(0, 60)}"`);
  }
  // 5) Grup dışına özel komutlar özel sohbette de kapatılmalı.
  for (const n of ['groupname', 'grouplink', 'basvurular', 'grupkart', 'warn', 'hidetag']) {
    const r = await tryCmd('.' + n, { who: OWNER, inGroup: false });
    ok(r.includes('gruplarda'), `[özel sohbet] .${n} → "${r.slice(0, 60)}"`);
  }
  // 6) Herkese açık komutlar normal üyeye açık kalmalı.
  for (const n of ['ping', 'yardim', 'bilgi', 'ara', 'seviye']) {
    const r = await tryCmd('.' + n, { inGroup: false });
    ok(!blocked(r), `[herkese açık] .${n} kapalı olmamalı → "${r.slice(0, 60)}"`);
  }
// ---------------------------------------------------------------- 6. yedek geri yükleme
// db.data = ... ataması module.exports'un kopyasını değiştirir; içteki `data`
// değişkeni eski kalır ve save() eski veriyi diske yazar (yedek sessizce kaybolur).
const fresh = require('child_process').execFileSync;
ok(typeof db.replace === 'function', 'db.replace() mevcut olmalı');
{
  const script = `
    const fs = require('fs');
    fs.writeFileSync('./data.json', JSON.stringify({settings:{},users:{ESKI:{balance:1}},groups:{},sudo:[],banned:[],reminders:[],subscribers:[],logs:[],messageHistory:[]}));
    const db = require('./lib/db');
    db.replace({users:{YENI:{balance:9}},groups:{},sudo:[],banned:[],reminders:[],subscribers:[],logs:[],messageHistory:[]});
    db.user('PROVA');
    db.save();
    setTimeout(() => {
      const disk = JSON.parse(fs.readFileSync('./data.json','utf8'));
      const ok = !!disk.users.YENI && !disk.users.ESKI;
      fs.unlinkSync('./data.json');
      console.log(ok ? 'OK' : 'KAYIP');
      process.exit(ok ? 0 : 1);
    }, 900);
  `;
  const out = fresh(process.execPath, ['-e', script], { cwd: ROOT, encoding: 'utf8' });
  ok(out.includes('OK'), `yedek geri yükleme diske yazmalı → "${out.trim()}"`);
}

config.cooldownMs = realCooldown;

console.log(`\nYetki testi: ${pass} geçti, ${fail} başarısız`);
  console.log(`Dağılım → all: ${byLevel.all} · admin: ${byLevel.admin} · owner: ${byLevel.owner}`);
  process.exit(fail ? 1 : 0);
})();
