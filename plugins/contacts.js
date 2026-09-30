// Kişi kartı, toplu vCard, engelleme/engel kaldırma ve numara bilgisi.
const { MessageMedia } = require('whatsapp-web.js');
const { resolve, toId, numOf, groupContactIds, toContacts, vcardText } = require('../lib/contacts');
const { tmpFile, cleanup } = require('../lib/media');

module.exports = {
  name: ['kart', 'grupkart', 'grupvcf', 'engelle', 'engellekaldir', 'engellenenler', 'hakkinda', 'bakkında', 'numarainfo'],
  // Kişi verisi sızdıran komutlar grup yöneticisine, bot hesabını etkileyenler sahibe açık.
  perm: {
    kart: 'admin',
    grupkart: { level: 'admin', group: true },
    grupvcf: { level: 'admin', group: true },
    engelle: 'owner',
    engellekaldir: 'owner',
    engellenenler: 'owner',
    hakkinda: 'admin',
    'bakkında': 'admin',
    numarainfo: 'admin'
  },
  run: async ({ client, msg, chat, cmd, args, isGroup }) => {
    if (cmd === 'kart') {
      const mention = (await msg.getMentions())[0];
      const raw = mention ? mention.id.user : args.join('').replace(/\D/g, '');
      if (!raw) return msg.reply('Kullanım: .kart @kişi veya .kart 905XXXXXXXXX');
      await client.sendMessage(chat.id._serialized, toContacts([resolve(raw)]));
      return;
    }

    if (cmd === 'grupkart' || cmd === 'grupvcf') {
      if (!isGroup) return msg.reply('Bu komut sadece gruplarda çalışır.');
      const ids = await groupContactIds(client, chat);
      if (!ids.length) return msg.reply('Grup üyeleri okunamadı.');

      // .grupvcf: gerçek vCard 3.0 dosyası — üye sayısı sınırsız olduğu için en güvenilir yol.
      if (cmd === 'grupvcf') {
        const { writeFileSync } = require('fs');
        const file = tmpFile('vcf');
        writeFileSync(file, vcardText(ids), 'utf8');
        const media = await MessageMedia.fromFilePath(file);
        await client.sendMessage(chat.id._serialized, media, { sendMediaAsDocument: true, filename: `${chat.name || 'grup'}.vcf`, caption: `📇 ${ids.length} kişilik vCard dosyası.` });
        cleanup(file);
        return;
      }

      // .grupkart: tek mesajda çoklu vCard (multi_vcard). Çok kalabalık gruplarda sınır koyuyoruz.
      const SIZE = 40;
      if (ids.length <= SIZE) {
        await client.sendMessage(chat.id._serialized, toContacts(ids));
        return msg.reply(`📇 ${ids.length} kişi tek kart dosyası olarak gönderildi.`);
      }
      for (let i = 0; i < ids.length; i += SIZE) {
        await client.sendMessage(chat.id._serialized, toContacts(ids.slice(i, i + SIZE)));
        if (i + SIZE < ids.length) await new Promise((r) => setTimeout(r, 1200));
      }
      return msg.reply(`📇 ${ids.length} kişi ${Math.ceil(ids.length / SIZE)} pakette gönderildi.\nTek dosya için: .grupvcf`);
    }

    if (cmd === 'engelle' || cmd === 'engellekaldir') {
      const mention = (await msg.getMentions())[0];
      const raw = mention ? mention.id.user : args.join('').replace(/\D/g, '');
      if (!raw) return msg.reply(`Kullanım: .${cmd} @kişi veya numara`);
      const id = toId(raw);
      if (id === client.info.wid._serialized) return msg.reply('Kendini engelleyemezsin.');
      const contact = await client.getContactById(id);
      const ok = cmd === 'engelle' ? await contact.block() : await contact.unblock();
      return msg.reply(ok ? `🚫 ${numOf(id)} ${cmd === 'engelle' ? 'engellendi' : 'engel kaldırıldı'}.` : 'İşlem yapılamadı.');
    }

    if (cmd === 'engellenenler') {
      const list = await client.getBlockedContacts().catch(() => []);
      if (!list.length) return msg.reply('Engellenmiş kişi yok.');
      return msg.reply(`🚫 *Engellenenler* (${list.length})\n${list.slice(0, 40).map((c) => `• ${numOf(c.id._serialized)} ${c.name || ''}`).join('\n')}`);
    }

    if (cmd === 'hakkinda' || cmd === 'bakkında') {
      const mention = (await msg.getMentions())[0];
      const raw = mention ? mention.id.user : args.join('').replace(/\D/g, '');
      if (!raw) return msg.reply('Kullanım: .hakkinda @kişi');
      const id = toId(raw);
      const c = await client.getContactById(id);
      const [about, pic] = await Promise.all([
        c.getAbout().catch(() => null),
        client.getProfilePicUrl(id).catch(() => null)
      ]);
      const lines = [`👤 *${c.name || numOf(id)}*`, `Numara: +${numOf(id)}`];
      if (about) lines.push(`Hakkında: ${about}`);
      lines.push(pic ? 'Profil fotoğrafı: var' : 'Profil fotoğrafı: gizli veya yok');
      if (pic) {
        const media = await MessageMedia.fromUrl(pic).catch(() => null);
        if (media) return client.sendMessage(chat.id._serialized, media, { caption: lines.join('\n'), mentions: [id] });
      }
      return msg.reply(lines.join('\n'));
    }

    if (cmd === 'numarainfo') {
      const raw = args.join('').replace(/\D/g, '');
      if (!raw) return msg.reply('Kullanım: .numarainfo 905XXXXXXXXX');
      const id = toId(raw);
      const c = await client.getContactById(id).catch(() => null);
      if (!c) return msg.reply('Kişi bulunamadı (numara hatalı olabilir).');
      const groups = await client.getCommonGroups(id).catch(() => []);
      return msg.reply(`📞 +${numOf(id)}\nAd: ${c.name || 'bilinmiyor'}\nTür: ${c.isBusinessContact ? 'işletme' : 'kişisel'}\nOrtak grup: ${groups?.length || 0}`);
    }
  }
};
