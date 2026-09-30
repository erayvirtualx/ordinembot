const memory = new Map(); // senderNum -> mesaj geçmişi
const { complete } = require('../lib/ai');
const CHARACTERS = require('../lib/characters');
const persona = (user, config) => `${config.personalities[user.personality || 'normal']}${CHARACTERS[user.character] ? ` ${CHARACTERS[user.character]}` : ''}`;

module.exports = {
  name: ['ai', 'sifirla', 'kisilik', 'ceviri', 'ozet', 'resimai'],
  run: async ({ msg, args, cmd, senderNum, db, config }) => {
    if (cmd !== 'kisilik' && cmd !== 'sifirla') {
      // Anahtar gerektiren komutlar havuzda gerçekten bir şey var mı diye bakar.
      // Gemini anahtarsız da çalıştığı için "anahtar yok" uyarısı vermeyiz.
      const havuz = config.ai.havuz || [];
      const anahtarli = havuz.filter((p) => p.anahtarlar.length);
      if (!havuz.length) return msg.reply('Yapay zekâ ayarlı değil. .env dosyasına en az bir anahtar ekle (örn. `GROQ_KEYS=...`).');
      if (!anahtarli.length) return msg.reply('Havuzdaki tek sağlayıcı anahtarsız çalışan Gemini ve şu an cevap vermiyor.');
    }
    const u = db.user(senderNum);

    if (cmd === 'sifirla') { memory.delete(senderNum); return msg.reply('Konuşma geçmişin silindi.'); }

    if (cmd === 'kisilik') {
      const opt = (args[0] || '').toLowerCase();
      const list = Object.keys(config.personalities);
      if (!list.includes(opt)) return msg.reply(`Kullanım: .kisilik <${list.join('|')}>`);
      u.personality = opt; db.save();
      return msg.reply(`🎭 Kişilik: *${opt}* olarak ayarlandı.`);
    }

    if (cmd === 'ai') {
      const q = args.join(' ');
      if (!q) return msg.reply('Kullanım: .ai <soru>');
      const system = persona(u, config);
      const hist = memory.get(senderNum) || [];
      hist.push({ role: 'user', content: q });
      let text;
      try { text = (await complete(config, system, hist.slice(-10).map((m) => ({ ...m })))).metin; }
      catch (e) { hist.pop(); return msg.reply(`AI yanıt vermedi: ${e.message}`); }
      hist.push({ role: 'assistant', content: text });
      memory.set(senderNum, hist.slice(-10));
      return msg.reply(text);
    }

    if (cmd === 'resimai') {
      const m = msg.hasMedia ? msg : msg.hasQuotedMsg ? await msg.getQuotedMessage() : null;
      if (!m || !m.hasMedia) return msg.reply('Bir resim gönder ya da yanıtla, sonra .resimai <soru (opsiyonel)>');
      const media = await m.downloadMedia();
      if (!media.mimetype.startsWith('image/')) return msg.reply('Sadece resim analiz edebilirim.');
      const question = args.join(' ') || 'Bu görselde ne var, kısaca anlat.';
      const content = [
        { type: 'image', source: { type: 'base64', media_type: media.mimetype, data: media.data } },
        { type: 'text', text: question }
      ];
      const prompt = args.join(' ') || 'Bu görselde ne var, kısaca anlat.';
      try { return msg.reply((await complete(config, `${persona(u, config)} Kısa cevap ver.`, [{ role: 'user', content: prompt }], { image: { mimetype: media.mimetype, data: media.data } })).metin); }
      catch (e) { return msg.reply(`Görsel analizi yapılamadı: ${e.message}`); }
    }

    if (cmd === 'ceviri' || cmd === 'ozet') {
      let text = args.join(' ');
      if (!text && msg.hasQuotedMsg) { const q = await msg.getQuotedMessage(); text = q.body; }
      if (!text) return msg.reply(`Kullanım: .${cmd} <metin>  ya da bir mesajı yanıtlayarak .${cmd} yaz`);
      if (cmd === 'ceviri') {
        const target = args[0] && args[0].length <= 3 ? args.shift() : 'en';
        try { return msg.reply((await complete(config, `Metni ${target} diline çevir, sadece çeviriyi yaz.`, [{ role: 'user', content: text }])).metin); }
        catch (e) { return msg.reply(`Çeviri yapılamadı: ${e.message}`); }
      }
      try { return msg.reply((await complete(config, 'Verilen metni Türkçe olarak 2-3 cümlede özetle.', [{ role: 'user', content: text }])).metin); }
      catch (e) { return msg.reply(`Özet yapılamadı: ${e.message}`); }
    }
  }
};
