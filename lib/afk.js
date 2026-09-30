const db = require('./db');
const num = (id) => (id || '').split('@')[0];

async function checkAfk(client, msg, chat, sender) {
  const u = db.user(num(sender));
  // Kendisi AFK'sa ve mesaj yazdıysa AFK'yı kaldır
  if (u.afk) {
    const mins = Math.round((Date.now() - u.afk.since) / 60000);
    u.afk = null; db.save();
    await msg.reply(`👋 Tekrar aktifsin. (${mins} dk AFK kaldın)`).catch(() => {});
    return;
  }
  // Mesajda etiketlenen biri AFK mı?
  const mentions = await msg.getMentions().catch(() => []);
  for (const m of mentions) {
    const v = db.data.users[m.id.user];
    if (v && v.afk) {
      const mins = Math.round((Date.now() - v.afk.since) / 60000);
      await msg.reply(`💤 @${m.id.user} şu an AFK (${mins} dk): ${v.afk.reason}`, ).catch(() => {});
    }
  }
}
module.exports = { checkAfk };
