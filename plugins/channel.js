// Kanal (newsletter) yönetimi: listeleme, arama, abonelik, oluşturma, susturma.
const { MessageMedia } = require('whatsapp-web.js');

const isChannelId = (s) => /@newsletter$/.test(s) || /^\d+$/.test(s);

module.exports = {
  name: ['kanallar', 'kanalara', 'kanaldan', 'kanalolustur', 'kanalmute', 'kanalar', 'kanaldin'],
  // Abonelik/oluşturma/susturma bot hesabını değiştirir → sahibe açık.
  // Arama yalnızca okuma yapar → grup yöneticisine yeter.
  perm: {
    kanallar: 'owner',
    kanalara: 'owner',
    kanaldan: 'owner',
    kanaldin: 'owner',
    kanalolustur: 'owner',
    kanalmute: 'owner',
    kanalar: 'admin'
  },
  run: async ({ client, msg, chat, cmd, args }) => {
    const chatId = chat.id._serialized;

    if (cmd === 'kanallar') {
      const list = await client.getChannels().catch(() => []);
      if (!list.length) return msg.reply('📰 Abone olduğun kanal yok.');
      return msg.reply(`📰 *Kanallar* (${list.length})\n${list.slice(0, 30).map((c) => `• ${c.name}\n  ${c.id._serialized}`).join('\n')}`);
    }

    if (cmd === 'kanalar') {
      const q = args.join(' ').trim();
      if (!q) return msg.reply('Kullanım: .kanalar <arama>');
      const found = await client.searchChannels({ search: q, limit: 10 }).catch((e) => {
        msg.reply(`Arama başarısız: ${e.message}`);
        return null;
      });
      if (!found) return;
      if (!found.length) return msg.reply(`"${q}" için kanal bulunamadı.`);
      return msg.reply(`🔎 *Kanal sonuçları*\n${found.map((c) => `• ${c.name}\n  ${c.id._serialized}\n  ${c.description || ''}`).join('\n')}\n\nAbone ol: .kanalara <kanalId>`);
    }

    if (cmd === 'kanala' || cmd === 'kanaldan' || cmd === 'kanaldin') {
      const target = args[0];
      if (!target) return msg.reply(`Kullanım: .${cmd} <kanalId|davet kodu>`);
      let channelId = target;
      if (!isChannelId(target)) {
        const ch = await client.getChannelByInviteCode(target).catch(() => null);
        if (!ch) return msg.reply('Kanal bulunamadı. Davet kodunu kontrol et.');
        channelId = ch.id._serialized;
      }
      if (cmd === 'kanaldin') {
        await client.subscribeToChannel(channelId);
        const ch = await client.getChatById(channelId).catch(() => null);
        return msg.reply(`✅ "${ch?.name || channelId}" kanalına abone olundu.`);
      }
      await client.unsubscribeFromChannel(channelId).catch((e) => msg.reply(`Abonelik kaldırılamadı: ${e.message}`));
      const ch = await client.getChatById(channelId).catch(() => null);
      return msg.reply(`🚪 "${ch?.name || channelId}" kanalından ayrıldın.`);
    }

    if (cmd === 'kanalolustur') {
      const title = args.join(' ').trim();
      if (!title) return msg.reply('Kullanım: .kanalolustur <kanal adı> [açıklama]');
      const description = args.slice(1).join(' ').trim() || undefined;
      let picture;
      if (msg.hasQuotedMsg) {
        const m = await (await msg.getQuotedMessage()).downloadMedia().catch(() => null);
        if (m?.data) picture = new MessageMedia(m.mimetype, m.data, m.filename);
      }
      const result = await client.createChannel(title, { description, picture }).catch((e) => {
        msg.reply(`Kanal oluşturulamadı: ${e.message}`);
        return null;
      });
      if (!result) return;
      const gid = typeof result === 'string' ? result : result.gid?._serialized;
      return msg.reply(`📢 Kanal oluşturuldu: *${title}*\n${gid}`);
    }

    if (cmd === 'kanalmute') {
      const state = args[0] === 'ac' ? false : true;
      const { parseDuration } = require('../lib/duration');
      const until = state ? new Date(Date.now() + (parseDuration(args[1]) || 3600000)) : undefined;
      const res = await client.muteChat(chatId, until).catch((e) => {
        msg.reply(`İşlem başarısız: ${e.message}`);
        return null;
      });
      if (!res) return;
      return msg.reply(state ? `🔕 Kanal susturuldu (${new Date(res.muteExpiration || until).toLocaleString('tr-TR')}).` : '🔔 Kanal sesi açıldı.');
    }
  }
};
