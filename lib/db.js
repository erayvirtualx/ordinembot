const fs = require('fs');
const { economy } = require('../config');
const FILE = './data.json';
const defaults = { settings: { mode: null, autoAI: false, autoStatusSeen: false, viewOnceInbox: false, antiCall: false, autoReact: false, messageHistoryEnabled: false, keywordReplies: {}, autoDownload: false, backgroundSync: false }, sudo: [], banned: [], users: {}, groups: {}, reminders: [], subscribers: [], logs: [], messageHistory: [] };
let data = defaults;
if (fs.existsSync(FILE)) {
  const saved = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  data = { ...defaults, ...saved, settings: { ...defaults.settings, ...(saved.settings || {}) } };
}

let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => fs.writeFileSync(FILE, JSON.stringify(data, null, 2)), 500);
}
function user(id) {
  if (!data.users[id]) data.users[id] = { balance: economy.startBalance, bank: 0, xp: 0, lastDaily: 0, inventory: [], shield: 0, cd: {}, msgs: 0, msgXpDay: 0, msgXpToday: 0, lastMsgXp: 0, lastBody: '', bj: null, notes: [], afk: null, lang: null, tempEffect: null, marriedTo: null, kids: [], debt: 0, lastInterestDay: 0, achievements: [], quests: null, gameWinsTotal: 0, character: null };
  if (data.users[id].character === undefined) data.users[id].character = null;
  if (data.users[id].bank === undefined) data.users[id].bank = 0;
  if (data.users[id].ttsLang === undefined) data.users[id].ttsLang = null;
  if (!data.users[id].cd) data.users[id].cd = {};
  return data.users[id];
}

// Yedek geri yükleme gibi tam değiştirme işlemleri için.
// ÖNEMLİ: data yalnızca YERİNDE değiştirilir. `db.data = ...` yazmak module.exports
// nesnesinin yalnızca "data" alanını değiştirir; user()/group()/save() içteki `data`
// değişkenine bakmaya devam eder ve bir sonraki save() eski veriyi diske yazar.
function replace(next) {
  if (!next || typeof next !== 'object') throw new TypeError('replace(): geçersiz veri');
  for (const key of Object.keys(data)) {
    if (!(key in next)) delete data[key];
  }
  for (const [key, value] of Object.entries(next)) data[key] = value;
  // Eski kayıtlarda eksik kalan alanları tamamla.
  data.settings = { ...defaults.settings, ...(data.settings || {}) };
  for (const key of ['users', 'groups', 'sudo', 'banned', 'reminders', 'subscribers', 'logs', 'messageHistory']) {
    if (!data[key]) data[key] = [];
  }
  return data;
}
// Gruba uygulanabilen tüm ayarların varsayılanları. Yeni grupta ve eski kayıtlarda tamamlanır.
const GROUP_DEFAULTS = {
  // koruma
  antilink: false, anticaps: false, antispam: false, antiflood: false, antibot: false,
  antiBadword: false, badWords: [], botPrefixes: [], warnLimit: 3, warns: {},
  antitag: false, pmblocker: false, autoread: false, autotyping: false,
  // sohbet
  welcomeEnabled: true, welcome: 'Hoş geldin @user 👋',
  goodbyeEnabled: false, goodbye: 'Görüşürüz @user 👋',
  chatbotEnabled: false, keywords: {}, mutes: {}, rules: [], scheduled: [],
  antidelete: false, antiedit: false,
  // medya
  autoDownload: false, backgroundSync: false,
  // üyelik başvuruları
  autoApprove: false, announceRequests: true,
  // ekonomi
  auction: null
};

// Uyarı tablosunu tek bir biçime getirir. İki modül aynı tabloyu paylaşıyor:
//   plugins/warn.js  -> anahtar: çıplak numara  ("111")
//   lib/protection.js-> eskiden: tam JID        ("111@s.whatsapp.net")
// Farklı anahtarlar kullanılırsa bir yolun sayacı diğerinde görünmez ve limit
// işlemez. Bu yüzden anahtar daima çıplak numaraya indirgenir, eski tam-JID
// kayıtları da içindeki uyarı sayısıyla birlikte taşınır. Ayrıca eski
// sürümlerden kalan düz sayılar { count, history } nesnesine çevrilir.
function normalizeWarns(g) {
  if (!g.warns || typeof g.warns !== 'object') g.warns = {};
  const hedef = {};
  for (const [key, value] of Object.entries(g.warns)) {
    const n = String(key).split('@')[0];
    const eski = (typeof value === 'object' && value !== null) ? value : { count: Number(value) || 0, history: [] };
    if (!eski.history) eski.history = [];
    if (typeof eski.count !== 'number' || !Number.isFinite(eski.count)) eski.count = 0;
    if (hedef[n]) {
      // Aynı kişi için hem "111" hem "111@s.whatsapp.net" kaydı varsa birleştir.
      hedef[n].count += eski.count;
      hedef[n].history = [...hedef[n].history, ...eski.history].slice(-20);
    } else {
      hedef[n] = eski;
    }
  }
  g.warns = hedef;
  return g.warns;
}

function group(id) {
  if (!data.groups[id]) data.groups[id] = { ...GROUP_DEFAULTS };
  else for (const [key, value] of Object.entries(GROUP_DEFAULTS)) if (data.groups[id][key] === undefined) data.groups[id][key] = value;
  return data.groups[id];
}
module.exports = { data, save, replace, user, group, normalizeWarns, GROUP_DEFAULTS };
