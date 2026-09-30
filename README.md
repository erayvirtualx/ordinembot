# OrdinemBot

WhatsApp Web tabanlı Türkçe grup ve kişisel sohbet botu. Node.js 20 veya üzeri önerilir.

## Kurulum

1. Node.js 20+ ve Python 3 kurun.
2. `npm install` çalıştırın. Medya indirme komutları için ayrıca `yt-dlp` kurup PATH'e ekleyin.
3. `.env.example` dosyasını `.env` olarak kopyalayıp anahtarları doldurun. Bot sahibinin numarasını `.env` içindeki `OWNER=` satırına ülke koduyla, `+` olmadan yazın (boş bırakırsanız `config.js` içindeki değer kullanılır).
4. `npm start` ile başlatın. İlk bağlantıda QR kodunu WhatsApp'tan okutun. İsterseniz QR yerine `.env` içindeki `PAIRING_PHONE` ile numara eşleme kodu isteyin.

Oturum kimlikleri `WABOT_SESSIONS=session,ikinci` biçiminde verilebilir. `.wwebjs_auth/`, `.wwebjs_cache/` ve `data.json` dosyasını yedekleyip kalıcı diskte tutun. Docker için `docker build -t ordinem-bot .` komutunu kullanın ve bu oturum/veri yollarını kalıcı volume olarak bağlayın.

## Özellikler

- Seviye/XP, ekonomi, işler, market, kumar, görevler ve Yonkou ilk dört sıralaması. Yonkou gücü XP ve kavga galibiyetinden hesaplanır; cüzdan/banka parası etkilemez.
- Onaylı düello: hedefe istek gider, iki dakika içinde kabul edilmezse reddedilir. Bahisli ve dostane karşılaşmalar, galibiyet/mağlubiyet sayacı.
- Grup yönetimi ve koruma: rol yönetimi, hoş geldin/veda, sessiz etiketleme, davet bağlantısı, grup ayarları, anti-link/flood/caps/bot/küfür, **anti-tag**, **otomatik okundu**, **yazıyor simülasyonu**, **özel mesaj engeli** ve anahtar sözcük yanıtları.
- **Gruba katılma başvuruları**: `.basvurular` ile listeleme, `.onayla` / `.onayreddet` ile tek tek veya toplu işlem, `.basvuruotomatik on` ile otomatik onay. Her grup için ayrı ayarlanır.
- **Sohbet yönetimi**: arşivleme, sabitleme, okunmadı işaretleme, mesaj temizleme, WhatsApp etiketleri, mesaj arama, ortak gruplar, sohbet susturma ve `.takip` ile iletim durumu takibi.
- **Kişi ve kanal**: tek kişi kartı (`.kart`), **tüm grubu tek vCard olarak gönderme** (`.grupkart`) veya `.grupvcf` ile sınırsız `.vcf` dosyası, engelleme/engel kaldırma, kanal (newsletter) aboneliği ve oluşturma.
- **Toplu mesajlaşma**: `.stam` ile alıntılanan mesajı herkese özelden gönderme, `.herkes` ile duyuru, `.toplumsil`, `.iptalstam` ile gönderi durdurma. Gönderimler arası bekleme uygulanır (WhatsApp spam koruması).
- **Konum gönderme**: adres yazınca OpenStreetMap ile çözülür, koordinat da doğrudan verilebilir.
- **Profil yönetimi**: `.botpp`, `.botppsil`, `.botbio`, `.botisim`.
- **Anket sonuçları**: `.anketsonuc` ile oy dağılımı, `.oylar` ile anlık oy kaydı.
- **Metinden sese**: `.tts <metin>` sesli mesaj üretir; 16 dil, sağlayıcı olarak gtts (anahtarsız), OpenAI veya ElevenLabs. `.ttsdil <dil>` ile varsayılan dil değiştirilir.
- **AI görsel üretimi**: `.imagine <açıklama>` — anahtar varsa OpenAI `gpt-image-1`, yoksa anahtarsız Pollinations.
- **Görsel düzenleme**: bulanıklaştırma, keskinleştirme, boyutlandırma, kırpma, döndürme, gri tonlama, çevirme, WhatsApp sticker kırpma (`.stickerkirp`) ve Telegram sticker paketi (`.telesticker`).
- **Otomatik medya indirme**: grupta paylaşılan desteklenen bağlantıları otomatik indirir (`.otoindir on|off`), izinli alan adları `AUTODL_HOSTS` ile sınırlıdır.
- **Haber**: `.haber` RSS kaynaklarından son haberleri listeler (`NEWS_FEEDS`).
- **Eğlence**: bilgi, espri, alıntı, şarkı sözü, iltifat, iltiham, 8-ball, cesaret, doğruluk ve günaydın/iyi akşam/iyi geceler selamları.
- AI sohbeti: Anthropic, OpenAI uyumlu servisler veya Gemini; birden çok API anahtarı, grup botu, DM otomatik yanıtı ve kullanıcı karakterleri.
- YouTube arama/indirme ve yt-dlp destekli TikTok, Instagram, Facebook, X, Threads, Google Drive, MediaFire, Spotify ve Pinterest indirme komutları.
- OCR, arka plan silme, görsel iyileştirme, süslü yazı, hesap makinesi, URL kısaltma, emoji karışımı, meme/hareketli yazı çıkartmaları ve medya dönüştürme.
- Web/görsel arama, şarkı sözü, duvar kâğıdı, GitHub profili, anime tepkileri, mini oyunlar.
- **Uyarı sistemi**: `.warn`, `.warnings`, `.warnreset`, `.sustur <süre> @kişi`; limit aşımında otomatik atma.
- **Otomatik yedekleme**: `.otoyedek <süre>` ile `backups/` klasörüne zamanlanmış yedek, `.yedekgeri` ile geri yükleme (geri yükleme öncesi veri otomatik saklanır).
- Olay günlüğü, isteğe bağlı sohbet geçmişi, birden fazla oturum, yeniden bağlanma, pairing code, korumalı yerel web paneli ve REST API.

## Yardım listesi

`.yardim` çıktısı artık elle yazılmaz; `lib/commandmeta.js` içindeki kategori ve kullanım bilgilerinden otomatik üretilir. Yeni bir komut eklendiğinde `META` sözlüğüne `isim: ['kategori', '.kullanım']` biçiminde kayıt eklemek yeterlidir. Sayfa sayısı komut sayısıyla birlikte otomatik artar.

## Gizlilik

`.privacy status on|off`, `.privacy viewonce on|off` ve `.privacy calls on|off` yalnızca bot sahibince değiştirilebilir. Durumları otomatik görme ve tek görüntülemelik medyayı sahibine iletme özellikleri varsayılan olarak kapalıdır. Tek görüntülemelik içerik, WhatsApp Web medya indirmesine izin verirse kopyalanır; istemci veya WhatsApp erişimi engellerse kurtarma garantisi yoktur. Sohbet geçmişi `.history on|off` ile ayrıca açılır ve varsayılan olarak kapalıdır; `.history clear` kayıtlı geçmişi siler. Bot ayrıca mesaj metni saklamadan sınırlı sayıda olay kaydında sohbet/gönderen kimliklerini ve olay türünü tutar. Bu ayarları yalnızca gerekli izin ve bilgilendirme kapsamında kullanın.

## Panel ve servis anahtarları

Paneli etkinleştirmek için `DASHBOARD_ENABLED=true` ve güçlü bir `DASHBOARD_API_KEY` belirleyin. Varsayılan adres yalnızca yerel bilgisayarda dinler (`127.0.0.1`). Dış erişim gerekiyorsa güvenli bir reverse proxy kullanın; API anahtarını paylaşmayın.

Arama için Google Custom Search anahtarı ve CX, OCR için OCR.space anahtarı, arka plan kaldırma için remove.bg anahtarı, anime tepkileri için Tenor anahtarı gerekir. `.mediaurl` için `MEDIA_UPLOAD_URL`, `{filename,mimetype,data}` JSON gövdesini alıp `{url}` döndüren güvenilir bir HTTPS yükleme servisine işaret etmelidir. Bazı indirme siteleri ve harici API'ler değişebilir, kota koyabilir veya hizmeti durdurabilir.

`.tts` varsayılan olarak anahtar gerektirmeyen Google Translate TTS servisini kullanır. `TTS_PROVIDER=openai` veya `elevenlabs` seçerseniz ilgili anahtar gerekir. Metin 900 karakterle sınırlıdır ve ffmpeg ile sesli mesaj biçimine (ogg/opus) dönüştürülür. `.imagine` anahtar bulunmadığında Pollinations'ın açık uç noktasına istek atar; bu servis kotalı olabilir.

Konum çözümleme OpenStreetMap Nominatim servisine yapılır; yoğun kullanımda kendi Nominatim örneğinizi çalıştırmak daha uygundur. Haber komutu `NEWS_FEEDS` içindeki herhangi bir geçerli RSS kaynağını kullanır.

## Başlıca komutlar

`.yardim` güncel komut gruplarını listeler. Grup özelliklerinin bir kısmı yönetici yetkisi, AI/görsel özellikleri servis anahtarı, indiriciler `yt-dlp` gerektirir. Dinamik eklenti yükleme `.plugin` komutuyla yalnızca bot sahibine açıktır; eklenti kodu bot süreci içinde çalıştırılır, bu yüzden yalnızca güvendiğiniz HTTPS kaynaklarını kullanın.
