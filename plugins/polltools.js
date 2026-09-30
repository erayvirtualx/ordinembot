// Anket sonuçlarını okur. Anlık oylar vote_update event'iyle lib/polls.js içinde toplanır.
const polls = require('../lib/polls');

module.exports = {
  name: ['anketsonuc', 'oylar'],
  run: async ({ client, msg, cmd, args }) => {
    if (cmd === 'oylar') {
      const recent = polls.recent(15);
      if (!recent.length) return msg.reply('📊 Bu oturumda anket oyu kaydı yok.');
      return msg.reply(`📊 *Son oylar*\n${recent.map((v) => `• ${v.sender}: ${v.options.map((o) => o.name).join(', ') || '(çekildi)'}`).join('\n')}`);
    }

    const quoted = msg.hasQuotedMsg ? await msg.getQuotedMessage() : null;
    const id = quoted?.id?._serialized || args[0];
    if (!id) return msg.reply('Bir anketi alıntılayıp .anketsonuc yaz.');

    const votes = await client.getPollVotes(id).catch((e) => {
      msg.reply(`Oylar okunamadı: ${e.message}`);
      return null;
    });
    if (!votes) return;
    if (!votes.length) return msg.reply('📊 Bu anket için henüz oy yok.');

    // getPollVotes seçenek bazında oyu çoktan toplu döndürür; ayrıca ham oy kaydımızı da gösteriyoruz.
    const totals = new Map();
    const voters = new Set();
    for (const v of votes) {
      voters.add(String(v.sender || v.senderId?._serialized || '?').split('@')[0]);
      for (const o of v.options || []) {
        if (typeof o.voteCount === 'number') totals.set(o.name, o.voteCount);
        else if (!o.voteCount) totals.set(o.name, (totals.get(o.name) || 0) + 1);
      }
    }
    const rows = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((s, r) => s + r[1], 0) || 1;
    return msg.reply(`📊 *Anket Sonucu*\nToplam oy: ${total} · Katılımcı: ${voters.size}\n\n${rows.map(([name, n]) => {
      const pct = Math.round((n / total) * 100);
      return `${'█'.repeat(Math.max(1, Math.round(pct / 5))).padEnd(20, '░')} %${pct}  ${name} (${n})`;
    }).join('\n')}`);
  }
};
