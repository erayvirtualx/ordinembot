// Uyarı (warn) sistemi: uyarı verme, listeleme, sıfırlama, limit aşımında otomatik atma,
// ayrıca süreli susturma (.sustur 10m @kişi).
const { parseDuration } = require('../lib/duration');

module.exports = {
  name: ['warn', 'warnings', 'warnreset', 'uyarilar', 'uyarireset', 'sustur'],
  group: true,
  admin: true,
  run: async ({ client, msg, chat, cmd, args, senderNum, db }) => {
    const g = db.group(chat.id._serialized);
    // Uyarı tablosunu tek biçime getirir: çıplak numaralı anahtar + {count, history}.
    // (lib/protection.js ile aynı tablo paylaşılıyor; anahtar biçimi ayrışırsa
    // iki yolun sayacı birbirini görmez ve limit tutmaz.) Yan etki olarak g.warns
    // normalize edilmiş hâlde döner.
    if (db.normalizeWarns) db.normalizeWarns(g);

    if (cmd === 'warnings' || cmd === 'uyarilar') {
      const target = (await msg.getMentions())[0];
      if (!target) {
        const all = Object.entries(g.warns).filter(([, w]) => w.count);
        if (!all.length) return msg.reply('Bu grupta uyarı geçmişi boş.');
        return msg.reply(`⚠️ *Uyarı geçmişi* (${all.length} kişi)\n${all.sort((a, b) => b[1].count - a[1].count).slice(0, 20).map(([n, w]) => `• @${n}: ${w.count}`).join('\n')}`);
      }
      const w = g.warns[target.id.user];
      if (!w || !w.count) return msg.reply(`@${target.id.user} uyarısı yok.`, { mentions: [target.id._serialized] });
      const lines = w.history.slice(-10).map((h) => `• ${new Date(h.at).toLocaleString('tr-TR')} — ${h.text} (by @${h.by})`);
      return msg.reply(`⚠️ *@${target.id.user}* — ${w.count} uyarı\n\n${lines.join('\n')}`, { mentions: [target.id._serialized] });
    }

    const target = (await msg.getMentions())[0];
    if (!target) return msg.reply('Birini etiketle.');
    const n = target.id.user;

    if (cmd === 'warnreset' || cmd === 'uyarireset') {
      if (!g.warns[n]) return msg.reply(`@${n} için uyarı kaydı yok.`, { mentions: [target.id._serialized] });
      delete g.warns[n];
      db.save();
      return msg.reply(`✅ @${n} uyarıları sıfırlandı.`, { mentions: [target.id._serialized] });
    }

    if (cmd === 'sustur') {
      const ms = parseDuration(args.find((a) => parseDuration(a))) || 600000;
      const until = Date.now() + ms;
      g.mutes ||= {};
      g.mutes[target.id._serialized] = until;
      db.save();
      return chat.sendMessage(`🔇 @${n} susturuldu → ${new Date(until).toLocaleString('tr-TR')}`, { mentions: [target.id._serialized] });
    }

    // .warn <sebep metni>
    const participant = chat.participants.find((p) => p.id.user === n);
    if (participant && participant.isAdmin) return msg.reply('⚠️ Adminlere uyarı verilemez.');
    if (n === client.info.wid.user) return msg.reply('Kendine uyarı veremezsin.');

    // Eski sürümlerden kalan sayısal sayaçları nesneye çevir (lib/protection.js ile aynı).
    // Yukarıdaki döngü bütün kayıtları dönüştürdüğü için burada sadece yoksa oluştur.
    const w = (g.warns[n] ||= { count: 0, history: [] });
    w.count++;
    w.history.push({ at: Date.now(), text: args.join(' ').slice(0, 200) || 'Kural ihlali', by: senderNum });
    if (w.history.length > 20) w.history.splice(0, w.history.length - 20);
    db.save();

    const limit = g.warnLimit || 3;
    await chat.sendMessage(`⚠️ @${n} uyarıldı (${w.count}/${limit})\nSebep: ${w.history.at(-1).text}\nKalan hak: ${Math.max(0, limit - w.count)}`, { mentions: [target.id._serialized] });

    if (w.count >= limit) {
      delete g.warns[n];
      db.save();
      const kicked = await client.removeParticipant(chat.id._serialized, target.id._serialized).catch(() => false);
      await chat.sendMessage(`🚫 @${n} ${limit} uyarı sınırına ulaştı ve ${kicked ? 'gruptan çıkarıldı' : 'çıkarılamadı (admin olabilir)'}.`, { mentions: [target.id._serialized] }).catch(() => {});
    }
  }
};
