// Sohbet düzeyi işlemler: arşiv, sabitleme, okunmamış, temizleme, etiketler, arama, ortak gruplar, iletim takibi.
module.exports = {
  name: ['arsiv', 'arsivkaldir', 'okunmamis', 'temizle', 'sabitle', 'sabitkaldir',
    'etiketler', 'etiketekle', 'etikettencikar', 'ara', 'ortakgrup', 'sohbetkapat', 'sohbetses', 'takip'],
  // Etiketler tüm hesapta geçerli olduğu için sahibe açık. ara yalnızca okuma
  // yapar → herkese açık. Ortak grup ve iletim takibi kişi bilgisi sızdırır.
  perm: {
    ara: 'all',
    etiketler: 'owner', etiketekle: 'owner', etikettencikar: 'owner',
    // .temizle argümanla başka bir sohbeti de hedefleyebildiği için sahibe açık.
    temizle: 'owner',
    arsiv: 'admin', arsivkaldir: 'admin', okunmamis: 'admin',
    sabitle: 'admin', sabitkaldir: 'admin',
    sohbetkapat: 'admin', sohbetses: 'admin',
    ortakgrup: 'admin', takip: 'admin'
  },
  run: async ({ client, msg, chat, cmd, args }) => {
    const chatId = chat.id._serialized;

    if (cmd === 'arsiv') return msg.reply(await client.archiveChat(chatId) ? '📥 Sohbet arşivlendi.' : 'Arşivlenemedi.');
    if (cmd === 'arsivkaldir') return msg.reply(await client.unarchiveChat(chatId) ? '📤 Sohbet arşivden çıkarıldı.' : 'Arşivden çıkarılamadı.');
    if (cmd === 'okunmamis') { await client.markChatUnread(chatId); return msg.reply('🔴 Sohbet okunmadı olarak işaretlendi.'); }
    if (cmd === 'sabitle') return msg.reply(await client.pinChat(chatId) ? '📌 Sohbet sabitlendi.' : 'Sabitlenemedi.');
    if (cmd === 'sabitkaldir') return msg.reply(await client.unpinChat(chatId) ? '📌 Sabitleme kaldırıldı.' : 'Kaldırılamadı.');

    if (cmd === 'sohbetkapat') {
      const { parseDuration } = require('../lib/duration');
      const until = new Date(Date.now() + (parseDuration(args[0]) || 8 * 3600000));
      const r = await client.muteChat(chatId, until);
      return msg.reply(`🔕 Sohbet susturuldu.\n${new Date(r.muteExpiration || until).toLocaleString('tr-TR')}`);
    }
    if (cmd === 'sohbetses') {
      const r = await client.unmuteChat(chatId);
      return msg.reply(`🔔 Sohbet sessizliği kaldırıldı (şu an susturulmuş: ${r.isMuted ? 'evet' : 'hayır'}).`);
    }

    if (cmd === 'temizle') {
      const given = args[0] && /@/.test(args[0]) ? args[0] : chatId;
      const target = given === chatId ? chat : await client.getChatById(given);
      await target.clearMessages();
      return msg.reply(`🧹 Mesajlar temizlendi: ${target.name || given}`);
    }

    if (cmd === 'etiketler') {
      const labels = await client.getLabels().catch(() => []);
      if (!labels.length) return msg.reply('🏷️ Etiket yok. WhatsApp ayarlarından etiket oluşturup tekrar dene.');
      return msg.reply(`🏷️ *Etiketler*\n${labels.map((l) => `• \`${l.id}\` — ${l.name}`).join('\n')}\n\nKullanım: .etiketekle <id> <sohbetId>`);
    }
    if (cmd === 'etiketekle' || cmd === 'etikettencikar') {
      const labelId = String(args[0] || '').trim();
      const targets = args.slice(1).filter((a) => /@/.test(a));
      if (!labelId || !targets.length) return msg.reply(`Kullanım: .${cmd} <etiketId> <sohbetId>\nEtiketleri .etiketler ile listele.`);
      let done = 0;
      for (const id of targets) {
        try {
          const target = await client.getChatById(id);
          const current = (await target.getLabels()).map((l) => String(l.id));
          const next = cmd === 'etiketekle'
            ? [...new Set([...current, labelId])]
            : current.filter((x) => x !== labelId);
          if (next.length === current.length) continue;
          await target.changeLabels(next);
          done++;
        } catch (e) { console.error('etiket hatası:', id, e.message); }
      }
      return msg.reply(`🏷️ ${done}/${targets.length} sohbete etiket ${cmd === 'etiketekle' ? 'eklendi' : 'çıkarıldı'}.`);
    }

    if (cmd === 'ara') {
      const q = args.filter((a) => !a.includes('@')).join(' ').trim();
      const scope = args.find((a) => a.includes('@'));
      if (!q) return msg.reply('Kullanım: .ara <kelime> [sohbetId]');
      const found = await client.searchMessages(q, { chatId: scope, limit: 12 }).catch(() => []);
      if (!found.length) return msg.reply(`🔍 "${q}" için sonuç yok.`);
      return msg.reply(`🔍 *"${q}"* — ${found.length} sonuç\n\n${found.slice(0, 12).map((m) => `• ${m.chat?.name || m.from}\n  ${(m.body || '(medya)').slice(0, 140)}`).join('\n')}`);
    }

    if (cmd === 'ortakgrup') {
      const { resolve } = require('../lib/contacts');
      const target = (await msg.getMentions())[0] || args[0];
      if (!target) return msg.reply('Kullanım: .ortakgrup @kişi');
      const groups = await client.getCommonGroups(resolve(target)).catch(() => []);
      if (!groups || !groups.length) return msg.reply('Ortak grup bulunamadı.');
      const lines = [];
      for (const g of groups.slice(0, 15)) {
        const c = await client.getChatById(g._serialized || g).catch(() => null);
        lines.push(`• ${c?.name || g._serialized || g}`);
      }
      return msg.reply(`👥 *Ortak gruplar* (${groups.length})\n${lines.join('\n')}`);
    }

    if (cmd === 'takip') {
      const acks = require('../lib/acks');
      return msg.reply(`📮 *İletim durumu*\n\n${acks.summary()}\n\nSon mesajlar:\n${acks.list(10).join('\n') || '—'}`);
    }
  }
};
