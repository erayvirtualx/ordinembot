const { parseDuration } = require('../lib/duration');

module.exports = {
  name: ['mute', 'unmute', 'lock', 'unlock', 'kurallar', 'kuralekle', 'kuralsil',
         'antidelete', 'antiedit', 'zamanla'],
  group: true,
  admin: true,
  run: async ({ msg, chat, cmd, args, db }) => {
    const g = db.group(chat.id._serialized);

    if (cmd === 'mute' || cmd === 'unmute') {
      const target = (await msg.getMentions())[0];
      if (!target) return msg.reply(`Kullanım: .${cmd} @kişi ${cmd === 'mute' ? '<süre, örn 10m>' : ''}`);
      g.mutes = g.mutes || {};
      if (cmd === 'unmute') { delete g.mutes[target.id._serialized]; db.save(); return msg.reply('Susturma kaldırıldı.'); }
      const ms = parseDuration(args[1]) || 10 * 60000;
      g.mutes[target.id._serialized] = Date.now() + ms;
      db.save();
      return msg.reply(`🔇 @${target.id.user} susturuldu.`, { mentions: [target.id._serialized] });
    }

    if (cmd === 'lock' || cmd === 'unlock') {
      try {
        if (typeof chat.setMessagesAdminsOnly === 'function') await chat.setMessagesAdminsOnly(cmd === 'lock');
        else return msg.reply('Bu whatsapp-web.js sürümü grup kilitlemeyi desteklemiyor.');
        return msg.reply(cmd === 'lock' ? '🔒 Grup kilitlendi, sadece adminler yazabilir.' : '🔓 Grup kilidi açıldı.');
      } catch { return msg.reply('Olmadı, bot yönetici mi?'); }
    }

    if (cmd === 'kurallar') {
      if (!g.rules.length) return msg.reply('Bu grupta henüz kural yok. Admin: .kuralekle <metin>');
      return msg.reply('📜 *Grup Kuralları*\n' + g.rules.map((r, i) => `${i + 1}. ${r}`).join('\n'));
    }
    if (cmd === 'kuralekle') {
      const text = args.join(' ');
      if (!text) return msg.reply('Kullanım: .kuralekle <kural metni>');
      g.rules.push(text); db.save();
      return msg.reply(`✅ Kural eklendi (#${g.rules.length}).`);
    }
    if (cmd === 'kuralsil') {
      const i = parseInt(args[0]) - 1;
      if (isNaN(i) || !g.rules[i]) return msg.reply('Kullanım: .kuralsil <numara>');
      g.rules.splice(i, 1); db.save();
      return msg.reply('🗑️ Kural silindi.');
    }

    if (cmd === 'antidelete' || cmd === 'antiedit') {
      if (!['on', 'off'].includes(args[0])) return msg.reply(`Kullanım: .${cmd} on | off`);
      g[cmd] = args[0] === 'on'; db.save();
      return msg.reply(`${cmd}: ${args[0]}`);
    }

    if (cmd === 'zamanla') {
      const sub = args[0];
      if (sub === 'ekle') {
        const time = args[1];
        const text = args.slice(2).join(' ');
        if (!/^\d{1,2}:\d{2}$/.test(time || '') || !text) return msg.reply('Kullanım: .zamanla ekle 08:00 Günaydın grup!');
        g.scheduled.push({ time, text, lastSent: null }); db.save();
        return msg.reply(`⏰ Zamanlandı: her gün ${time} → "${text}"`);
      }
      if (sub === 'sil') {
        const i = parseInt(args[1]) - 1;
        if (isNaN(i) || !g.scheduled[i]) return msg.reply('Kullanım: .zamanla sil <numara>');
        g.scheduled.splice(i, 1); db.save();
        return msg.reply('🗑️ Silindi.');
      }
      if (!g.scheduled.length) return msg.reply('Zamanlanmış mesaj yok.\nEkle: .zamanla ekle 08:00 Metin\nSil: .zamanla sil <no>');
      return msg.reply('⏰ *Zamanlanmış Mesajlar*\n' + g.scheduled.map((s, i) => `${i + 1}. ${s.time} — ${s.text}`).join('\n'));
    }
  }
};
