// Eğlence komutları için çevrimdışı içerik havuzları (dış servis bağımlılığı yok).
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const BILGI = [
  'Bir balık ortalama 2-3 saniyede bir nefes alır.',
  'Türkiye, dünyada çay üretiminde birinci sıradadır.',
  'Işık bir saniyede yaklaşık 300.000 kilometre yol alır.',
  'Deniz suyu donduğunda tuz dışarıda kaldığı için donma noktası düşer.',
  'Ekvator\'daki bir kişi, kutuplardakinden daha az ağırlık hisseder.',
  'Beyaz kanatarlı ayıların derisi aslında siyahtır, örtü tüyleri sayesinde beyaz görünür.',
  'Bir karıncanın yerçekimine karşı gücü, insanınkinin yaklaşık 5 katıdır.',
  'Marmara Denizi dünyanın en küçük denizidir.',
  'Ekvator\'da bir yıl boyunca yağmur yağmaz.',
  'Bir oyuncak uzay istasyonunun içindeki adam kıyafetini çıkarmadan yıkanabilir.',
  'Türkçedeki "mavi" kelimesi Eski Türkçede "mavi boncuk" anlamındaydı.',
  'Fıstık ağacı 30 metreye kadar uzayabilir ve 1000 yıl yaşayabilir.',
  'Ayakkabıyla uyurken alınan karbonhidrat miktarı hata ile 11\'e ulaşabilir.',
  'Antik Mısır\'da tıbbi kayıtlar papirüs üzerine yazılırdı; parşömen daha sonra kullanıldı.'
];

const ESPRI = [
  'Türkçeye "bilmemek" kaç kez girdi? Bilmemek de bir bilimdir.',
  'Şebekeyi niçin kurdun? Dünya bana fazla geldi.',
  'Temizlik perdesi, insanlığın "buraya kadar, devamı yok" işareti.',
  'En az pil şarjıyla en çok şey yapmanın adına "mühendis" denir.',
  'Beklemede kal, çünkü beklemek, bir şey yapmadığının en zarif hâlidir.',
  'Gözlüğünü birini güldürmek için mi aldın yoksa görmek için mi?',
  'Ben bir yazılımım, hata yapmam; hataları senin talimatların yazıyor.',
  'Bir şeyin çok zor olması, onun işe yaramadığı anlamına gelmez. Yine de dikkatli ol.',
  'Dünyayı kurtaracak düğmeyi buldum, ama etiketi "temizle" idi.',
  'Sabahın erken saatlerinde alınan kararlar, çoğunlukla kahveyle ilgili sorunlardır.',
  'Uyku, tembellik değildir; sadece bedenin toplantıyı kapatıyor.',
  'İnternetin en tehlikeli yeri: "kaydımı unuttum" ekranı.'
];

const ALINTI = [
  ['Başarı, başarısızlıklar arasındaki fark değildir; çabunun devam etme isteğidir. — A. Lincoln', 'https://www.brainyquote.com/'],
  ['Başkasının gördüğü yolu izlemek kolaydır; asıl mesele kendi yolunu çizmektir. — Konfüçyus', 'https://www.brainyquote.com/'],
  ['İyi bir kitap okumak, karanlıkta dolaşan birine fener vermek gibidir. — C. S. Lewis', 'https://www.brainyquote.com/'],
  ['Hayat, bisiklet sürmeye benzer. Dengeni korumak için pedal çevirmeye devam etmelisin. — Einstein', 'https://www.brainyquote.com/'],
  ['Geleceğe güvenmeyenler, geçmişteki başarılarına ne sahip olacaklar? — Churchill', 'https://www.brainyquote.com/'],
  ['Bir işi sevmiyorsan, o işi yapma; ama sevmediğin işi yapma sebebini de sorgula. — J. Maugham', 'https://www.brainyquote.com/'],
  ['Karanlıkta en çok ışık, dönen pervaneden çıkar. — S. Rushdie', 'https://www.brainyquote.com/'],
  ['Bildiğin şeyin binini öğrenmeye çalışma; onun birini derinlemesine öğren. — Konfüçyus', 'https://www.brainyquote.com/']
];

const SARKI = [
  'Yanağıma yatıp öl, yüzünü göğe çevir.',
  'Bir kere yol ver, bir daha sor.',
  'Benim gibidir aşk, senin gibidir sevda.',
  'Gül bahçesi değil, gülümüz yeter.',
  'Dön ki yarın yokuz, yarın da yokuz.',
  'Bir sevda bir de bıçak yarasıdır.',
  'Sen gül ol, ben bahçe olayım.',
  'Aşk olmasa, gül kokmaz.'
];

const ILTIFAT = [
  'Seni düşününce gülümsüyorum, sen konuşunca gülüyorum.',
  'Bazen bir gül yeter; bazen sen gülün tamamısın.',
  'Varlığın, günün en güzel kısmı.',
  'Seninle geçen her dakika iyiye sayılır.',
  'Aklıma geldiği anda, gülümsüyorum.',
  'Bazen en güzel anlar, en sessiz olanlardır.',
  'Seni tanımak, iyi bir kitap okumak gibi.',
  'Her gün biraz daha güzelsin, bu bir sır değil, sadece gerçek.'
];

const ILTIHAM = [
  'Bir saniye sus, bir şey söylemeyi unutma.',
  'Kafanı kullanmadan önce kahveni iç.',
  'Bu grupta bile senin kadar hızlı yazıp duruyorsun, tesadüf değil.',
  'Beyin var mıydı, dosyada açılmıyor mu?',
  'Seninle tartışmak, karanlıkta yüzmekle aynı şey; kimse görmez.',
  'Sessiz ol, yoksa yankı yapacağım.',
  'Mantık, seninle beraber yürümüyor.',
  'Bir dahakine gelmeden önce biraz düşün, olur mu olmaz mı.'
];

const CESARET = [
  'Bir yabancıya gülümse ve tanımadığın bir dilde gülümse.',
  'Gruptaki en sessiz kişiye selam ver.',
  'En son gönderdiğin mesajı sesli mesaj olarak tekrar gönder.',
  'Bir kişinin paylaştığı şarkıyı beğen ve yorum yaz.',
  'Bir hafta boyunca hiç "emoji" kullanma.',
  'Grubun kuralını oku ve uy.',
  'Bir gün boyunca "şu" yerine "bu" deme.',
  'Sana rastgele bir gülümseme gönder.',
  'Bir şeyi "kötü" yerine "zor" diye tarif et.',
  'Gruptaki herkese ayrı ayrı teşekkür et.'
];

const DOGRULUK = [
  'Bu yaştayken en utandığın an hangisiydi?',
  'Sana en çok kızan şey neden?',
  'Telefonunda en çok hangi uygulamayı kullanıyorsun?',
  'Son kez ne zaman ağladın?',
  'Bir arkadaşın hakkında dediğin bir şeyi pişman oldun mu?',
  'En pahalı eşyan ne ve neden?',
  'Bir kez çok büyük bir hata yaptın mı? Ne?',
  'Bebekliğinde en çok neyi seviyordun?'
];

const GUNAYDIN = [
  'Günaydın ☀️ Bugün de güzel bir gün olsun!',
  'Günaydın 🌅 Kahveni iç, gün senin için hazır.',
  'Günaydın 🌞 Yeni bir gün, yeni bir fırsat.',
  'Günaydın ☕ Bugün kahve iki, çay iki olsun.',
  'Günaydın 🌻 Güzel bir gün seni bekliyor.',
  'Günaydın 💫 Dün ne kadar zor olursa olsun, bugün yeni.'
];

const IYIAKSAM = [
  'İyi akşamlar 🌆 Dinlenmeyi unutma.',
  'İyi akşamlar 🌃 Bugünün yorucu kısmı geride kaldı.',
  'İyi akşamlar 🍲 Akşamın tadını çıkar.',
  'İyi akşamlar 🌙 Güzel bir rüya gör.',
  'İyi akşamlar 🕯️ Yavaşla biraz.'
];

const IYIGECELER = [
  'İyi geceler 🌙 Huzurlu uykular.',
  'İyi geceler 🌜 Bugün her şey yoluna gitsin.',
  'İyi geceler 😴 Yarın güzel bir gün olsun.',
  'İyi geceler 🌌 Rüyalarında sakinlik bul.',
  'İyi geceler 🛌 Telefonu bırakma zamanı.'
];

const SEKIZTOP = [
  'Kesinlikle evet.', 'Bunu sorma bile.', 'Acele etme, sıra değil.', 'Yarın düşün.',
  'Kesinlikle hayır.', 'Daha fazla bilgi lazım.', 'İyi ki bahse girmedin.',
  'Kesinlikle yap.', 'Bunu yapmanın bir anlamı yok.', 'Henüz karar veremedim.'
];

module.exports = {
  BILGI, ESPRI, ALINTI, SARKI, ILTIFAT, ILTIHAM, CESARET, DOGRULUK,
  GUNAYDIN, IYIAKSAM, IYIGECELER, SEKIZTOP,
  randomBilgi: () => pick(BILGI),
  randomEspri: () => pick(ESPRI),
  randomSarki: () => pick(SARKI),
  randomIltifat: () => pick(ILTIFAT),
  randomIltiham: () => pick(ILTIHAM),
  randomCesaret: () => pick(CESARET),
  randomDogruluk: () => pick(DOGRULUK),
  randomSekizTop: () => pick(SEKIZTOP),
  randomAlinti: () => ALINTI[Math.floor(Math.random() * ALINTI.length)]
};
