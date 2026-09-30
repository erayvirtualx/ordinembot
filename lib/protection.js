const db = require('./db');
const history = new Map();

module.exports = async function protection(client, msg, chat, sender, isOwner) {
  const g = db.group(chat.id._serialized);
  const p = chat.participants.find((x) => x.id._serialized === sender);
  const me = chat.participants.find((x) => x.id._serialized === client.info.wid._serialized);
  if (isOwner || (p && p.isAdmin) || !(me && me.isAdmin)) return false; // adminler muaf, bot admin olmalı

  const text = msg.body || '';
  let reason = null;

  if (g.antilink && /(https?:\/\/|chat\.whatsapp\.com|www\.)\S+/i.test(text)) reason = 'link';
  if (!reason && g.anticaps) {
    const letters = text.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, '');
    const upper = letters.replace(/[^A-ZÇĞİÖŞÜ]/g, '');
    if (letters.length >= 10 && upper.length / letters.length > 0.7) reason = 'aşırı büyük harf';
  }
  if (!reason && g.antiBadword && (g.badWords || []).some((word) => word && text.toLocaleLowerCase('tr').includes(word.toLocaleLowerCase('tr')))) reason = 'yasaklı kelime';
  if (!reason && g.antibot && (g.botPrefixes || []).some((prefix) => prefix && text.startsWith(prefix) && !text.startsWith(require('../config').prefix))) reason = 'başka bot komutu';

  // Toplu etiketleme: tek mesajda çok sayıda @mention
  if (!reason && g.antitag) {
    const mentions = await msg.getMentions().catch(() => []);
    if (mentions.length >= 5) reason = 'toplu etiketleme';
  }

  const now = Date.now();
  const key = chat.id._serialized + sender;
  const h = (history.get(key) || []).filter((m) => now - m.t < 5000);
  h.push({ t: now, text });
  history.set(key, h);
  if (!reason && g.antiflood && h.length >= 6) reason = 'flood';
  if (!reason && g.antispam && h.length >= 3 && h.slice(-3).every((m) => m.text && m.text === text)) reason = 'spam';

  if (!reason) return false;
  await msg.delete(true).catch(() => {});

  // Uyarı sayacı: { count, history[] } biçiminde, çıplak numarayla anahtarlanır
  // (plugins/warn.js ile aynı anahtar ve biçim — bkz. db.normalizeWarns).
  db.normalizeWarns(g);
  const w = (g.warns[sender.split('@')[0]] ||= { count: 0, history: [] });
  w.count++;
  w.history.push({ at: now, text: reason, by: 'koruma' });
  if (w.history.length > 20) w.history.splice(0, w.history.length - 20);
  db.save();

  const num = sender.split('@')[0];
  if (w.count >= (g.warnLimit || 3)) {
    delete g.warns[num];
    db.save();
    await chat.sendMessage(`@${num} ${reason} nedeniyle limite ulaştı, gruptan çıkarılıyor.`, { mentions: [sender] });
    await chat.removeParticipants([sender]).catch(() => {});
  } else {
    await chat.sendMessage(`⚠️ @${num} yasak: ${reason} (${w.count}/${g.warnLimit})`, { mentions: [sender] });
  }
  return true;
};
