// Bot profil bilgileri: fotoğraf, durum (bio) ve görünen ad.
module.exports = {
  name: ['botpp', 'botppsil', 'botbio', 'botisim'],
  owner: true,
  run: async ({ client, msg, cmd, args }) => {
    if (cmd === 'botpp') {
      const media = await msg.downloadMedia().catch(() => null);
      if (!media) return msg.reply('Bir fotoğrafa yanıt ver veya fotoğraf gönderip .botpp yaz.');
      const ok = await client.setProfilePicture(media);
      return msg.reply(ok ? '🖼️ Profil fotoğrafı güncellendi.' : 'Fotoğraf güncellenemedi.');
    }
    if (cmd === 'botppsil') {
      const ok = await client.deleteProfilePicture();
      return msg.reply(ok ? '🗑️ Profil fotoğrafı silindi.' : 'Silinemedi.');
    }
    if (cmd === 'botbio') {
      const text = args.join(' ').trim();
      if (!text) return msg.reply('Kullanım: .botbio <durum metni>');
      await client.setStatus(text.slice(0, 139));
      return msg.reply('✅ Durum güncellendi.');
    }
    if (cmd === 'botisim') {
      const text = args.join(' ').trim();
      if (!text) return msg.reply('Kullanım: .botisim <yeni isim>');
      const ok = await client.setDisplayName(text);
      return msg.reply(ok ? `✅ İsim "${text}" olarak ayarlandı.` : 'İsim değiştirilemedi.');
    }
  }
};
