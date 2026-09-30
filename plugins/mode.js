module.exports = {
  name: ['mode', 'sudo', 'unsudo', 'botban', 'botunban'],
  owner: true,
  run: async ({ msg, args, cmd, db }) => {
    if (cmd === 'mode') {
      if (!['public', 'private'].includes(args[0])) return msg.reply('Kullanım: .mode public | private');
      db.data.settings.mode = args[0];
      db.save();
      return msg.reply(`Mod: *${args[0]}*`);
    }
    const target = (await msg.getMentions())[0]?.id.user || args[0];
    if (!target) return msg.reply('Birini etiketle veya numara yaz.');
    const list = cmd.includes('sudo') ? db.data.sudo : db.data.banned;
    if (cmd === 'sudo' || cmd === 'botban') { if (!list.includes(target)) list.push(target); }
    else if (list.includes(target)) list.splice(list.indexOf(target), 1);
    db.save();
    msg.reply('Tamam ✅');
  }
};
