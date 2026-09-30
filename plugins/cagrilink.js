// WhatsApp görüşme bağlantısı oluşturma.
module.exports = {
  name: ['cagrilink'],
  run: async ({ client, msg, chat, args }) => {
    const type = (args[0] || 'video').toLowerCase() === 'ses' || (args[0] || '').toLowerCase() === 'voice' ? 'voice' : 'video';
    const label = type === 'voice' ? 'sesli' : 'görüntülü';
    // Başlangıç zamanı 1 saat sonrasına sabitlenir; link paylaşıldığında hemen kullanılabilir olsun.
    const start = new Date(Date.now() + 3600000);
    const link = await client.createCallLink(start, type).catch((e) => {
      msg.reply(`Bağlantı oluşturulamadı: ${e.message}`);
      return null;
    });
    if (!link) return;
    return client.sendMessage(chat.id._serialized, `📞 ${label} görüşme bağlantısı:\n${link}\n\nBaşlangıç: ${start.toLocaleString('tr-TR')}`);
  }
};
