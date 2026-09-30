// Medya indirme ayarları: otomatik indirme ve arka plan senkronizasyonu.
const applyAuto = async (client, flag) => {
  await Promise.all([
    client.setAutoDownloadAudio(flag).catch(() => {}),
    client.setAutoDownloadPhotos(flag).catch(() => {}),
    client.setAutoDownloadVideos(flag).catch(() => {}),
    client.setAutoDownloadDocuments(flag).catch(() => {})
  ]);
};

module.exports = {
  name: ['otoindir', 'arkaplan'],
  // Grupta kullanılınca grup ayarı, özelde kullanılınca hesap geneli ayar olur.
  // admin seviyesi ikisini de doğru kapatır: grupta yönetici, özelde sahip/sudo.
  admin: true,
  run: async ({ client, msg, chat, cmd, args, db }) => {
    const g = chat.isGroup ? db.group(chat.id._serialized) : db.data.settings;
    const key = cmd === 'otoindir' ? 'autoDownload' : 'backgroundSync';
    const on = args[0] === 'on';
    const off = args[0] === 'off';

    if (cmd === 'otoindir') {
      if (!on && !off) return msg.reply(`Otomatik indirme: ${g.autoDownload ? 'açık' : 'kapalı'}\nKullanım: .otoindir on | off\n\nGrupta paylaşılan medya bağlantıları otomatik indirilir.`);
      g.autoDownload = on;
      db.save();
      if (!chat.isGroup) await applyAuto(client, on);
      return msg.reply(`📥 Otomatik indirme: ${on ? 'açık' : 'kapalı'}`);
    }

    if (!on && !off) return msg.reply(`Arka plan senkronizasyonu: ${g.backgroundSync ? 'açık' : 'kapalı'}\nKullanım: .arkaplan on | off\n\n⚠️ Değişiklik yeniden başlatmada etkinleşir.`);
    g.backgroundSync = on;
    db.save();
    if (!chat.isGroup) await client.setBackgroundSync(on).catch((e) => msg.reply(`Uyarı: ${e.message}`));
    return msg.reply(`🔄 Arka plan senkronizasyonu: ${on ? 'açık' : 'kapalı'}${chat.isGroup ? '' : '\n(Yeniden başlatınca tam olarak uygulanır.)'}`);
  }
};
