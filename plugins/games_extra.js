const chains = new Map();
const WORDS = ['araba', 'armut', 'atlas', 'at', 'tarak', 'kitap', 'papatya', 'ayna', 'aslan', 'nane', 'elma', 'avize', 'esnaf', 'fener', 'radyo', 'okul', 'limon', 'nar', 'rüzgar', 'resim', 'masa', 'ayna', 'ağaç', 'çanta', 'aralık', 'kedi', 'inek', 'kalem', 'makas', 'simit', 'toprak', 'kablo', 'orman', 'nehir', 'roket', 'tavşan', 'narenciye', 'yol', 'lale', 'ekmek', 'kavanoz', 'zeytin', 'nota', 'akşam', 'martı', 'ışık', 'kule', 'ev', 'vapur', 'rüya', 'yıldız', 'zürafa', 'ayva', 'aile', 'eldiven', 'nar', 'renk', 'kapı', 'ıslak', 'kış', 'şapka', 'ayna'];
const norm = (s) => (s || '').toLocaleLowerCase('tr').replace(/[^a-zçğıöşü]/g, '');
const last = (s) => [...s].at(-1);
const truth = ['En son söylediğin küçük yalan neydi?', 'Bu grupta en çok kiminle konuşuyorsun?', 'Kimsenin bilmediği bir yeteneğini anlat.', 'Telefonunda en son aradığın şeyi söyle.'];
const dare = ['30 saniye boyunca sadece emojilerle konuş.', 'Gruptan birine içten bir iltifat et.', 'Bir sonraki mesajını kafiyeli yaz.', 'Bugün dinlediğin şarkıyı paylaş.'];

module.exports = {
  name: ['zincirbaslat', 'zincir', 'zincirbitir', 'dogrulukcesaret', 'tas-kagit-makas'],
  group: true,
  run: async ({ msg, chat, cmd, args, db, senderNum }) => {
    const id = chat.id._serialized;
    if (cmd === 'zincirbaslat') {
      if (chains.has(id)) return msg.reply('Bu grupta zaten kelime zinciri oynanıyor.');
      const start = WORDS[Math.floor(Math.random() * WORDS.length)];
      chains.set(id, { last: last(norm(start)), used: new Set([norm(start)]), turns: 0 });
      return msg.reply(`🔗 Kelime zinciri başladı! İlk kelime: *${start}*\nSıradaki kelime “${last(norm(start))}” harfiyle başlamalı. .zincir <kelime>`);
    }
    if (cmd === 'zincirbitir') { if (!chains.delete(id)) return msg.reply('Aktif bir kelime zinciri yok.'); return msg.reply('Kelime zinciri bitirildi.'); }
    if (cmd === 'zincir') {
      const game = chains.get(id); if (!game) return msg.reply('Önce .zincirbaslat yaz.');
      const word = norm(args.join(' ')); if (word.length < 2) return msg.reply('En az iki harfli, tek kelime yaz.');
      if (game.used.has(word)) return msg.reply('Bu kelime daha önce kullanıldı.');
      if ([...word][0] !== game.last) return msg.reply(`Kelime “${game.last}” harfiyle başlamalı.`);
      game.used.add(word); game.last = last(word); game.turns += 1;
      if (game.turns >= 10) { chains.delete(id); const u = db.user(senderNum); u.balance += 3000; db.save(); return msg.reply(`🎉 Zincir 10 kelimeye ulaştı. Son kelime: *${word}*\n+3.000 TL`); }
      return msg.reply(`✅ *${word}* kabul edildi. Sıradaki kelime “${game.last}” ile başlamalı. (${game.turns}/10)`);
    }
    if (cmd === 'dogrulukcesaret') {
      const mode = (args[0] || '').toLowerCase();
      if (!['doğruluk', 'dogruluk', 'cesaret'].includes(mode)) return msg.reply('Kullanım: .dogrulukcesaret doğruluk|cesaret');
      const pool = mode === 'cesaret' ? dare : truth;
      return msg.reply(`${mode === 'cesaret' ? '🔥 Cesaret' : '🗣️ Doğruluk'}: ${pool[Math.floor(Math.random() * pool.length)]}`);
    }
    if (cmd === 'tas-kagit-makas') {
      const pick = (args[0] || '').toLocaleLowerCase('tr');
      const choices = ['taş', 'kağıt', 'makas']; if (!choices.includes(pick)) return msg.reply('Kullanım: .tas-kagit-makas taş|kağıt|makas');
      const bot = choices[Math.floor(Math.random() * 3)];
      const win = (pick === 'taş' && bot === 'makas') || (pick === 'kağıt' && bot === 'taş') || (pick === 'makas' && bot === 'kağıt');
      if (win) { db.user(senderNum).balance += 1000; db.save(); }
      return msg.reply(`Sen: ${pick} · Bot: ${bot}\n${pick === bot ? 'Berabere!' : win ? 'Kazandın! +1.000 TL' : 'Bu tur bot kazandı.'}`);
    }
  }
};
