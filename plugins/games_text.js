const WORDS = ['bilgisayar', 'telefon', 'kalem', 'masa', 'pencere', 'otobüs', 'kitap', 'gitar', 'orman', 'deniz', 'yildiz', 'köpek', 'kelebek'];
const norm = (s) => (s || '').toLocaleLowerCase('tr').replace(/i̇/g, 'i');

const hangman = new Map();   // chatId -> { word, guessed:Set, wrong, reward }
const quiz = new Map();      // chatId -> { q, a, reward }
const xo = new Map();        // chatId -> { board, turn, players:[a,b] }

function renderHangman(g) {
  return [...g.word].map((c) => (g.guessed.has(c) ? c : '_')).join(' ');
}
function xoBoard(b) {
  const s = (i) => b[i] || String(i + 1);
  return `${s(0)} | ${s(1)} | ${s(2)}\n---------\n${s(3)} | ${s(4)} | ${s(5)}\n---------\n${s(6)} | ${s(7)} | ${s(8)}`;
}
function xoWinner(b) {
  const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b1,c] of L) if (b[a] && b[a] === b[b1] && b[a] === b[c]) return b[a];
  return b.every(Boolean) ? 'berabere' : null;
}

module.exports = {
  name: ['adamasmaca', 'tahmin', 'quiz', 'xo', 'oyna', 'oyuniptal'],
  group: true,
  run: async ({ msg, chat, cmd, args, sender, senderNum, db }) => {
    const cid = chat.id._serialized;
    const u = db.user(senderNum);

    if (cmd === 'oyuniptal') {
      hangman.delete(cid); quiz.delete(cid); xo.delete(cid);
      return msg.reply('🛑 Bu gruptaki aktif oyunlar iptal edildi.');
    }

    // ---- Adam asmaca ----
    if (cmd === 'adamasmaca') {
      if (hangman.has(cid)) return msg.reply(`Zaten devam eden bir adam asmaca var:\n${renderHangman(hangman.get(cid))}`);
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      hangman.set(cid, { word, guessed: new Set(), wrong: 0, reward: 5000 + word.length * 1000 });
      return msg.reply(`🔤 *Adam Asmaca* başladı! (${word.length} harf)\n${renderHangman(hangman.get(cid))}\n\nHarf ya da kelime tahmini: .tahmin <harf|kelime>`);
    }
    if (cmd === 'tahmin' && hangman.has(cid)) {
      const g = hangman.get(cid);
      const guess = norm(args.join(''));
      if (!guess) return msg.reply('Kullanım: .tahmin <harf|kelime>');
      if (guess.length > 1) {
        if (guess === g.word) { hangman.delete(cid); u.balance += g.reward; db.save(); return msg.reply(`🎉 Doğru! Kelime: *${g.word}*\n+${g.reward} TL`); }
        g.wrong++; 
      } else {
        if (g.word.includes(guess)) g.guessed.add(guess); else g.wrong++;
      }
      if (![...g.word].some((c) => !g.guessed.has(c))) {
        hangman.delete(cid); u.balance += g.reward; db.save();
        return msg.reply(`🎉 Kazandın! Kelime: *${g.word}*\n+${g.reward} TL`);
      }
      if (g.wrong >= 6) { hangman.delete(cid); return msg.reply(`💀 Kaybettiniz! Kelime: *${g.word}*`); }
      return msg.reply(`${renderHangman(g)}\nYanlış: ${g.wrong}/6`);
    }

    // ---- Quiz ----
    if (cmd === 'quiz') {
      if (quiz.has(cid)) return msg.reply(`Zaten aktif bir quiz var: ${quiz.get(cid).q}`);
      const bank = require('../config').quiz;
      const [q, a] = bank[Math.floor(Math.random() * bank.length)];
      quiz.set(cid, { q, a, reward: 8000 });
      return msg.reply(`🧠 *Quiz!*\n${q}\n\nCevap için mesaj at (ilk doğru kazanır).`);
    }

    // ---- XO ----
    if (cmd === 'xo') {
      if (xo.has(cid)) return msg.reply('Bu grupta zaten bir XO oyunu var. .oyuniptal ile bitir.');
      const opp = (await msg.getMentions())[0];
      if (!opp) return msg.reply('Kullanım: .xo @rakip');
      xo.set(cid, { board: Array(9).fill(null), turn: sender, players: [sender, opp.id._serialized] });
      return msg.reply(`⭕ *XO* başladı!\n@${sender.split('@')[0]}: ❌  |  @${opp.id.user}: ⭕\n\n${xoBoard(Array(9).fill(null))}\n\nSıra: @${sender.split('@')[0]} — .oyna <1-9>`, { mentions: [sender, opp.id._serialized] });
    }
    if (cmd === 'oyna' && xo.has(cid)) {
      const g = xo.get(cid);
      if (!g.players.includes(sender)) return msg.reply('Bu oyunda değilsin.');
      if (g.turn !== sender) return msg.reply('Sıra sende değil.');
      const pos = parseInt(args[0]) - 1;
      if (isNaN(pos) || pos < 0 || pos > 8 || g.board[pos]) return msg.reply('Geçersiz hamle. 1-9 arası boş bir kutu seç.');
      g.board[pos] = sender === g.players[0] ? '❌' : '⭕';
      const win = xoWinner(g.board);
      if (win) {
        xo.delete(cid);
        if (win === 'berabere') return msg.reply(`${xoBoard(g.board)}\n\n🤝 Berabere!`);
        const winnerId = win === '❌' ? g.players[0] : g.players[1];
        db.user(winnerId.split('@')[0]).balance += 10000; db.save();
        return msg.reply(`${xoBoard(g.board)}\n\n🏆 @${winnerId.split('@')[0]} kazandı! +10.000 TL`, { mentions: [winnerId] });
      }
      g.turn = g.players.find((p) => p !== sender);
      return msg.reply(`${xoBoard(g.board)}\n\nSıra: @${g.turn.split('@')[0]}`, { mentions: [g.turn] });
    }
  }
};

module.exports.checkQuizAnswer = async (msg, chat, senderNum, db) => {
  const cid = chat.id._serialized;
  if (!quiz.has(cid)) return false;
  const g = quiz.get(cid);
  if (norm(msg.body) !== norm(g.a)) return false;
  quiz.delete(cid);
  const u = db.user(senderNum);
  u.balance += g.reward; db.save();
  await msg.reply(`✅ Doğru cevap: *${g.a}*\n+${g.reward} TL kazandın!`);
  return true;
};
