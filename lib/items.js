// Market eşyaları. Buff yüzdesi FİYATTAN otomatik hesaplanır (logaritmik):
// en ucuz eşya ~%1, en pahalı (10 Milyar) tam %40.
const K = 1e3, M = 1e6, B = 1e9;
const RAW = [
  // --- Senin listen ---
  ['ego',      "Ego'nun Yonkou'su",        10 * B],
  ['lumia',    "Kafes'in Lumia'sı",         2 * B],
  ['ethan',    "Ethan'ın Manipülasyonu",    4 * B],
  ['pavyon',   "Herolin'in Pavyon'u",       1 * B],
  ['taktik',   "Virtual'in Taktiği",        2 * B],
  ['bug',      "Paix'in Bugu",              2 * B],
  ['karilar',  "Enyalius'un Karıları",    500 * M],
  ['web',      "Kenan'ın Web'i",            1 * B],
  ['flex',     "Daemon'un Flex'i",        200 * M],
  ['paket',    "Cr4ck'in Paketleri",      100 * M],
  ['yarrak',   "Strafend'in Yarrağı",     400 * M],
  ['buyu',     "Mizaert'in Büyücülüğü",   300 * M],
  ['lilika',   "Pikaçu'nun Lilikası",     150 * M],
  // --- Benim eklediklerim (erken oyun için ucuz) ---
  ['bozuk',    'Şanslı Bozuk Para',        50 * K],
  ['yonca',    'Dört Yapraklı Yonca',     250 * K],
  ['eldiven',  'Kumarbaz Eldiveni',         1 * M],
  ['altinzar', 'Altın Zar',                 5 * M],
  ['kedi',     'Kara Kedi Tılsımı',        25 * M],
  ['kasa',     "Ordinem'in Kasası",        75 * M]
];

const MIN_BUFF = 1, MAX_BUFF = 40;
const pMin = Math.min(...RAW.map((r) => r[2]));
const pMax = Math.max(...RAW.map((r) => r[2]));

const ITEMS = RAW.map(([id, name, price]) => ({
  id, name, price,
  buff: Math.round((MIN_BUFF + (MAX_BUFF - MIN_BUFF) * Math.log(price / pMin) / Math.log(pMax / pMin)) * 10) / 10
})).sort((a, b) => a.price - b.price);

// Sahip olunan eşyaların toplam buff'ı: azalan getirili birleşim, en fazla %40.
// 1 - Π(1 - b_i)  →  40'ı geçemez, ucuz eşyalar biriktikçe artar ama sınırı aşmaz.
function getBuff(u) {
  const owned = ITEMS.filter((i) => (u.inventory || []).includes(i.id));
  const total = 1 - owned.reduce((acc, i) => acc * (1 - i.buff / 100), 1);
  return Math.min(MAX_BUFF, Math.round(total * 1000) / 10);
}

function fmtPrice(n) {
  if (n >= B) return `${n / B} Milyar TL`;
  if (n >= M) return `${n / M} Milyon TL`;
  if (n >= K) return `${n / K} Bin TL`;
  return `${n} TL`;
}

function find(q) {
  const s = q.toLocaleLowerCase('tr');
  if (/^\d+$/.test(s)) return ITEMS[parseInt(s) - 1];
  return ITEMS.find((i) => i.id === s) || ITEMS.find((i) => i.name.toLocaleLowerCase('tr').includes(s));
}

module.exports = { ITEMS, getBuff, fmtPrice, find, MAX_BUFF };
