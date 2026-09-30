const CHARACTERS = require('../lib/characters');

module.exports = {
  name: ['character', 'setchar'],
  run: async ({ msg, args, senderNum, db }) => {
    const action = (args[0] || '').toLowerCase();
    if (action === 'list' || !action) return msg.reply(`🎭 *Karakterler*\n${Object.keys(CHARACTERS).join(', ')}\n\nSeçmek için: .character set <ad>`);
    const name = (action === 'set' ? args[1] : action || '').toLowerCase();
    if (!CHARACTERS[name]) return msg.reply('Karakter bulunamadı. .character list');
    db.user(senderNum).character = name; db.save();
    return msg.reply(`🎭 Karakterin ${name} olarak ayarlandı.`);
  }
};
