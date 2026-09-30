module.exports = {
  name: ['not', 'notlar', 'notsil'],
  run: async ({ msg, cmd, args, senderNum, db }) => {
    const u = db.user(senderNum);
    if (cmd === 'notlar') {
      if (!u.notes.length) return msg.reply('📝 Not defterin boş. Eklemek için: .not <metin>');
      return msg.reply('📝 *Notların*\n' + u.notes.map((n, i) => `${i + 1}. ${n}`).join('\n'));
    }
    if (cmd === 'notsil') {
      const i = parseInt(args[0]) - 1;
      if (isNaN(i) || !u.notes[i]) return msg.reply('Kullanım: .notsil <numara>');
      u.notes.splice(i, 1); db.save();
      return msg.reply('🗑️ Not silindi.');
    }
    const text = args.join(' ');
    if (!text) return msg.reply('Kullanım: .not <metin>  (listelemek için .notlar)');
    u.notes.push(text); db.save();
    return msg.reply(`✅ Not eklendi (#${u.notes.length}).`);
  }
};
