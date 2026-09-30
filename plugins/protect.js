// Grup koruma anahtarları: mevcut olanlar + antitag, autoread, autotyping, pmblocker
module.exports = {
  name: ['antilink', 'anticaps', 'antispam', 'antiflood', 'antibot', 'antibadword', 'warnlimit', 'welcome',
    'antitag', 'autoread', 'autotyping', 'pmblocker'],
  group: true,
  admin: true,
  run: async ({ msg, chat, cmd, args, db }) => {
    const g = db.group(chat.id._serialized);

    if (cmd === 'warnlimit') {
      const n = parseInt(args[0], 10);
      if (!n || n < 1) return msg.reply('Kullanım: .warnlimit <1-20>');
      g.warnLimit = Math.min(n, 20);
      db.save();
      return msg.reply(`Uyarı limiti: ${g.warnLimit}`);
    }

    if (cmd === 'welcome') {
      const option = (args[0] || '').toLowerCase();
      if (option === 'on' || option === 'off') { g.welcomeEnabled = option === 'on'; db.save(); return msg.reply(`Hoş geldin mesajı: ${option}`); }
      g.welcome = args.join(' ') || g.welcome; db.save();
      return msg.reply(`Hoş geldin mesajı güncellendi:\n${g.welcome}`);
    }

    const LABELS = {
      antitag: 'Toplu etiketleme engeli',
      autoread: 'Otomatik okundu işaretleme',
      autotyping: 'Yazıyor simülasyonu',
      pmblocker: 'Özel mesaj engeli'
    };

    if (!['on', 'off'].includes(args[0])) {
      const keys = ['antilink', 'anticaps', 'antispam', 'antiflood', 'antibot', 'antibadword', 'antitag', 'autoread', 'autotyping', 'pmblocker'];
      const list = keys.map((k) => `${g[k] ? '✅' : '❌'} ${LABELS[k] || k}`).join('\n');
      return msg.reply(`🛡️ *Koruma durumu*\n${list}\n\nAç/kapat: .${cmd} on | off\nUyarı limiti: ${g.warnLimit || 3}`);
    }

    const setting = cmd === 'antibadword' ? 'antiBadword' : cmd;
    g[setting] = args[0] === 'on';
    db.save();
    const extra = cmd === 'pmblocker' && g.pmblocker ? '\n\nℹ️ Yalnızca gruplarda kullanılan botlara özel mesajlar engellenir.' : '';
    return msg.reply(`${LABELS[cmd] || cmd}: ${g[setting] ? 'açık ✅' : 'kapalı ❌'}${extra}`);
  }
};
