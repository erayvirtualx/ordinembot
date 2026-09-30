// Grup oluşturma.
module.exports = {
  name: ['grupolustur'],
  owner: true,
  run: async ({ client, msg, args }) => {
    const title = args[0];
    if (!title) return msg.reply('Kullanım: .grupolustur <grup adı> @kişi1 @kişi2 ...');

    const mentions = await msg.getMentions();
    const ids = mentions.map((m) => m.id._serialized);
    const extra = args.slice(1).filter((a) => /^\+?\d{10,15}$/.test(a.replace(/[\s-]/g, '')))
      .map((a) => a.replace(/\D/g, '') + '@c.us');
    const participants = [...new Set([...ids, ...extra])];

    if (!participants.length) return msg.reply('En az bir kişi etiketlemelisin veya numara yazmalısın.');

    const result = await client.createGroup(title, participants).catch((e) => {
      msg.reply(`Grup oluşturulamadı: ${e.message}`);
      return null;
    });
    if (!result) return;

    const gid = typeof result === 'string' ? result : result.gid?._serialized;
    const added = typeof result === 'object' ? Object.keys(result.participants || {}).length : participants.length;
    return msg.reply(`✅ *${title}* oluşturuldu.\n${added} kişi eklendi.\n${gid}`);
  }
};
