// Komut yardım/istatistik meta verisi.
// Plugin dosyası kendi `category`/`usage` alanlarını export ederse burası ezilir.
const CATEGORIES = {
  temel: 'Temel',
  grup: 'Grup yönetimi',
  koruma: 'Grup koruma',
  otomasyon: 'Grup otomasyonu',
  gizlilik: 'Gizlilik ve bot ayarları',
  medya: 'Medya',
  arac: 'Görsel ve araçlar',
  arama: 'Arama',
  ai: 'Yapay zekâ',
  ekonomi: 'Ekonomi',
  seviye: 'Seviye ve güç',
  oyun: 'Oyunlar',
  sosyal: 'Sosyal',
  eglence: 'Eğlence',
  sohbet: 'Sohbet yönetimi',
  kisi: 'Kişi ve kanal',
  diger: 'Diğer',
  sahip: 'Sahip'
};

const META = {
  ping: ['temel', '.ping'], creator: ['temel', '.creator'],
  yardim: ['temel', '.yardim [sayfa]'], menu: ['temel', '.yardim [sayfa]'],
  help: ['temel', '.yardim [sayfa]'], komutlar: ['temel', '.yardim [sayfa]'],

  // --- Sohbet yönetimi (yeni) ---
  arsiv: ['sohbet', '.arsiv'], arsivkaldir: ['sohbet', '.arsivkaldir'], okunmamis: ['sohbet', '.okunmamis'],
  temizle: ['sohbet', '.temizle'], sabitle: ['sohbet', '.sabitle'], sabitkaldir: ['sohbet', '.sabitkaldir'],
  etiketler: ['sohbet', '.etiketler'], etiketekle: ['sohbet', '.etiketekle <no> <sohbet>'],
  etikettencikar: ['sohbet', '.etikettencikar <no> <sohbet>'], ara: ['sohbet', '.ara <kelime>'],
  ortakgrup: ['sohbet', '.ortakgrup @kişi'], sohbetkapat: ['sohbet', '.sohbetkapat <süre>'],
  sohbetses: ['sohbet', '.sohbetses'], takip: ['sohbet', '.takip'], anketsonuc: ['sohbet', '.anketsonuc'],
  konum: ['sohbet', '.konum <adres|enlem boylam>'], cagrilink: ['sohbet', '.cagrilink [ses|video]'],
  buton: ['sohbet', '.buton Gövde | Buton1 | Buton2'], liste: ['sohbet', '.liste Gövde | Başlık;Seçenek1,Seçenek2 | Menü'],

  // --- Kişi / kanal (yeni) ---
  kart: ['kisi', '.kart @kişi|numara'], grupkart: ['kisi', '.grupkart'],
  engelle: ['kisi', '.engelle @kişi|numara'], engellekaldir: ['kisi', '.engellekaldir @kişi|numara'],
  engellenenler: ['kisi', '.engellenenler'], hakkinda: ['kisi', '.hakkinda @kişi'],
  numarainfo: ['kisi', '.numarainfo <numara>'], grupolustur: ['kisi', '.grupolustur <ad> @kisi1 @kisi2'],
  basvurular: ['kisi', '.basvurular'], onayla: ['kisi', '.onayla <numara>'], onayreddet: ['kisi', '.onayreddet <numara>'],
  kanallar: ['kisi', '.kanallar'], kanala: ['kisi', '.kanala <kanal>'], kanaldan: ['kisi', '.kanaldan <kanal>'],
  kanalolustur: ['kisi', '.kanalolustur <ad>'], kanalmute: ['kisi', '.kanalmute ac|kapat'], kanaldin: ['kisi', '.kanaldin <kod>'],

  // --- Kişisel mesaj toplu gönderim (yeni) ---
  stam: ['kisi', '.stam (alıntılanan mesajı herkese özelden at)'],
  herkes: ['kisi', '.herkes [sınır] <mesaj>'], toplumsil: ['kisi', '.toplumsil (alıntılanan mesajı sil)'],

  // --- Yeni medya / araçlar ---
  tts: ['arac', '.tts <metin>'], sesli: ['arac', '.sesli <metin>'],
  imagine: ['ai', '.imagine <çizim>'], bulaniklastir: ['arac', '.bulaniklastir <sayı>'],
  kes: ['arac', '.kes'], yaklastir: ['arac', '.yaklastir <sayı>'], gri: ['arac', '.gri'],
  dondur: ['arac', '.dondur <90|180|270>'], cevir: ['arac', '.cevir'],
  kisalt: ['arac', '.kisalt'], paket: ['arac', '.paket <telesticker|link>'],
  telesticker: ['arac', '.telesticker <paket> [adet]'],

  // --- Yeni moderasyon ---
  antitag: ['koruma', '.antitag on|off'], autoread: ['koruma', '.autoread on|off'],
  autotyping: ['koruma', '.autotyping on|off'], pmblocker: ['koruma', '.pmblocker on|off'],
  warn: ['koruma', '.warn @kişi [sebep]'], warnings: ['koruma', '.warnings [kişi]'], warnreset: ['koruma', '.warnreset @kişi'],

  // --- Yeni eğlence ---
  haber: ['eglence', '.haber [kaynak]'], bilgi: ['eglence', '.bilgi'], espri: ['eglence', '.espri'],
  alinti: ['eglence', '.alinti'], sarkisoz: ['eglence', '.sarkisoz'], iltifat: ['eglence', '.iltifat @kişi'],
  iltiham: ['eglence', '.iltiham @kişi'], sekiztop: ['eglence', '.sekiztop <soru>'],
  günaydin: ['eglence', '.günaydin'], gunaydin: ['eglence', '.günaydin'], iyiaksam: ['eglence', '.iyiaksam'],
  iyigeceler: ['eglence', '.iyigeceler'], cesaret: ['eglence', '.cesaret'], soru: ['eglence', '.soru <isim>'],

  // --- Yeni ayarlar ---
  otoindir: ['gizlilik', '.otoindir on|off'], arkaplan: ['gizlilik', '.arkaplan on|off'],

  // --- Mevcut komutlar ---
  promote: ['grup', '.promote @kişi'], demote: ['grup', '.demote @kişi'], kick: ['grup', '.kick @kişi'], ban: ['grup', '.ban @kişi'],
  tagall: ['grup', '.tagall'], hidetag: ['grup', '.hidetag <metin>'], groupinfo: ['grup', '.groupinfo'],
  grouplink: ['grup', '.grouplink'], revokeinvitelink: ['grup', '.revokeinvitelink'],
  groupname: ['grup', '.groupname <ad>'], groupdesc: ['grup', '.groupdesc <açıklama>'], grouppic: ['grup', '.grouppic'],
  addmember: ['grup', '.addmember <numara>'], leavegroup: ['grup', '.leavegroup'], groupsettings: ['grup', '.groupsettings'],
  goodbye: ['grup', '.goodbye on|off'], goodbyemsg: ['grup', '.goodbyemsg <metin>'], botprefix: ['grup', '.botprefix add|remove <önek>'],
  badword: ['grup', '.badword add|remove <kelime>'],
  mute: ['grup', '.mute @kişi <süre>'], unmute: ['grup', '.unmute @kişi'], lock: ['grup', '.lock'], unlock: ['grup', '.unlock'],
  kurallar: ['grup', '.kurallar'], kuralekle: ['grup', '.kuralekle <kural>'], kuralsil: ['grup', '.kuralsil <no>'],
  antidelete: ['grup', '.antidelete on|off'], antiedit: ['grup', '.antiedit on|off'], zamanla: ['grup', '.zamanla ekle|sil'],

  antilink: ['koruma', '.antilink on|off'], anticaps: ['koruma', '.anticaps on|off'], antispam: ['koruma', '.antispam on|off'],
  antiflood: ['koruma', '.antiflood on|off'], antibot: ['koruma', '.antibot on|off'], antibadword: ['koruma', '.antibadword on|off'],
  warnlimit: ['koruma', '.warnlimit <no>'], welcome: ['koruma', '.welcome on|off|<metin>'],

  autai: ['gizlilik', '.autai on|off'], chatbot: ['otomasyon', '.chatbot on|off'],
  privacy: ['gizlilik', '.privacy status|viewonce|calls on|off'],
  ayarlar: ['gizlilik', '.ayarlar'], settings: ['gizlilik', '.ayarlar'],
  history: ['gizlilik', '.history on|off|clear'], aiprovider: ['gizlilik', '.aiprovider anthropic|openai|gemini'],
  autoreact: ['gizlilik', '.autoreact on|off'], keyword: ['otomasyon', '.keyword add <kelime> | <yanıt>'],

  sticker: ['medya', '.sticker'], s: ['medya', '.s'], toimg: ['medya', '.toimg'], stickertext: ['medya', '.stickertext Üst | Alt'],
  play: ['medya', '.play <bağlantı|arama>'], ytsearch: ['medya', '.ytsearch <arama>'], ytmp4: ['medya', '.ytmp4 <bağlantı>'],
  tiktok: ['medya', '.tiktok <bağlantı>'], ig: ['medya', '.ig <bağlantı>'], fb: ['medya', '.fb <bağlantı>'],
  xdl: ['medya', '.xdl <bağlantı>'], threads: ['medya', '.threads <bağlantı>'], gdrive: ['medya', '.gdrive <bağlantı>'],
  mediafire: ['medya', '.mediafire <bağlantı>'], spotify: ['medya', '.spotify <bağlantı>'], pinterest: ['medya', '.pinterest <bağlantı>'],
  togif: ['medya', '.togif'], sticker2gif: ['medya', '.sticker2gif'], sticker2mp4: ['medya', '.sticker2mp4'],
  ses: ['medya', '.ses <efekt>'], sesefekt: ['medya', '.ses <efekt>'],

  qr: ['arac', '.qr <metin>'], qroku: ['arac', '.qroku'], topdf: ['arac', '.topdf'],
  ocr: ['arac', '.ocr'], removebg: ['arac', '.removebg'], arka: ['arac', '.arka'], remini: ['arac', '.remini'], fancy: ['arac', '.fancy <metin>'],
  calc: ['arac', '.calc <işlem>'], shorturl: ['arac', '.shorturl <link>'], emojimix: ['arac', '.emojimix 😀 🔥'],
  meme: ['arac', '.meme Üst | Alt'], animatedtext: ['arac', '.animatedtext <metin>'], mediaurl: ['arac', '.mediaurl'],

  search: ['arama', '.search <sorgu>'], gorsel: ['arama', '.gorsel <sorgu>'], sarki: ['arama', '.sarki <şarkı>'],
  duvar: ['arama', '.duvar <sorgu>'], githubprofile: ['arama', '.githubprofile <kullanıcı>'],
  hava: ['arama', '.hava <şehir>'], namaz: ['arama', '.namaz <şehir>'], kur: ['arama', '.kur'],
  deprem: ['arama', '.deprem'], vikipedi: ['arama', '.vikipedi <konu>'], dil: ['arama', '.dil tr|en'],

  ai: ['ai', '.ai <soru>'], sifirla: ['ai', '.sifirla'], kisilik: ['ai', '.kisilik normal|sert|komik|ogretmen'],
  ceviri: ['ai', '.ceviri [dil] <metin>'], ozet: ['ai', '.ozet <metin>'], resimai: ['ai', '.resimai <soru>'],
  character: ['ai', '.character'], setchar: ['ai', '.setchar <ad>'],

  bakiye: ['ekonomi', '.bakiye'], cuzdan: ['ekonomi', '.cuzdan'], banka: ['ekonomi', '.banka'],
  yatir: ['ekonomi', '.yatir <miktar>'], cek: ['ekonomi', '.cek <miktar>'], daily: ['ekonomi', '.daily'], gunluk: ['ekonomi', '.gunluk'],
  gonder: ['ekonomi', '.gonder @kişi <miktar>'], zenginler: ['ekonomi', '.zenginler'],
  isler: ['ekonomi', '.isler'], işler: ['ekonomi', '.işler'],
  market: ['ekonomi', '.market'], al: ['ekonomi', '.al <numara|isim>'], envanter: ['ekonomi', '.envanter'],
  iksirler: ['ekonomi', '.iksirler'], kullan: ['ekonomi', '.kullan <iksir>'],
  kredi: ['ekonomi', '.kredi al|ode <miktar>'], borcum: ['ekonomi', '.borcum'],
  acikartirma: ['ekonomi', '.acikartirma ekle|teklif|sat'], teklif: ['ekonomi', '.acikartirma teklif <miktar>'],

  seviye: ['seviye', '.seviye'], level: ['seviye', '.seviye'], profil: ['seviye', '.profil'],
  top: ['seviye', '.top'], siralama: ['seviye', '.top'], yonkolar: ['seviye', '.yonkolar'], yonkou: ['seviye', '.yonkolar'],
  kavga: ['seviye', '.kavga @kişi [bahis]'], duello: ['seviye', '.kavga @kişi [bahis]'],
  kabulet: ['seviye', '.kabulet'], reddet: ['seviye', '.reddet'],
  gorevler: ['diger', '.gorevler'], gorev: ['diger', '.gorev'], basarimlar: ['diger', '.basarimlar'], basarim: ['diger', '.basarimlar'],

  slot: ['oyun', '.slot <bahis>'], yazitura: ['oyun', '.yazitura <bahis>'],
  blackjack: ['oyun', '.blackjack <bahis>'], bj: ['oyun', '.blackjack <bahis>'],
  hit: ['oyun', '.hit'], vur: ['oyun', '.hit'], stand: ['oyun', '.stand'], dur: ['oyun', '.stand'],
  double: ['oyun', '.double'], ikile: ['oyun', '.double'],
  rulet: ['oyun', '.rulet <bahis> <seçim>'], zar: ['oyun', '.zar <bahis> <1-6|yuksek|alcak>'],
  adamasmaca: ['oyun', '.adamasmaca'], tahmin: ['oyun', '.tahmin <harf|kelime>'], quiz: ['oyun', '.quiz'],
  xo: ['oyun', '.xo @rakip'], oyna: ['oyun', '.oyna <1-9>'], oyuniptal: ['oyun', '.oyuniptal'],
  zincirbaslat: ['oyun', '.zincirbaslat'], zincir: ['oyun', '.zincir <kelime>'], zincirbitir: ['oyun', '.zincirbitir'],
  dogrulukcesaret: ['oyun', '.dogrulukcesaret'], 'tas-kagit-makas': ['oyun', '.tas-kagit-makas'],

  evlen: ['sosyal', '.evlen @kişi'], evlat: ['sosyal', '.evlat @kişi'], bosan: ['sosyal', '.bosan'], aile: ['sosyal', '.aile'],
  ship: ['sosyal', '.ship @kisi1 @kisi2'], gay: ['sosyal', '.gay @kisi'], lezbiyen: ['sosyal', '.lezbiyen @kisi'],
  flirt: ['sosyal', '.flort @kişi'], flort: ['sosyal', '.flort @kişi'],
  yumrukla: ['sosyal', '.yumrukla @kişi'], tekmele: ['sosyal', '.tekmele @kişi'], tokat: ['sosyal', '.tokat @kişi'],
  oldur: ['sosyal', '.oldur @kişi'], sarilma: ['sosyal', '.sarilma @kişi'], optu: ['sosyal', '.optu @kişi'],

  anket: ['diger', '.anket Soru | A | B'], hatirlat: ['diger', '.hatirlat <süre> <metin>'], hatirlatmalarim: ['diger', '.hatirlatmalarim'],
  not: ['diger', '.not <metin>'], notlar: ['diger', '.notlar'], notsil: ['diger', '.notsil <no>'], afk: ['diger', '.afk [sebep]'],

  durum: ['sahip', '.durum'], abone: ['sahip', '.abone'], abonelikiptal: ['sahip', '.abonelikiptal'],
  duyuru: ['sahip', '.duyuru <metin>'], broadcast: ['sahip', '.broadcast <metin>'],
  yedekle: ['sahip', '.yedekle'], yedekgeri: ['sahip', '.yedekgeri (yedek dosyasını alıntıla)'],
  otoyedek: ['sahip', '.otoyedek <süre> | off | durum'],
  mode: ['sahip', '.mode public|private'], sudo: ['sahip', '.sudo @kişi'], unsudo: ['sahip', '.unsudo @kişi'],
  botban: ['sahip', '.botban @kişi'], botunban: ['sahip', '.botunban @kişi'], plugin: ['sahip', '.plugin list|install|remove'],
  vv: ['sahip', '.vv'],

  // --- Ek komutlar (meta verisi tamamlananlar) ---
  not: ['diger', '.not <metin>'], notlar: ['diger', '.notlar'], notsil: ['diger', '.notsil <no>'],
  anket: ['diger', '.anket Soru | A | B'], oylar: ['sohbet', '.oylar'],
  hatirlat: ['diger', '.hatirlat <süre> <metin>'], hatirlatmalarim: ['diger', '.hatirlatmalarim'],
  afk: ['diger', '.afk [sebep]'],
  gorevler: ['diger', '.gorevler'], gorev: ['diger', '.gorev <no>'],
  basarimlar: ['diger', '.basarimlar'], basarim: ['diger', '.basarimlar'],
  cal: ['ekonomi', '.cal'], çalış: ['ekonomi', '.cal'], calis: ['ekonomi', '.calis'],
  çalış: ['ekonomi', '.cal'], balik: ['ekonomi', '.balik'], balık: ['ekonomi', '.balik'],
  maden: ['ekonomi', '.maden'], ciftlik: ['ekonomi', '.ciftlik'], çiftlik: ['ekonomi', '.ciftlik'],
  iptalstam: ['kisi', '.iptalstam'], otodl: ['kisi', '.otodl'], otomatikindir: ['kisi', '.otomatikindir'],
  basvuruotomatik: ['kisi', '.basvuruotomatik on|off|duyuru'],
  gunun: ['eglence', '.haber [kaynak]'], günün: ['eglence', '.haber [kaynak]'],
  konus: ['arac', '.tts <metin>'], ttsdil: ['arac', '.ttsdil <dil>'],
  '8ball': ['eglence', '.8ball <soru>'], sor: ['eglence', '.sor [kişi]'], dogruluk: ['eglence', '.dogruluk [kişi]'],
  stickerkirp: ['arac', '.stickerkirp'], telepaket: ['arac', '.telesticker <paket> [adet]'],
  botpp: ['sahip', '.botpp'], botppsil: ['sahip', '.botppsil'], botbio: ['sahip', '.botbio <metin>'],
  botisim: ['sahip', '.botisim <ad>'],
  uyarilar: ['koruma', '.warnings [kişi]'], uyarireset: ['koruma', '.warnreset @kişi'], sustur: ['koruma', '.sustur <süre> @kişi'],
  kanalara: ['kisi', '.kanalara <kanalId>'], kanalar: ['kisi', '.kanalar <arama>'],
  grupvcf: ['kisi', '.grupvcf'], bakkında: ['kisi', '.hakkinda @kişi'],
  bulanıklastir: ['arac', '.bulaniklastir <sayı>'], keskinlestir: ['arac', '.keskinlestir [sayı]'],
  kucult: ['arac', '.kucult [çarpan]'], kirp: ['arac', '.kirp']
};

// Plugin dosyaları kendi komutlarını topluca tanımlar.
const PREFIX_GROUPS = {
  resimuret: ['ai', '.resimuret <çizim>'],
  ciz: ['ai', '.ciz <çizim>'],
  çiz: ['ai', '.çiz <çizim>'],
  doğruluk: ['eglence', '.dogruluk [kişi]']
};

function resolve(name) {
  const key = String(name).toLowerCase();
  if (META[key]) return META[key];
  const group = PREFIX_GROUPS[key];
  if (group) return [group[0], group[1]];
  // "cizportre" gibi üst eki eşleşen gruplar
  for (const [prefix, g] of Object.entries(PREFIX_GROUPS)) {
    if (g[2] && key.startsWith(prefix) && g[2].includes(key.slice(prefix.length))) return [g[0], '.' + key];
  }
  return null;
}

const ORDER = ['temel', 'grup', 'koruma', 'otomasyon', 'sohbet', 'kisi', 'gizlilik', 'medya', 'arac', 'arama', 'ai', 'ekonomi', 'seviye', 'oyun', 'sosyal', 'eglence', 'diger', 'sahip'];

function entry(name, plugin) {
  const own = plugin && plugin.category ? [plugin.category, plugin.usage || null] : null;
  const meta = own || resolve(name);
  return { name, category: meta ? meta[0] : 'diger', usage: meta ? meta[1] : null };
}

module.exports = { CATEGORIES, ORDER, META, PREFIX_GROUPS, resolve, entry };
