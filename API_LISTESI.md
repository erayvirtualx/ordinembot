# API Anahtar Envanteri

Son güncelleme: 29.09.2026

Ham anahtarlar `.env.anahtarlar` dosyasında (git'e girmez). Bu dosya sadece
durumu tutar. "Bağlandı" = bot kodu bu anahtarı okuyor.

---

## Durum özeti

| Servis | Anahtar | Doğrulama | Bot durumu |
|---|---|---|---|
| Groq | 4 | 4/4 geçerli | ✅ bağlandı, havuzun 1. sırası (~0.3 sn) |
| Mistral | 2 | 2/2 geçerli | ✅ bağlandı, 2. sıra (~0.6 sn) |
| Gemini | 3 | 3/3 geçerli | ✅ bağlandı, 3. sıra (~6 sn) |
| OpenRouter | 2 | 2/2 geçerli | ✅ bağlandı, 4. sıra (~1.4 sn) |
| OpenAI | 2 | 2/2 geçerli | ⚠️ bağlandı ama **hesap kredisi 0** → soğumada |
| Tavily | 2 | 2/2 geçerli | ⬜ bağlanmadı |
| Cloudflare | 2 token | geçerli ama **kullanılamıyor** | ⛔ engelli |
| Anthropic | 1 | geçerli, **kredi 0** | ⚠️ bağlandı ama soğumada |

**15 anahtarın 15'i geçerli.** Hiçbiri ölü değil. 13'ü AI sohbet havuzuna bağlandı.

---

## ✅ Çoklu sağlayıcı AI havuzu — kuruldu ve canlı doğrulandı

`lib/aiproviders.js` + `lib/ai.js` yeniden yazıldı. `.env`'deki `*_KEYS` /
`*_MODELS` değişkenlerinden havuz otomatik kuruluyor.

| Sağlayıcı | Anahtar | Model | Ölçülen hız |
|---|---|---|---|
| Groq | 4 | `qwen/qwen3.8-27b` | **352 ms** |
| Mistral | 2 | `ministral-8b-latest` | **740 ms** |
| Gemini | 3 | `gemini-3.5-flash-lite` | **1417 ms** |
| OpenRouter | 2 | `nvidia/nemotron-3-super-120b-a12b:free` | **1132 ms** |
| OpenAI | 2 | `gpt-4o-mini` | ❌ kredi yok |
| Anthropic | 1 | `claude-sonnet-5` | ❌ kredi yok |

Gerçek sohbet isteği atılarak ölçüldü (soru: *"Türkiye'nin başkenti neredir?"* →
4/4 sağlayıcı doğru cevap verdi).

**Çalışma mantığı**
1. Sağlayıcılar sırayla denenir (`AI_ORDER`).
2. Sağlayıcı içinde anahtarlar döngüsel (round-robin) dağıtılır.
3. Model listesi sırayla denenir — ücretsiz katmanlarda şart (aşağıya bak).
4. Sağlayıcı arka arkaya 2 kez hata verirse **soğutulur** (5 dk); kredi/anahtar
   hatasında 1 saat. Böylece ölü sağlayıcıya her istekte boşuna gidilmez.

### Neden sağlayıcı başına birden fazla model var
Ücretsiz katmanlarda modeller tıka-tıka çalışmıyor. 29.09.2026 ölçümü:

| Sağlayıcı | Çalışmayan model | Çalışan yedeği |
|---|---|---|
| Gemini | `gemini-3.5-flash`, `gemini-3.8-flash` → *"high demand"* | `gemini-3.5-flash-lite` |
| Groq | `openai/gpt-oss-120b` → hata döndü | `qwen/qwen3.8-27b` |
| Mistral | `mistral-medium-latest` → *"Rate limit exceeded"* | `ministral-8b-latest` |
| OpenRouter | `qwen/qwen3.8-27b:free` → sağlayıcı hatası | `nemotron-3-super-120b:free` |

### Yol boyunca bulunan 3 gerçek hata
1. **Anthropic'e `x-api-key` hiç gönderilmiyordu.** `else if` ölü koddu, sadece
   `Bearer` gidiyordu → her istek 401 alıyordu. Test `anthropic x-api-key gönderilmedi`
   diye bunu artık yakalıyor.
2. **Gemini'de round-robin çalışmıyordu.** Anahtar URL'ye `p.anahtarlar[0]` ile
   gidiyordu, yani hep ilk anahtar kullanılıyordu.
3. **Soğutma hiç devreye girmiyordu.** Hata sayacı yalnızca eşiğe ulaşınca haritaya
   yazıldığı için her hatada sıfırdan başlıyordu.

Ayrıca `config.js`'te artık okunmayan `anthropicKey`, `aiModel`, `ai.provider`,
`ai.geminiKey`, `ai.geminiModel` alanları silindi.

### Testler
`test/smoke.js` içinde 8 senaryo: anahtar döngüsü, sağlayıcı geçişi, model yedeği,
soğutma, Türkçe hata çevirileri, boş havuz, Gemini'nin anahtarı URL'ye
koyması, Anthropic'in `x-api-key` göndermesi.
`test/env.js` 46 kontrol (havuz kurulumu, sıra, anahtar/model çözümleme).

---

## ⚠️ OpenAI: anahtar geçerli, kredi yok

```
HTTP 429  "You have no credits remaining."
```
Hesaba kredi yüklenince `AI_ORDER`'da yeri kendiliğinden açılır (soğutma biter).

Bu yüzden:
- **`.imagine`** → anahtarsız Pollinations'a düşüyor. Yedeği de yazıldı: OpenAI
  hata verirse Pollinations'a **otomatik geçiyor** (eskiden hata verip komutu
  tamamen bozuyordu — kredi 0 olduğu için `.imagine` kesin çalışmazdı).
- **`.tts`** → anahtarsız `gtts` (dokunulmadı).
- Pollinations da kotada (HTTP 402). Kota hatasında bir kez 8 sn bekleyip
  tekrar deniyor, olmazsa kullanıcıya anlaşılır mesaj veriyor.
- Gemini görsel üretimi (`gemini-*-image`) ücretsiz katmanda **429** veriyor,
  yani anahtarlı bir görsel yedeği yok.

---

## ⛔ Cloudflare — senin tarafında aksiyon gerek

İki token da geçerli ve aktif ama **ikisi de API çağrısını reddediyor**.
Verdiğin 2 ID de hesap ID'si değil.

**Token 1** — IP kısıtlı
```
Cannot use the access token from location: 176.233.29.29
```
Bu IP izin listesinde değil.
→ dashboard.cloudflare.com → profil → API Tokens → tokenı aç → IP kısıtını **kaldır**
(eklemek de olur ama IP'n değişebilir, kalması daha sağlıklı)

**Token 2** — yetki eksik
```
Unauthorized to access requested resource
```
Hesap bilgisini okuyamıyor.
→ Aynı ekranda Permissions'a ekle:
- `Account → Account Settings → Read`
- `Account → Workers AI → Read`

**Hesap ID'si** — ikisi de yanlış
```
Invalid account identifier
9ac63696… ❌    f6cf8fdc… ❌
```
→ dashboard.cloudflare.com → Workers & Pages → sağ üst köşede yazan 32 haneli ID.
Muhtemelen **user ID**'ni verdin, hesap ID'si farklı.

Cloudflare çalışınca: 10.000 nöron/gün, kredi kartı istemiyor, görsel üretimi
dahil her şeyi bedava yapar. Tavily'ye rakip değil, tamamlayıcı.

---

## ✅ Bağlananlar

### Web araması — Tavily (2 anahtar, `TAVILY_KEYS`)
`.search` artık bir zincir kullanıyor:

| Sıra | Sağlayıcı | Koşul | Ölçülen |
|---|---|---|---|
| 1 | **Tavily** | `TAVILY_KEYS` | 2.5 sn · 4-5 sonuç · AI özeti |
| 2 | Bing | `BING_SEARCH_API_KEY` | — (anahtar yok) |
| 3 | Google | `GOOGLE_SEARCH_API_KEY` + `_CX` | — (anahtar yok) |
| 4 | DuckDuckGo | her zaman | 3 sn · resmî API değil, kırılgan |

- Anahtarlar round-robin: iki anahtar sırayla kullanılır, biri 401/429 alırsa
  diğerine geçilir. İkisi de dolarsa zincir kendiliğinden yedeğe iner.
- `.search ! <metin>` → Tavily `advanced` araması (daha yavaş, daha kapsamlı).
- **Düzeltilen yanlış:** Dokümanda "`.ara` DuckDuckGo kullanıyor" yazıyordu ama
  o kod hiç yazılmamıştı — `.search` anahtarsızken ölüydü. Asıl web arama
  komutu `.search`'tür; `.ara` WhatsApp mesaj aramasıdır ve öyle kalmalı.

---

## ✅ Anahtarsız çalışanlar ( dokunulmayacak )

| Komut | Servis |
|---|---|
| `.hava` | Open-Meteo |
| `.kur` | Frankfurter |
| `.imagine` | Pollinations (yedek olarak kalacak) |
| `.tts` | gtts (yedek olarak kalacak) |
| `.search` | DuckDuckGo (yedek olarak kalacak) |
| `.ara` | WhatsApp yerel mesaj araması |
| `.haber` | BBC Türkçe RSS |
| `.metin` | Tesseract OCR |
| indirme | yt-dlp (kurulu) |
| `.arka` | ✅ **yerel rembg** (kuruldu, komuta bağlandı) |

Bunlar yeni anahtarla **değiştirilmeyecek**, sadece yedek olarak kalacak.

### Yerel rembg — komuta bağlandı
`rembg 2.0.85` + `onnxruntime 1.30.0`, `u2net` modeli
(`~/.rembg/models/u2net/u2net.onnx`, 176 MB).

`.arka` (ve eski adı `.removebg`) artık anahtarsız çalışıyor. Anahtar olmadığı
için komut eskiden **kesin çalışmıyordu**.

| Ölçüm | Değer |
|---|---|
| Model yükleme (süreç açılışında, bir kez) | 1.5 sn |
| **Görsel başına işlem** | **0.35-0.43 sn** |
| Çıktı | RGBA; köşeler alfa=0, nesne alfa=254 (ölçüldü) |
| Çıktı boyutu | 240×240 görselde 4.2 KB → 10.2 KB |

**Neden kalıcı işçi?** Model yüklemesi saniyeler sürüyor. Her komutta yeni
Python süreci açılsaydı her görselde o süre tekrar yaşanırdı.
`tools/rembg_worker.py` modeli bir kez yükler, işleri stdin'den alır.

Robusluk: bozuk girdi işçiyi öldürmüyor · takılan iş 60 sn'de iptal edilip
süreç yeniden başlatılıyor · Python bulunamazsa/kaparsa hata mesajı veriyor.
`remove.bg` anahtarı varsa **yedek** olarak kullanılır.

Ortam: `REMBG_PYTHON` (boşsa otomatik bulunur), `REMBG_MODEL` (varsayılan `u2net`).

---

## 🚫 Vermene gerek yok

- **Anthropic** — kredisi 0. Groq + Mistral + Gemini aynı işi bedavaya görüyor.
  (Havuzun sonunda bekliyor, kredi yüklersen kendiliğinden devreye girer.)
- **remove.bg** — tek deneme kredisi kaldı ve **1 Aralık 2026'da kapanıyor**.
  Anahtar versen 2 ay sonra ölü olur. Yerine yerel `rembg` kuruldu.

---

## Sırada bekleyen işler

1. ✅ `rembg` kurulumu ve doğrulaması
2. ✅ Çoklu sağlayıcı AI havuzu — 13 anahtar bağlandı, canlı doğrulandı
3. ✅ `.imagine` yedeği — OpenAI kredisizken Pollinations'a otomatik geçiyor
4. ✅ `rembg`'ü `.arka`/`.removebg` komutuna bağla — 0.4 sn, anahtarsız
5. ✅ Tavily bağlantısı — `.search` zincirinin başında, DuckDuckGo yedekte
6. ⛔ Cloudflare engelleri (senin tarafında — 3 madde, yukarıda)
7. ⬜ OCR.space, Hugging Face, ElevenLabs, Tenor — isteğe bağlı

### Sana gereken tek şey
**OpenAI hesabına kredi yükle** (veya Anthropic'e). Şu an ikisinin de bakiyesi 0,
bu yüzden `.imagine` ve `.tts` anahtarsız yollarda kalıyor. Kredi girince havuz
otomatik olarak o sağlayıcıları da kullanmaya başlar — kod değişikliği gerekmez.
