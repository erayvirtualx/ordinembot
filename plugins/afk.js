module.exports = {
  name: 'afk',
  run: async ({ msg, args, senderNum, db }) => {
    const u = db.user(senderNum);
    u.afk = { reason: args.join(' ') || 'Belirtilmedi', since: Date.now() };
    db.save();
    return msg.reply(`💤 AFK moduna geçtin. Sebep: ${u.afk.reason}`);
  }
};
