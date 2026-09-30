module.exports = {
  name: 'creator',
  run: async ({ msg, config }) =>
    msg.reply(`👑 *${config.creatorName}*\n📞 wa.me/${config.owner}`)
};
