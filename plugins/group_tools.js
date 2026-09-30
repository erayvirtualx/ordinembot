const { MessageMedia } = require('whatsapp-web.js');
const { getTargetMedia } = require('../lib/media');

module.exports = {
  name: ['hidetag', 'groupinfo', 'grouplink', 'revokeinvitelink', 'groupname', 'groupdesc', 'grouppic', 'addmember', 'leavegroup', 'groupsettings', 'goodbye', 'goodbyemsg', 'botprefix', 'badword'],
  group: true,
  // groupinfo yalnızca okuma yapar → herkese açık. botprefix tüm hesabın komut
  // önekini değiştirdiği için sahibe açık. Diğerleri grup yönetim işlemi.
  perm: {
    groupinfo: 'all',
    botprefix: 'owner',
    hidetag: 'admin', grouplink: 'admin', revokeinvitelink: 'admin',
    groupname: 'admin', groupdesc: 'admin', grouppic: 'admin',
    addmember: 'admin', leavegroup: 'owner', groupsettings: 'admin',
    goodbye: 'admin', goodbyemsg: 'admin', badword: 'admin'
  },
  run: async ({ client, msg, chat, cmd, args, db }) => {
    const g = db.group(chat.id._serialized);
    if (cmd === 'groupinfo') return msg.reply(`👥 *${chat.name}*\nÜye: ${chat.participants.length}\nAçıklama: ${chat.description || 'yok'}\nID: ${chat.id._serialized}`);
    if (cmd === 'grouplink') {
      const code = await chat.getInviteCode();
      return msg.reply(code ? `https://chat.whatsapp.com/${code}` : 'Davet bağlantısı alınamadı. Bot yönetici olmalı.');
    }
    if (cmd === 'revokeinvitelink') {
      const code = await chat.revokeInvite();
      return msg.reply(code ? `Yeni davet bağlantısı: https://chat.whatsapp.com/${code}` : 'Davet bağlantısı yenilenemedi.');
    }
    if (cmd === 'groupname') {
      const value = args.join(' ').trim(); if (!value) return msg.reply('Kullanım: .groupname <yeni ad>');
      await chat.setSubject(value.slice(0, 100)); return msg.reply('Grup adı güncellendi.');
    }
    if (cmd === 'groupdesc') {
      const value = args.join(' ').trim(); if (!value) return msg.reply('Kullanım: .groupdesc <açıklama>');
      await chat.setDescription(value.slice(0, 2048)); return msg.reply('Grup açıklaması güncellendi.');
    }
    if (cmd === 'grouppic') {
      const media = await getTargetMedia(msg);
      if (!media || !media.mimetype.startsWith('image/')) return msg.reply('Bir görseli yanıtlayıp .grouppic yaz.');
      await chat.setPicture(new MessageMedia(media.mimetype, media.data, media.filename)); return msg.reply('Grup fotoğrafı güncellendi.');
    }
    if (cmd === 'addmember') {
      const number = (args[0] || '').replace(/\D/g, ''); if (!number) return msg.reply('Kullanım: .addmember <ülke kodlu numara>');
      const result = await chat.addParticipants([`${number}@c.us`]); return msg.reply(JSON.stringify(result));
    }
    if (cmd === 'leavegroup') {
      await chat.leave(); return;
    }
    if (cmd === 'hidetag') {
      const ids = chat.participants.map((p) => p.id._serialized);
      const text = args.join(' ').trim() || '📢';
      return chat.sendMessage(`${text}\n${ids.map(() => '\u200b').join(' ')}`, { mentions: ids });
    }
    if (cmd === 'groupsettings') return msg.reply(`⚙️ *${chat.name}*\nHoş geldin: ${g.welcomeEnabled ? 'açık' : 'kapalı'}\nAyrılma mesajı: ${g.goodbyeEnabled ? 'açık' : 'kapalı'}\nAI chatbot: ${g.chatbotEnabled ? 'açık' : 'kapalı'}\nAntibot: ${g.antibot ? 'açık' : 'kapalı'}\nKötü kelime filtresi: ${g.antiBadword ? 'açık' : 'kapalı'}\nLink: ${g.antilink ? 'açık' : 'kapalı'} · Flood: ${g.antiflood ? 'açık' : 'kapalı'} · Spam: ${g.antispam ? 'açık' : 'kapalı'}`);
    if (cmd === 'goodbye' || cmd === 'goodbyemsg') {
      const sub = (args[0] || '').toLowerCase();
      if (cmd === 'goodbye' && ['on', 'off'].includes(sub)) { g.goodbyeEnabled = sub === 'on'; db.save(); return msg.reply(`Ayrılma mesajı: ${sub}`); }
      const text = (cmd === 'goodbyemsg' ? args : args.slice(1)).join(' ').trim();
      if (!text) return msg.reply('Kullanım: .goodbye on|off veya .goodbyemsg <@user içerebilir>');
      g.goodbye = text; g.goodbyeEnabled = true; db.save(); return msg.reply('Ayrılma mesajı kaydedildi ve açıldı.');
    }
    if (cmd === 'botprefix') {
      g.botPrefixes ||= [];
      const [action, ...rest] = args; const prefix = rest.join(' ');
      if (action === 'list') return msg.reply(`Engellenen bot önekleri: ${g.botPrefixes.join(', ') || 'yok'}`);
      if (!['add', 'remove'].includes(action) || !prefix || prefix.length > 8) return msg.reply('Kullanım: .botprefix add|remove <önek> veya .botprefix list');
      if (action === 'add' && !g.botPrefixes.includes(prefix)) g.botPrefixes.push(prefix);
      if (action === 'remove') g.botPrefixes = g.botPrefixes.filter((x) => x !== prefix);
      db.save(); return msg.reply('Bot komut önekleri güncellendi.');
    }
    if (cmd === 'badword') {
      g.badWords ||= [];
      const [action, ...rest] = args; const word = rest.join(' ').trim();
      if (action === 'list') return msg.reply(`Filtrelenen kelimeler: ${g.badWords.join(', ') || 'yok'}`);
      if (!['add', 'remove'].includes(action) || !word) return msg.reply('Kullanım: .badword add|remove <kelime> veya .badword list');
      if (action === 'add' && !g.badWords.some((x) => x.toLowerCase() === word.toLowerCase())) g.badWords.push(word);
      if (action === 'remove') g.badWords = g.badWords.filter((x) => x.toLowerCase() !== word.toLowerCase());
      db.save(); return msg.reply('Kelime filtresi güncellendi.');
    }
  }
};
