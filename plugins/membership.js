// Gruba katılma başvurularını yönetir: listeleme, onaylama, reddetme.
module.exports = {
  name: ['basvurular', 'onayla', 'onayreddet', 'basvuruotomatik'],
  group: true,
  admin: true,
  run: async ({ client, msg, chat, cmd, args, db }) => {
    const groupId = chat.id._serialized;
    const g = db.group(groupId);

    if (cmd === 'basvuruotomatik') {
      const mode = (args[0] || '').toLowerCase();
      if (mode === 'on' || mode === 'off') g.autoApprove = mode === 'on';
      else if (mode === 'duyuru') g.announceRequests = !g.announceRequests;
      else return msg.reply(`Otomatik onay: ${g.autoApprove ? 'açık' : 'kapalı'}\nDuyuru: ${g.announceRequests ? 'açık' : 'kapalı'}\n\nKullanım:\n• .basvuruotomatik on | off\n• .basvuruotomatik duyuru`);
      db.save();
      return msg.reply(`Otomatik onay: ${g.autoApprove ? 'açık ✅' : 'kapalı'}\nDuyuru: ${g.announceRequests ? 'açık' : 'kapalı'}`);
    }

    if (cmd === 'basvurular') {
      const list = await client.getGroupMembershipRequests(groupId).catch((e) => {
        msg.reply(`Başvurular okunamadı: ${e.message}`);
        return null;
      });
      if (!list) return;
      if (!list.length) return msg.reply('📭 Bekleyen başvuru yok.');
      const lines = list.slice(0, 30).map((r, i) => `${i + 1}. ${String(r.id?._serialized || r.id?.user || '').split('@')[0]} · ${r.method || 'bilinmiyor'}`);
      return msg.reply(`📋 *Bekleyen başvurular* (${list.length})\n${lines.join('\n')}\n\nOnay: .onayla <numara|hepsi>\nRet: .onayreddet <numara|hepsi>`);
    }

    const isApprove = cmd === 'onayla';
    const list = await client.getGroupMembershipRequests(groupId);
    if (!list.length) return msg.reply('📭 Bekleyen başvuru yok.');

    const asked = args.filter((a) => /\D/.test(a));
    const all = !asked.length || asked.some((a) => /hepsi|all|\*/i.test(a));
    const targets = all ? list : list.filter((r) => asked.includes(String(r.id?._serialized || r.id?.user || '').split('@')[0]));

    if (!targets.length) return msg.reply('Eşleşen başvuru yok.');
    const ids = targets.map((r) => r.id?._serialized || `${r.id?.user}@c.us`);

    const results = await (isApprove
      ? client.approveGroupMembershipRequests(groupId, { requesterIds: ids, sleep: 800 })
      : client.rejectGroupMembershipRequests(groupId, { requesterIds: ids, sleep: 800 })
    ).catch((e) => {
      msg.reply(`İşlem başarısız: ${e.message}`);
      return null;
    });
    if (!results) return;

    const ok = results.filter((r) => r.userId && !r.error).length;
    const failed = results.filter((r) => r.error);
    const head = isApprove ? '✅ Onaylanan' : '🚫 Reddedilen';
    const body = ok ? ids.map((i) => `• ${String(i).split('@')[0]}`).join('\n') : '—';
    const err = failed.length ? `\n\n⚠️ ${failed.length} başvuru işlenemedi.` : '';
    return msg.reply(`${head}: ${ok}\n${body}${err}`);
  }
};
