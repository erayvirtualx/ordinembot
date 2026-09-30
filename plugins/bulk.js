// Toplu mesajlaşma: .stam (alıntılanan mesajı herkese özelden at), .herkes, .toplumsil
const broadcast = require('../lib/broadcast');
const { getTargetMedia } = require('../lib/media');

module.exports = {
  name: ['stam', 'herkes', 'toplumsil', 'iptalstam'],
  // .herkes tüm kayıtlı kullanıcılara gönderir (hesap geneli) → sahip.
  // .stam / .toplumsil / .iptalstam grup bağlamlı moderasyon → grup yöneticisi.
  perm: {
    stam: 'admin',
    herkes: 'owner',
    toplumsil: 'admin',
    iptalstam: 'admin'
  },
  run: async ({ client, msg, chat, cmd, args, db, config, senderNum }) => {
    const running = broadcast.isRunning(senderNum);
    if (running && cmd !== 'toplumsil') return msg.reply(`⏳ Zaten bir gönderim çalışıyor (${running.sent}/${running.total}). İptal: .iptalstam`);

    if (cmd === 'toplumsil') {
      if (!msg.hasQuotedMsg) return msg.reply('Kullanım: temizlemek istediğin mesajı alıntılayıp .toplumsil yaz.');
      const quoted = await msg.getQuotedMessage();
      await quoted.delete(true).catch((e) => msg.reply(`Silinemedi: ${e.message}`));
      return msg.reply('🧹 Mesaj herkes için silindi.');
    }

    if (cmd === 'iptalstam') {
      const job = broadcast.isRunning(senderNum);
      if (!job) return msg.reply('Çalışan gönderim yok.');
      broadcast.cancel(job.id);
      return msg.reply('🛑 Gönderim iptal ediliyor…');
    }

    if (cmd === 'herkes') {
      const text = args.join(' ').trim();
      if (!text) return msg.reply('Kullanım: .herkes [sınır] <mesaj>');
      // İsteğe bağlı üst sınır: .herkes 500 <mesaj>
      const limit = /^\d+$/.test(args[0]) && args.length > 1 ? parseInt(args[0], 10) : null;
      const body = (limit ? args.slice(1) : args).join(' ').trim();
      if (!body) return msg.reply('Kullanım: .herkes [sınır] <mesaj>');
      const all = broadcast.targets(db, client).length;
      const r = await broadcast.blast({ client, db, config, ownerNum: senderNum, content: body, limit });
      if (!r.started) return msg.reply('Zaten bir gönderim çalışıyor.');
      const scope = limit ? `Sınır: ${limit} (kayıtlı ${all})` : `Veritabanında kayıtlı ${all} kullanıcı`;
      const more = r.truncated ? `\n⚠️ Tek çalıştırmada en fazla ${config.broadcastMaxPerRun} kişiye gönderilir; ${r.available - r.total} kişi için komutu tekrar çalıştır.` : '';
      return msg.reply(`📨 Gönderim bitti.\nHedef: ${r.total}\nBaşarılı: ${r.sent}\nBaşarısız: ${r.failed}\nSüre: ${r.seconds} sn${r.cancelled ? '\n⚠️ İptal edildi.' : ''}\n\n${scope}${more}`);
    }

    // .stam — alıntılanan mesajın içeriğini herkese özelden gönderir.
    const quoted = msg.hasQuotedMsg ? await msg.getQuotedMessage() : null;
    const text = (quoted?.body || args.join(' ')).trim();
    if (!quoted && !text) return msg.reply('Bir mesajı alıntıla veya metin yaz: .stam <mesaj>');

    let content = text;
    if (quoted && quoted.hasMedia) {
      const media = await getTargetMedia(quoted).catch(() => null);
      if (media) content = { media, caption: text || undefined };
    }

    const count = broadcast.targets(db, client).length;
    await msg.reply(`📤 ${Math.min(count, config.broadcastMaxPerRun)} kullanıcıya gönderiliyor… (iptal: .iptalstam)`);
    const r = await broadcast.blast({ client, db, config, ownerNum: senderNum, content });
    const more = r.truncated ? `\n⚠️ ${r.available - r.total} kişi daha var; tek çalıştırmada en fazla ${config.broadcastMaxPerRun} kişiye gönderilir.` : '';
    return msg.reply(`📨 Gönderim bitti.\nHedef: ${r.total}\nBaşarılı: ${r.sent}\nBaşarısız: ${r.failed}\nSüre: ${r.seconds} sn${r.cancelled ? '\n⚠️ İptal edildi.' : ''}${more}`);
  }
};
