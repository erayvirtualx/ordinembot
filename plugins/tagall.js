module.exports = {
  name: 'tagall',
  group: true,
  admin: true,
  run: async ({ chat, args }) => {
    const ids = chat.participants.map((p) => p.id._serialized);
    const text = (args.join(' ') || '📢 Herkese duyuru') + '\n\n' + ids.map((i) => '@' + i.split('@')[0]).join(' ');
    await chat.sendMessage(text, { mentions: ids });
  }
};
