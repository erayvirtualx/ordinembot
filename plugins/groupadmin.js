module.exports = {
  name: ['promote', 'demote', 'kick', 'ban'],
  group: true,
  admin: true,
  run: async ({ msg, chat, cmd }) => {
    let ids = (await msg.getMentions()).map((c) => c.id._serialized);
    if (!ids.length && msg.hasQuotedMsg) ids = [(await msg.getQuotedMessage()).author];
    if (!ids.length) return msg.reply('Birini etiketle veya mesajını yanıtla.');
    try {
      if (cmd === 'promote') await chat.promoteParticipants(ids);
      else if (cmd === 'demote') await chat.demoteParticipants(ids);
      else await chat.removeParticipants(ids);
      msg.reply('Tamam ✅');
    } catch { msg.reply('Olmadı, bot yönetici mi?'); }
  }
};
