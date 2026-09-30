const ACTIONS = {
  yumrukla: { verb: 'yumruk attı', emoji: '👊' },
  tekmele:  { verb: 'tekme attı',  emoji: '🦵' },
  tokat:    { verb: 'tokat attı',  emoji: '✋' },
  oldur:    { verb: 'öldürdü (şakadan tabii ki 😄)', emoji: '💀' },
  sarilma:  { verb: 'sarıldı',     emoji: '🤗' },
  optu:     { verb: 'öptü',        emoji: '😘' }
};

module.exports = {
  name: Object.keys(ACTIONS),
  run: async ({ msg, cmd, sender, senderNum }) => {
    const target = (await msg.getMentions())[0];
    if (!target) return msg.reply(`Kullanım: .${cmd} @kişi`);
    const a = ACTIONS[cmd];
    return msg.reply(`${a.emoji} @${senderNum} @${target.id.user}'i ${a.verb}!`, { mentions: [sender, target.id._serialized] });
  }
};
