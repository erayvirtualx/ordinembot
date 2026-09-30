const fs = require('fs');

module.exports = {
  name: ['durum', 'abone', 'abonelikiptal', 'duyuru', 'broadcast', 'yedekle', 'yedekgeri', 'otoyedek',
    'hatirlat', 'hatirlatmalarim'],
  // Kişisel komutlar herkese açık; hesap geneli ve veri işlemleri sahibe.
  perm: {
    durum: 'admin',
    abone: 'all', abonelikiptal: 'all',
    hatirlat: 'all', hatirlatmalarim: 'all',
    duyuru: 'owner', broadcast: 'owner', yedekle: 'owner', yedekgeri: 'owner', otoyedek: 'owner'
  },
  run: async ({ client, msg, chat, cmd, args, senderNum, sender, db, config }) => {
    if (cmd === 'durum') {
      const up = process.uptime();
      const h = Math.floor(up / 3600), m = Math.floor((up % 3600) / 60);
      const mem = process.memoryUsage().rss / 1024 / 1024;
      let chats = 0;
      try { chats = (await client.getChats()).length; } catch {}
      return msg.reply(`📊 *${config.botName} Durumu*\n⏱️ Çalışma süresi: ${h}sa ${m}dk\n💾 RAM: ${mem.toFixed(0)} MB\n💬 Sohbet sayısı: ${chats}\n👥 Kayıtlı kullanıcı: ${Object.keys(db.data.users).length}`);
    }

    if (cmd === 'abone' || cmd === 'abonelikiptal') {
      const n = senderNum;
      if (cmd === 'abone') { if (!db.data.subscribers.includes(n)) db.data.subscribers.push(n); db.save(); return msg.reply('🔔 Duyurulara abone oldun.'); }
      db.data.subscribers = db.data.subscribers.filter((x) => x !== n); db.save();
      return msg.reply('🔕 Abonelik iptal edildi.');
    }

    if (cmd === 'duyuru') {
      const text = args.join(' ');
      if (!text) return msg.reply('Kullanım: .duyuru <mesaj>  (sadece .abone olanlara gider)');
      let sent = 0;
      for (const num of db.data.subscribers) {
        await client.sendMessage(`${num}@c.us`, `📢 *Duyuru*\n${text}`).catch(() => {});
        sent++;
      }
      return msg.reply(`✅ ${sent} kişiye gönderildi.`);
    }

    if (cmd === 'broadcast') {
      const text = args.join(' ').trim(); if (!text) return msg.reply('Kullanım: .broadcast <mesaj>');
      const chats = (await client.getChats()).filter((x) => x.isGroup);
      let sent = 0;
      for (const target of chats) {
        try { await target.sendMessage(`📢 *Duyuru*\n${text.slice(0, 3500)}`); sent += 1; }
        catch {}
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      db.data.logs.push({ at: Date.now(), kind: 'broadcast', groups: chats.length, sent }); db.save();
      return msg.reply(`📢 ${sent}/${chats.length} gruba duyuru gönderildi.`);
    }

    if (cmd === 'yedekle') {
      const { MessageMedia } = require('whatsapp-web.js');
      if (!fs.existsSync('./data.json')) return msg.reply('Henüz veri yok.');
      const media = await MessageMedia.fromFilePath('./data.json');
      return client.sendMessage(msg.from, media, { sendMediaAsDocument: true, filename: `wabot-yedek-${new Date().toISOString().slice(0, 10)}.json`, caption: '💾 Veritabanı yedeği' });
    }

    if (cmd === 'yedekgeri') {
      const quoted = msg.hasQuotedMsg ? await msg.getQuotedMessage() : null;
      if (!quoted || !quoted.hasMedia) return msg.reply('Yedek dosyasını alıntılayıp .yedekgeri yaz.');
      const media = await quoted.downloadMedia();
      const buf = Buffer.from(media.data, 'base64');
      let parsed;
      try { parsed = JSON.parse(buf.toString('utf8')); } catch { return msg.reply('Dosya okunamadı: geçerli bir JSON yedeği değil.'); }
      if (!parsed.users || !parsed.groups) return msg.reply('Yedek şeması uyuşmuyor (users/groups alanları yok). Mevcut veri korundu.');
      // Mevcut veriyi yedekliyoruz, sonra değiştiriyoruz.
      const before = await MessageMedia.fromFilePath('./data.json').catch(() => null);
      // db.replace() içteki `data` değişkenini yerinde günceller; `db.data = ...`
      // yazsaydık save() eski veriyi diske yazmaya devam ederdi.
      db.replace(parsed);
      db.save();
      await msg.reply(`✅ Yedek geri yüklendi.\nKullanıcı: ${Object.keys(parsed.users).length} · Grup: ${Object.keys(parsed.groups).length}`);
      if (before) await client.sendMessage(msg.from, before, { sendMediaAsDocument: true, filename: 'geri-yukleme-oncesi.json', caption: '↩️ Geri yükleme öncesi veritabanı' });
      return;
    }

    if (cmd === 'otoyedek') {
      const dir = './backups';
      if (args[0] === 'durum') {
        if (!fs.existsSync(dir)) return msg.reply('⏱️ Otomatik yedek kapalı.');
        const files = fs.readdirSync(dir).sort().reverse();
        return msg.reply(`⏱️ Otomatik yedek: açık\nSon: ${files[0] || '—'}\nToplam: ${files.length} dosya`);
      }
      if (args[0] === 'off') { db.data.settings.autoBackup = false; db.save(); return msg.reply('⏱️ Otomatik yedek kapatıldı.'); }
      const every = require('../lib/duration').parseDuration(args[0]);
      if (!every) return msg.reply('Kullanım: .otoyedek <süre> | .otoyedek off | .otoyedek durum\nÖrnek: .otoyedek 6sa');
      db.data.settings.autoBackup = { everyMs: every };
      db.save();
      return msg.reply(`⏱️ Otomatik yedek: her ${args[0]} (${dir}/ klasörüne)`);
    }

    if (cmd === 'hatirlat') {
      const ms = require('../lib/duration').parseDuration(args[0]);
      const text = args.slice(1).join(' ');
      if (!ms || !text) return msg.reply('Kullanım: .hatirlat <süre örn: 30m|2sa|1g> <mesaj>');
      db.data.reminders.push({ at: Date.now() + ms, chatId: chat.id._serialized, userId: sender, text });
      db.save();
      return msg.reply(`⏰ Hatırlatma kuruldu: ${args[0]} sonra "${text}"`);
    }
    if (cmd === 'hatirlatmalarim') {
      const mine = db.data.reminders.filter((r) => r.userId === sender);
      if (!mine.length) return msg.reply('Bekleyen hatırlatman yok.');
      return msg.reply('⏰ *Hatırlatmaların*\n' + mine.map((r) => `• ${Math.round((r.at - Date.now()) / 60000)}dk sonra: ${r.text}`).join('\n'));
    }
  }
};
