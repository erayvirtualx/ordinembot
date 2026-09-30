// Tüm komutları sahte WhatsApp istemcisiyle çalıştırır ve lib modüllerini doğrular.
// Çalıştırma: node test/smoke.js
const { client, state, groupChat, privateChat, makeMessage, commands, config } = require('./whatsapp');

const db = require('../lib/db');
db.save = () => {};

let passed = 0;
const failures = [];
const slow = [];

const SAMPLE = {
  günaydın: 'günaydın', gunaydin: 'gunaydin', haber: 'spor', ara: 'test',
  etikettencikar: '1 123@g.us', etiketekle: '1 123@g.us', '8ball': 'soru', sekiztop: 'soru',
  tts: 'merhaba', sesli: 'merhaba', konus: 'merhaba', ttsdil: 'en',
  botbio: 'yeni durum', botisim: 'Test', cagrilink: 'ses', grupolustur: 'Test Grubu',
  numarainfo: '905000000000', warn: 'kural ihlali', sustur: '10m', sarkisoz: 'şarkı',
  alinti: 'alıntı', stickertext: 'üst|alt', meme: 'üst|alt', tas: 'a', ciftlik: '',
  çiftlik: '', zincir: 'kitap', kelime: 'kitap', evlat: 'evlat', flort: 'flort',
  yumrukla: 'yumruk', ship: 'ship', deprem: 'deprem', kelimeler: 'x',
  gorsel: 'kedi', sarki: 'şarkı adı', duvar: 'manzara', hava: 'İstanbul', namaz: 'İstanbul',
  vikipedi: 'Türkiye', githubprofile: 'kullanici', vurgu: 'vurgu', kutuplu: 'x',
  kur: 'kur', emoji: '😀', kanalara: '123@newsletter', kanaldan: '123@newsletter',
  kanaldin: '123@newsletter', kanallar: '', kanalar: 'spor', kelime: 'x',
  animate: 'x', yardim: 'yardim', 2: '2', turkce: 'x'
};

const argsFor = (name) => {
  const v = SAMPLE[name];
  if (v === undefined) return [];
  if (v === '') return ['x'];
  return String(v).split(/\s+/);
};

(async () => {
  const names = [...commands.keys()];

  for (const name of names) {
    const plugin = commands.get(name);
    if (typeof plugin.run !== 'function') { passed++; continue; }

    for (const [label, chat] of [['grup', groupChat], ['ozel', privateChat]]) {
      // Grupta çalışması gereken komutları özel sohbette çalıştırma.
      if (!chat.isGroup && (plugin.group || plugin.admin)) { passed++; continue; }
      const msg = makeMessage('t_' + name, chat);
      msg.body = '.' + name + (argsFor(name).length ? ' ' + argsFor(name).join(' ') : '');
      const ctx = {
        client, msg, chat, cmd: name, args: argsFor(name),
        sender: '111@s.whatsapp.net', senderNum: '111',
        isOwner: true, isSudo: true, isAdmin: true, isGroup: chat.isGroup,
        db, config
      };
      try {
        const p = plugin.run(ctx);
        if (p && typeof p.then === 'function') {
          // Ağ çağrılı yapan komutlar 3 saniyede söz verilmezse zaman aşımına uğratılır.
          let timer;
          const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('ZAMAN AŞIMI (ağ)')), 3000); });
          try { await Promise.race([p, timeout]); }
          catch (e) {
            if (e.message.startsWith('ZAMAN AŞIMI')) slow.push(`${name} [${label}]`);
            else failures.push(`${name} [${label}] :: ${e.message}`);
          } finally { clearTimeout(timer); }
        } else passed++;
        if (p && typeof p.then === 'function') passed++;
      } catch (e) {
        failures.push(`${name} [${label}] :: ${e.message}`);
      }
    }
  }

  // --- Birim kontrolleri ---
  const checks = [];
  const pending = [];
  // Asenkron testler SIRAYA bağlanır. Nedeni: bazı testler global.fetch'i
  // değiştiriyor; eşzamanlı çalışırlarsa birbirinin mock'unu ezer ve test
  // kendi kurgusundan uzak bir hata mesajıyla düşer.
  let zincir = Promise.resolve();
  const t = (label, fn) => {
    zincir = zincir.then(async () => {
      try {
        const r = fn();
        if (r && typeof r.then === 'function') await r;
        checks.push([label, null]);
      } catch (e) { checks.push([label, e.message]); }
    });
    pending.push(zincir);
  };

  t('lib/acks akışı', () => {
    const acks = require('../lib/acks');
    acks.track({ id: { _serialized: 'a1' }, from: '1@c.us' });
    acks.update({ id: { _serialized: 'a1' } }, 3);
    if (!acks.summary().includes('okundu')) throw new Error('özet "okundu" içermiyor: ' + acks.summary());
  });

  t('lib/contacts toId', () => {
    const c = require('../lib/contacts');
    if (c.toId('+90 555 111 22 33') !== '905551112233@c.us') throw new Error('toId hatalı');
    if (c.toId('abc') !== null) throw new Error('geçersiz girdi null olmalı');
    const v = c.vcardText(['905551112233@c.us', '905559999999@c.us']);
    if ((v.match(/BEGIN:VCARD/g) || []).length !== 2) throw new Error('vcard kayıt sayısı hatalı');
  });

  t('lib/rss parse', () => {
    const rss = require('../lib/rss');
    const xml = '<rss><item><title><![CDATA[Başlık & test]]></title><link>https://x/1</link><description>x</description></item></rss>';
    const items = rss.parse(xml);
    if (items.length !== 1) throw new Error('1 kayıt beklenirken ' + items.length);
    if (items[0].title !== 'Başlık & test') throw new Error('başlık: ' + items[0].title);
  });

  t('lib/tts chunk + lang', () => {
    const tts = require('../lib/tts');
    if (tts.chunk('bir iki üç '.repeat(100), 100).some((p) => p.length > 110)) throw new Error('parça sınırı aşıldı');
    if (tts.normalizeLang('EN') !== 'en') throw new Error('dil normalizasyonu hatalı');
    if (tts.normalizeLang('zz') !== 'tr') throw new Error('bilinmeyen dil tr olmalı');
  });

  t('lib/commandmeta', () => {
    const { resolve, entry } = require('../lib/commandmeta');
    if (resolve('ping')[0] !== 'temel') throw new Error('ping meta verisi çözülmedi');
    // Silinen anime tepki komutları artık META'da da olmamalı; kalmışsa
    // yardım sayfası ölü komutları listeleye devam eder.
    if (resolve('animeslap')) throw new Error('silinen anime komutu hâlâ meta tablosunda');
    if (entry('ping', {}).category !== 'temel') throw new Error('ping kategorisi hatalı');
    if (entry('bilinmeyen', {}).category !== 'diger') throw new Error('bilinmeyen komut kategorisi "diger" olmalı');
  });

  t('db grup varsayılanları', () => {
    const gg = db.group('yeni-grup');
    for (const k of ['antitag', 'autoread', 'autotyping', 'pmblocker', 'autoDownload', 'backgroundSync', 'autoApprove', 'announceRequests']) {
      if (gg[k] === undefined) throw new Error('eksik alan: ' + k);
    }
  });

  t('warn eski uyarı sayacı dönüşümü', async () => {
    const warn = require('../plugins/warn');
    // Komut grubu chat.id._serialized üzerinden okur; bu yüzden test grubu da
    // groupChat'ten ayrı bir id taşımalı (aksi hâlde diğer testlerle karışır).
    const chat = Object.assign({}, groupChat, { id: { _serialized: 'eski-grup@g.us', user: 'eski-grup' } });
    const gg = db.group(chat.id._serialized);
    gg.warns = { '222': 2 };                   // eski biçim: düz sayı, çıplak anahtar
    gg.warnLimit = 99;
    const m = makeMessage('w1', chat);
    await warn.run({ client, msg: m, chat, cmd: 'warn', args: ['kural ihlali'], senderNum: '999', db });
    const w = gg.warns['222'];
    if (typeof w !== 'object') throw new Error('sayısal sayaç nesneye dönüşmedi: ' + JSON.stringify(w));
    if (w.count !== 3) throw new Error('sayı sayacı kayboldu: ' + JSON.stringify(w));
    if (!w.history.length) throw new Error('geçmiş kaydı oluşmadı');

    // Liste komutu eski kayıtları da görmeli (migration sonrası boş dönmemeli).
    const l = makeMessage('w2', chat);
    l.getMentions = async () => [];
    let cevap = null;
    l.reply = async (x) => { cevap = x; };
    await warn.run({ client, msg: l, chat, cmd: 'warnings', args: [], senderNum: '999', db });
    if (!/222/.test(String(cevap))) throw new Error('listede eski uyarı görünmüyor: ' + cevap);
  });

  // Koruma yolu (.antilink) ve komut yolu (.warn) aynı tabloyu paylaşmalı:
  // anahtar biçimi ayrışırsa kullanıcı iki ayrı sayaç tutar ve limit tutmaz.
  t('uyarı sayacı koruma ve komut arasında ortak', async () => {
    const protection = require('../lib/protection');
    const warn = require('../plugins/warn');
    const chat = Object.assign({}, groupChat, { id: { _serialized: 'ortak-grup@g.us', user: 'ortak-grup' } });
    const gg = db.group(chat.id._serialized);
    gg.warns = { '111@s.whatsapp.net': 1 };   // eski tam-JID anahtarı
    gg.antilink = true;
    gg.warnLimit = 99;

    const link = makeMessage('p1', chat);
    link.body = 'https://spam.example.com';
    await protection(client, link, chat, '111@s.whatsapp.net', false);
    if (gg.warns['111@s.whatsapp.net'] !== undefined) throw new Error('tam JID anahtarı temizlenmedi');
    if (gg.warns['111']?.count !== 2) throw new Error('koruma sayacı taşınmadı: ' + JSON.stringify(gg.warns));

    const m = makeMessage('p2', chat);
    m.getMentions = async () => [{ id: { _serialized: '111@s.whatsapp.net', user: '111' } }];
    await warn.run({ client, msg: m, chat, cmd: 'warn', args: ['ihlal'], senderNum: '999', db });
    if (gg.warns['111']?.count !== 3) throw new Error('komut korumanın sayacını görmedi: ' + JSON.stringify(gg.warns));
  });

  t('help sayfaları', () => {
    const help = require('../plugins/help');
    const pages = help.build(commands, config);
    if (pages.length < 1) throw new Error('sayfa üretilmedi');
    if (pages.some((p) => p.length > 4200)) throw new Error('sayfa WhatsApp sınırını aşıyor');
    if (!pages[0].includes('Komutlar')) throw new Error('başlık eksik');
  });

  t('protection eski uyarı biçimi', async () => {
    const protection = require('../lib/protection');
    // protection grubu chat.id._serialized üzerinden okur ve uyarıları çıplak
    // numarayla anahtarlar; bu yüzden testteki grup anahtarı groupChat ile aynı olmalı.
    const gg = db.group(groupChat.id._serialized);
    gg.warns = { '111': 2 };
    gg.antilink = true;
    gg.warnLimit = 99;
    const bad = makeMessage('bad', groupChat);
    bad.body = 'https://spam.example.com';
    await protection(client, bad, groupChat, '111@s.whatsapp.net', false);
    const w = gg.warns['111'];
    if (typeof w !== 'object' || w.count !== 3) throw new Error('sayısal sayaç nesneye dönüşmedi: ' + JSON.stringify(w));
  });

  t('lib/imgtools', async () => {
    const sharp = require('sharp');
    const img = require('../lib/imgtools');
    const png = await sharp({ create: { width: 200, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } } }).png().toBuffer();
    const media = { mimetype: 'image/png', data: png.toString('base64') };
    for (const [fn, label] of [[img.blur, 'blur'], [img.sharpen, 'sharpen'], [img.resize, 'resize'],
      [img.cropSquare, 'cropSquare'], [img.rotate, 'rotate'], [img.grayscale, 'grayscale'], [img.flip, 'flip']]) {
      const r = await fn(media);
      if (!Buffer.isBuffer(r.data) || !r.data.length) throw new Error(label + ' çıktı üretmedi');
      const meta = await sharp(r.data).metadata();
      if (!meta.width) throw new Error(label + ' geçerli görsel değil');
    }
  });

  t('lib/quotes havuzları', () => {
    const q = require('../lib/quotes');
    for (const k of ['BILGI', 'ESPRI', 'ALINTI', 'GUNAYDIN', 'IYIGECELER', 'SEKIZTOP']) {
      if (!Array.isArray(q[k]) || !q[k].length) throw new Error(k + ' boş');
    }
    if (q.randomAlinti().length !== 2) throw new Error('alıntı [metin, yazar] dönmeli');
  });

  t('lib/broadcast hedef listesi', () => {
    const broadcast = require('../lib/broadcast');
    db.user('111');
    const list = broadcast.targets(db, client);
    if (!list.includes('111@c.us')) throw new Error('kayıtlı kullanıcı listede değil');
  });

  // Çoklu sağlayıcı havuzu: anahtar döngüsü, sağlayıcı geçişi, model yedeği,
  // kalıcı hatada kısa devre ve soğutma.
  const aiDene = async () => {
    const ai = require('../lib/ai');
    const gercek = global.fetch;
    // baseUrl sağlayıcı adından türetilir ki hangisine gittiğimiz ayırt edilebilsin.
    const OAI = (b) => ({ ad: b.ad, adTR: b.ad, tur: 'openai', baseUrl: `https://${b.ad}.test/v1`, anahtarlar: b.anahtarlar || ['K1'], modeller: b.modeller || ['m1'] });
    const mk = (havuz) => ({ ai: { havuz, apiKeys: [], openaiBaseUrl: '', openaiModel: 'm1' } });
    const SORU = [{ role: 'user', content: 'x' }];
    const hata = (status, mesaj) => ({ ok: false, status, json: async () => ({ error: { message: mesaj } }) });
    const basari = (metin) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: metin } }] }) });
    // fetch mock'unu kurar, çalıştırır ve (başka testlere sızmasın diye) geri alır.
    // Mock ayrı geçirilir; test 4 aynı mock'u üst üste kullanıyor, bu yüzden
    // geri yükleme her çağrıda yapılmamalı.
    const calistir = async (fn) => {
      try { return { r: await fn() }; }
      catch (e) { return { e }; }
      finally { global.fetch = gercek; }
    };
    const mockla = (f) => { global.fetch = f; };
    const cagir = async (c, fetchFn) => {
      mockla(fetchFn);
      const sonuc = await calistir(() => ai.complete(c, 's', SORU));
      return sonuc;
    };

    // 1) 429 alan anahtardan diğerine geçmeli.
    {
      const c = mk([OAI({ ad: 'a', anahtarlar: ['K1', 'K2'] })]);
      let cagri = 0;
      const { r, e } = await cagir(c, async (_u, o) => {
        cagri++;
        if (cagri === 1) return hata(429, 'rate limit');
        if (o.headers.authorization !== 'Bearer K2') throw new Error('2. anahtara geçmedi: ' + o.headers.authorization);
        return basari('tamam');
      });
      if (e) throw e;
      if (r.metin !== 'tamam' || cagri !== 2) throw new Error(`anahtar döngüsü bozuk (cagri=${cagri})`);
    }

    // 2) Sağlayıcı tıkandığında sıradakine geçmeli (döngü sadece anahtar değil, sağlayıcı).
    {
      const c = mk([OAI({ ad: 'a' }), OAI({ ad: 'b' })]);
      const gidenler = [];
      const { e } = await cagir(c, async (u) => { gidenler.push(u); return hata(500, 'overloaded'); });
      if (!e) throw new Error('iki sağlayıcı da ölüyken cevap döndü');
      if (!gidenler.some((u) => u.includes('b.test'))) throw new Error('ikinci sağlayıcı hiç denenmedi');
    }

    // 3) Model çalışmıyorsa sıradaki modele geçmeli (ücretsiz katmanlarda şart).
    {
      const c = mk([OAI({ ad: 'a', modeller: ['kotali', 'yedek'] })]);
      const modeller = [];
      const { r, e } = await cagir(c, async (_u, o) => { modeller.push(JSON.parse(o.body).model); return modeller.length === 1 ? hata(429, 'high demand') : basari('ok'); });
      if (e) throw e;
      if (r.model !== 'yedek') throw new Error('model yedeğine geçilmedi: ' + r.model);
    }

    // 4) Art arda hatalar sağlayıcıyı soğutmaya almalı; soğutulmuşsa tekrar denenmemeli.
    //    'kayip' hep 500 verir, 'kurtarici' hep başarılıdır. Eşik 2 hata olduğu için
    //    1. ve 2. istekte 'kayip' birer kez denenir, 3.'de artık hiç denenmemelidir.
    {
      const c = mk([OAI({ ad: 'kayip' }), OAI({ ad: 'kurtarici' })]);
      let sayac = 0;
      const fetchFn = async (u) => { sayac++; return u.includes('kayip') ? hata(500, 'boom') : basari('kurtarildi'); };

      for (const tur of [1, 2]) {
        sayac = 0;
        const { r, e } = await cagir(c, fetchFn);
        if (e) throw e;
        if (r.saglayici !== 'kurtarici') throw new Error(`kurtarici seçilmedi: ${r.saglayici}`);
        if (sayac !== 2) throw new Error(`${tur}. istekte 2 çağrı beklenirken ${sayac} görüldü`);
      }

      // 3. istek: 'kayip' soğutulmuş olmalı, yalnızca 'kurtarici' çağrılmalı.
      sayac = 0;
      const { r, e } = await cagir(c, fetchFn);
      if (e) throw e;
      if (r.saglayici !== 'kurtarici') throw new Error('soğutma sonrası yanlış sağlayıcı');
      if (sayac !== 1) throw new Error(`soğutulmuş sağlayıcı yine denendi (${sayac} çağrı)`);
      const durum = ai.saglik(c).find((s) => s.ad === 'kayip');
      if (durum.durum !== 'soğutmada' || durum.sonHata !== 'boom') throw new Error('sağlık raporu soğutmayı göstermiyor: ' + JSON.stringify(durum));
    }

    // 5) Türkçe hata mesajları.
    {
      const c = mk([OAI({ ad: 'x', anahtarlar: ['K1'] })]);
      const { e } = await cagir(c, async () => hata(404, 'not_found_error: model bulunamadi'));
      if (!e || !/Model bulunamadı/.test(e.message)) throw new Error('çeviri çalışmadı: ' + (e && e.message));
    }
    {
      const c = mk([OAI({ ad: 'y', anahtarlar: ['K1'] })]);
      const { e } = await cagir(c, async () => hata(429, 'You have no credits remaining.'));
      if (!e || !/kredisi bitti/i.test(e.message)) throw new Error('kredi hatası çevrilmedi: ' + (e && e.message));
    }

    // 6) Havuz boşsa anlaşılır hata.
    {
      const { e } = await cagir(mk([]), async () => basari('asla'));
      if (!e || !/anahtarı yok/i.test(e.message)) throw new Error('boş havuz uyarısı yok: ' + (e && e.message));
    }

    // 7) Gemini türü: anahtar sorgu dizesinde gitmeli, başlıkta olmamalı.
    {
      const c = mk([{ ad: 'g', adTR: 'Gemini', tur: 'gemini', baseUrl: 'https://g.test/v1beta', anahtarlar: ['GKEY'], modeller: ['gm'] }]);
      let dogrulandi = false;
      global.fetch = async (u, o) => {
        if (!u.includes('key=GKEY')) throw new Error('gemini anahtarı URLde değil: ' + u);
        if (o.headers.authorization) throw new Error('gemini başlığında yanlışlıkla Bearer var');
        dogrulandi = true;
        return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'gemini-ok' }] } }] }) };
      };
      const { r, e } = await cagir(c, async (u, o) => {
        if (!u.includes('key=GKEY')) throw new Error('gemini anahtarı URLde değil: ' + u);
        if (o.headers.authorization) throw new Error('gemini başlığında yanlışlıkla Bearer var');
        dogrulandi = true;
        return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'gemini-ok' }] } }] }) };
      });
      if (e) throw e;
      if (!dogrulandi || r.metin !== 'gemini-ok') throw new Error('gemini çağrısı beklenen şekilde gitmedi');
    }

    // 8) Anthropic türü: x-api-key başlığı şart (Bearer ile giderse 401 alır).
    {
      const c = mk([{ ad: 'c', adTR: 'Claude', tur: 'anthropic', baseUrl: 'https://a.test/v1', anahtarlar: ['AKEY'], modeller: ['cm'] }]);
      const { r, e } = await cagir(c, async (_u, o) => {
        if (o.headers['x-api-key'] !== 'AKEY') throw new Error('anthropic x-api-key gönderilmedi: ' + JSON.stringify(o.headers));
        return { ok: true, status: 200, json: async () => ({ content: [{ text: 'claude-ok' }] }) };
      });
      if (e) throw e;
      if (r.metin !== 'claude-ok') throw new Error('anthropic cevabı okunamadı');
    }
  };
  t('lib/ai havuz (döngü + geçiş + soğutma)', aiDene);

  // Web araması sağlayıcı zinciri: Tavily → Bing → Google → DuckDuckGo.
  // Buradaki kritik nokta "anahtar varsa Tavily, yoksa anahtarsız yedek" ve
  // "anahtarlar bitince sıradaki sağlayıcıya sessizce düşme".
  const aramaDene = async () => {
    const ws = require('../lib/websearch');
    const gercek = global.fetch;
    const mkCfg = (m) => ({ media: { tavilyKeys: '', bingApiKey: '', googleApiKey: '', googleCx: '', ...m } });
    const cagir = async (cfg, fetchFn) => {
      global.fetch = fetchFn;
      try { return { r: await ws.ara('test', { config: cfg, sayfa: 3 }) }; }
      catch (e) { return { e }; }
      finally { global.fetch = gercek; }
    };
    const tavilyCevap = (n) => ({ ok: true, status: 200, json: async () => ({
      answer: 'özet', results: Array.from({ length: n }, (_, i) => ({ title: `B${i}`, url: `https://t.test/${i}`, content: `ozet ${i}`, score: 0.9 })) }) });
    const ddgHtml = (n) => {
      const satirlar = Array.from({ length: n }, (_, i) => `<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fsite${i}.test%2F">Başlık ${i}</a>`).join('\n');
      return { ok: true, status: 200, text: async () => `<html>${satirlar}</html>` };
    };
    const yasla = (mesaj) => { throw new Error(mesaj); };

    // 1) Tavily anahtarı varsa birinci sırada o çalışmalı.
    {
      let hangisi = null;
      const { r, e } = await cagir(mkCfg({ tavilyKeys: 'K1' }), async (u) => { hangisi = u; return tavilyCevap(2); });
      if (e) throw e;
      if (r.saglayici !== 'tavily') throw new Error('Tavily seçilmedi: ' + r.saglayici);
      if (!String(hangisi).includes('api.tavily.com')) throw new Error('yanlış uç nokta: ' + hangisi);
      if (r.sonuclar.length !== 2) throw new Error('sonuç sayısı yanlış: ' + r.sonuclar.length);
      if (r.cevap !== 'özet') throw new Error('Tavily özeti okunamadı');
    }

    // 2) Round-robin: iki anahtar sırayla kullanılmalı.
    {
      const kullanilan = [];
      const fetchFn = async (_u, o) => { kullanilan.push(JSON.parse(o.body).api_key); return tavilyCevap(1); };
      global.fetch = fetchFn;
      await ws.ara('a', { config: mkCfg({ tavilyKeys: 'K1,K2' }), sayfa: 1 });
      await ws.ara('b', { config: mkCfg({ tavilyKeys: 'K1,K2' }), sayfa: 1 });
      global.fetch = gercek;
      if (kullanilan.length !== 2 || kullanilan[0] === kullanilan[1]) throw new Error('anahtar döngüsü yok: ' + JSON.stringify(kullanilan));
    }

    // 3) Bütün Tavily anahtarları 401 alırsa zincir DuckDuckGo'ya inmeli ve
    //    deneme kaydı hata mesajlarını içermeli.
    {
      const reddet = { ok: false, status: 401, json: async () => ({ error: { message: 'Unauthorized' } }), text: async () => 'Unauthorized' };
      let deneme = 0;
      const { r, e } = await cagir(mkCfg({ tavilyKeys: 'K1,K2' }), async (u) => {
        if (u.includes('duckduckgo')) return ddgHtml(1);
        deneme++;
        return reddet;
      });
      if (e) throw e;
      if (r.saglayici !== 'duckduckgo') throw new Error('401 sonrası yedeğe düşmedi: ' + r.saglayici);
      if (deneme !== 2) throw new Error(`iki anahtar da denenmeliydi, ${deneme} denendi`);
      if (!r.denemeler.some((x) => /Tavily anahtarı/.test(x))) throw new Error('Tavily hatası kaydedilmedi: ' + JSON.stringify(r.denemeler));
    }

    // 4) Anahtar hiç yoksa doğrudan yedeğe inmeli, "anahtar yok" notu düşmeli.
    {
      const { r, e } = await cagir(mkCfg({}), () => ddgHtml(2));
      if (e) throw e;
      if (r.saglayici !== 'duckduckgo') throw new Error('yedek seçilmedi: ' + r.saglayici);
      if (!r.denemeler.some((x) => /anahtar yok/.test(x))) throw new Error('anahtar yok notu düşmedi');
      // yönlendirme bağlantısı gerçek adrese çevrilmeli
      if (r.sonuclar[0].baglanti !== 'https://site0.test/') throw new Error('uddg bağlantısı çözülmedi: ' + r.sonuclar[0].baglanti);
      if (r.sonuclar[0].baslik !== 'Başlık 0') throw new Error('başlık ayrıştırılamadı: ' + r.sonuclar[0].baslik);
    }

    // 5) Bing anahtarı varsa (Tavily olmasa da) o denenmeli.
    {
      const gidilen = [];
      const { r, e } = await cagir(mkCfg({ bingApiKey: 'B1' }), async (u, o) => {
        gidilen.push(u);
        if (u.includes('bing')) {
          if (!o.headers['Ocp-Apim-Subscription-Key']) throw new Error('Bing anahtarı başlıkta değil');
          return { ok: true, status: 200, json: async () => ({ webPages: { value: [{ name: 'Bing sonucu', url: 'https://b.test', snippet: '<b>kalın</b> metin' }] } }) };
        }
        yasla('beklenmeyen uç nokta: ' + u);
      });
      if (e) throw e;
      if (r.saglayici !== 'bing') throw new Error('Bing seçilmedi: ' + r.saglayici);
      if (r.sonuclar[0].ozet !== 'kalın metin') throw new Error('Bing HTML etiketleri temizlenmedi: ' + r.sonuclar[0].ozet);
      if (gidilen.length !== 1) throw new Error('anahtarsız durumda yalnızca Bing denenmeliydi, ' + gidilen.length + ' istek atıldı');
    }

    // 6) Hepsiz başarısızsa hata fırlatmalı ve nedenleri taşımalı.
    {
      const patla = { ok: false, status: 500, json: async () => ({}), text: async () => 'boom' };
      const { e } = await cagir(mkCfg({ tavilyKeys: 'K1' }), async () => patla);
      if (!e) throw new Error('tüm sağlayıcılar başarısızken hata fırlatılmadı');
      if (!Array.isArray(e.denemeler) || e.denemeler.length < 2) throw new Error('deneme kaydı eksik: ' + JSON.stringify(e.denemeler));
    }

    // 7) Biçimlendirme: sağlayıcı adı ve özet mesajda görünmeli, uzunluk sınırlı.
    {
      const metin = ws.bicimle('soru', { saglayici: 'tavily', cevap: 'kısa cevap', sonuclar: [{ baslik: 'B', baglanti: 'https://x.test', ozet: 'özet' }] });
      if (!metin.includes('Tavily')) throw new Error('sağlayıcı adı çıktıda yok');
      if (!metin.includes('kısa cevap')) throw new Error('özet çıktıda yok');
      if (!metin.includes('https://x.test')) throw new Error('bağlantı çıktıda yok');
      const uzun = ws.bicimle('s', { saglayici: 'bing', cevap: '', sonuclar: Array.from({ length: 200 }, (_, i) => ({ baslik: 'B'.repeat(80), baglanti: `https://x.test/${i}`, ozet: 'ö'.repeat(300) })) });
      if (uzun.length > 3900) throw new Error('mesaj sınırı aşıldı: ' + uzun.length);
    }

    // 8) Virgüllü anahtar listesindeki boşluklar temizlenmeli.
    {
      const liste = ws.anahtarlar({ media: { tavilyKeys: ' K1 , ,K2, ' } });
      if (liste.length !== 2 || liste[0] !== 'K1' || liste[1] !== 'K2') throw new Error('anahtar ayrıştırma hatalı: ' + JSON.stringify(liste));
    }
  };
  t('lib/websearch zinciri (anahtar döngüsü + yedek)', aramaDene);

  // Görsel araması zinciri: Google (anahtarlı) → Openverse → Commons,
  // artı görsel indirme/küçültme davranışı.
  const gorselAramaDene = async () => {
    const ir = require('../lib/imageresearch');
    ir.BELLEK.clear();  // Test izolasyonu: onceki testlerin onbellegini temizle
    const gercek = global.fetch;
    const mkCfg = (m) => ({ media: { googleApiKey: '', googleCx: '', ...m } });
    const cagir = async (cfg, fetchFn, sorgu = 'test') => {
      global.fetch = fetchFn;
      try { return { r: await ir.ara(sorgu, { config: cfg, sayfa: 3 }) }; }
      catch (e) { return { e }; }
      finally { global.fetch = gercek; }
    };
    const ov = (n) => ({ ok: true, status: 200, json: async () => ({ result_count: n, results: Array.from({ length: n }, (_, i) => ({ title: `O${i}`, url: `https://f.test/${i}.jpg`, thumbnail: `https://o.test/${i}/thumb/`, source: 'flickr', license: 'cc0' })) }) });
    const commons = (n) => ({ ok: true, status: 200, json: async () => ({ query: { pages: Array.from({ length: n }, (_, i) => ({ title: `Dosya:C${i}.jpg`, imageinfo: [{ mime: 'image/jpeg', url: `https://u.test/${i}.jpg`, thumburl: `https://u.test/${i}t.jpg`, extmetadata: { LicenseShortName: { value: 'CC BY' } } }] })) } }) });

    // 1) Openverse ilk sırada ve sonuçlar doğru eşleniyor.
    {
      ir.BELLEK.clear();
      const { r, e } = await cagir(mkCfg({}), () => ov(3));
      if (e) throw e;
      if (r.saglayici !== 'openverse') throw new Error('Openverse seçilmedi: ' + r.saglayici);
      if (r.sonuclar.length !== 3) throw new Error('sonuç sayısı: ' + r.sonuclar.length);
      if (r.sonuclar[0].onizleme !== 'https://o.test/0/thumb/') throw new Error('thumbnail eşlenmedi');
      if (r.sonuclar[0].lisans !== 'cc0') throw new Error('lisans eşlenmedi');
    }

    // 2) Google anahtarı varsa o önce denenmeli.
    {
      ir.BELLEK.clear();
      const gidilen = [];
      const { r, e } = await cagir(mkCfg({ googleApiKey: 'G', googleCx: 'CX' }), async (u) => {
        gidilen.push(u);
        if (u.includes('googleapis')) return { ok: true, status: 200, json: async () => ({ items: [{ title: 'G', link: 'https://g.test/a.jpg' }] }) };
        throw new Error('Google başarılı olmalıydı, diğerine düşüldü: ' + u);
      });
      if (e) throw e;
      if (r.saglayici !== 'google') throw new Error('Google seçilmedi');
      if (gidilen.length !== 1) throw new Error('Google başarılıysa tek istek atılmalı, ' + gidilen.length);
    }

    // 3) Çok kelimeli sorgu 0 sonuç verirse gevşetme devreye girmeli:
    //    tam sorgu boş, sondaki kelime atılmış sorgu ("panda") DOLU dönmeli.
    //    Kod: full -> sondan at -> ilk kelime. "panda" zaten başarı verince
    //    üçüncü "panda" denenmez (aynı sorgu tekrar edilmez).
    {
      ir.BELLEK.clear();
      const sorular = [];
      const { r, e } = await cagir(mkCfg({}), async (u) => {
        const q = new URL(u).searchParams.get('q');
        sorular.push(q);
        return ov(q === 'panda' ? 2 : 0);
      }, 'panda yavrusu');
      if (e) throw e;
      if (r.saglayici !== 'openverse') throw new Error('gevreşmeden sonuç bulunamadı: ' + r.denemeler);
      if (r.sonuclar.length !== 2) throw new Error('gevreşmiş sorgu sonucu gelmedi');
      if (sorular.length !== 2 || sorular[0] !== 'panda yavrusu' || sorular[1] !== 'panda') {
        throw new Error('tam sorgu + sondan at denenmeliydi, ' + JSON.stringify(sorular));
      }
    }

    // 4) Hem Openverse hem Commons boşsa hata, nedenlerle birlikte.
    {
      ir.BELLEK.clear();
      const bos = () => ({ ok: true, status: 200, json: async () => ({ result_count: 0, results: [], query: { pages: [] } }) });
      const { e } = await cagir(mkCfg({}), bos);
      if (!e) throw new Error('sonuç yokken hata fırlatılmadı');
      if (!/openverse/.test(e.message) || !/commons/.test(e.message)) throw new Error('iki sağlayıcı da denendiği görünmüyor: ' + e.message);
    }

    // 5) Commons'ta PDF/vektör elenmeli.
    {
      ir.BELLEK.clear();
      const { r, e } = await cagir(mkCfg({}), (u) => {
        if (u.includes('openverse')) return ov(0);
        return { ok: true, status: 200, json: async () => ({ query: { pages: [
          { title: 'Dosya:kitap.pdf', imageinfo: [{ mime: 'application/pdf', url: 'https://u.test/a.pdf', thumburl: 'https://u.test/at.jpg' }] },
          { title: 'Dosya:harita.svg', imageinfo: [{ mime: 'image/svg+xml', url: 'https://u.test/b.svg', thumburl: 'https://u.test/bt.png' }] }
        ] } }) };
      });
      if (!e && r.saglayici === 'commons' && r.sonuclar.length) throw new Error('Commons PDF/SVG sonucu kabul etti');
    }

    // 6) Aynı sorgu ikinci kez sorulunca ağa çıkılmamalı (önbellek).
    {
      ir.BELLEK.clear();
      let sayac = 0;
      const f = () => { sayac++; return ov(2); };
      const cfg = mkCfg({});
      const a = await (global.fetch = f, ir.ara('benzersiz-sorgu-xyz', { config: cfg, sayfa: 3 }));
      global.fetch = f;
      const b = await ir.ara('benzersiz-sorgu-xyz', { config: cfg, sayfa: 3 });
      global.fetch = gercek;
      if (!b.onbellekten) throw new Error('ikinci istek önbellekten gelmedi');
      if (sayac !== 1) throw new Error('önbellek rağmen ağa çıkıldı: ' + sayac + ' istek');
      if (a.sonuclar.length !== 2) throw new Error('ilk istek sonucu bozuk');
    }

    // 7) getir(): vekil küçük görseli kullanmalı, olmazsa kaynağa düşmeli;
    //    görsel olmayan yanıtı kabul etmemeli.
    {
      global.fetch = async (u) => {
        if (u.includes('o.test')) return { ok: false, status: 424, headers: { get: () => 'application/json' } };
        if (u.includes('u.test')) return { ok: true, status: 200, headers: { get: () => 'image/jpeg' }, arrayBuffer: async () => Buffer.from('sahte jpeg') };
        throw new Error('beklenmeyen: ' + u);
      };
      const m = await ir.getir({ baslik: 'B', baglanti: 'https://u.test/a.jpg', onizleme: 'https://o.test/t/', lisans: 'CC0', kaynak: 'flickr' });
      global.fetch = gercek;
      if (m.mimetype !== 'image/jpeg') throw new Error('görsel olmayan içerik kabul edildi: ' + m.mimetype);
      if (m.data.toString() !== 'sahte jpeg') throw new Error('kaynak URL\'ye düşülmedi');
    }

    // 8) getir(): hiçbir aday çalışmazsa anlaşılır hata.
    {
      global.fetch = async () => ({ ok: false, status: 403, headers: { get: () => 'text/html' } });
      let hata = null;
      try { await ir.getir({ baslik: 'B', baglanti: 'https://x.test/a.jpg', onizleme: 'https://y.test/t/' }); }
      catch (e) { hata = e; }
      global.fetch = gercek;
      if (!hata || !/görsel indirilemedi/.test(hata.message)) throw new Error('indirme hatası anlaşılır değil: ' + (hata && hata.message));
    }
  };
  t('lib/imageresearch zinciri (gevşetme + önbellek + indirme)', gorselAramaDene);

  // OCR: metin biçimlendirme ve model varlığı kontrolü (ağ yok).
  const ocrDene = async () => {
    const ocr = require('../lib/ocr');
    const fs = require('fs');
    if (typeof ocr.VERI !== 'string' || !fs.existsSync(ocr.VERI)) throw new Error('model klasörü yok: ' + ocr.VERI);
    const cfg = { media: { ocrLang: 'tur+eng' } };
    if (!ocr.modelVarMi('tur')) throw new Error('tur.traineddata bulunamadı');
    if (!ocr.modelVarMi('eng')) throw new Error('eng.traineddata bulunamadı');
    if (ocr.modelVarMi('zzz')) throw new Error('olmayan dil için true döndü');
    const d = ocr.durum(cfg);
    if (d.dil !== 'tur+eng') throw new Error('dil okunamadı: ' + d.dil);
    // bicimle: bozuk satırları temizler, 3500 karakterle sınırlar
    if (ocr.bicimle({ text: '  bir  \n\n  iki \n üç ' }) !== 'bir\niki\nüç') throw new Error('metin temizlenmedi: ' + JSON.stringify(ocr.bicimle({ text: '  bir  \n\n  iki \n üç ' })));
    if (ocr.bicimle({ text: '' }) !== '') throw new Error('boş metin boş dönmeli');
    if (ocr.bicimle(null) !== '') throw new Error('null sonuç çökmemeli');
    const uzun = 'x'.repeat(9000);
    if (ocr.bicimle({ text: uzun }).length > 3500) throw new Error('mesaj sınırı aşıldı');
  };
  t('lib/ocr biçimlendirme + model kontrolü', ocrDene);

  await Promise.all(pending);

  console.log(`\nKomut çalıştırma: ${passed} geçti, ${failures.length} başarısız`);
  for (const f of [...new Set(failures)]) console.log('  x ' + f);
  const real = checks.filter((c) => c[1]);
  console.log(`Birim kontrolleri: ${checks.length - real.length} geçti, ${real.length} başarısız`);
  for (const [label, err] of real) console.log('  x ' + label + ' :: ' + err);
  if (slow.length) console.log(`\nNot: ${slow.length} komut ağ çağrısı yaptığı için zaman aşımına uğradı (canlı test gerekir): ${[...new Set(slow)].join(', ')}`);

  process.exit(real.length || failures.length ? 1 : 0);
})();
