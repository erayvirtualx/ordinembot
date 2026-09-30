// Kişi kimliği çözümleme ve toplu vCard (multi_vcard) üretimi.
const { Contact } = require('whatsapp-web.js');

// "905XXXXXXXXX", "+90 5XX XXX XX XX", "905...@c.us" -> "905XXXXXXXXX@c.us"
function toId(input) {
  if (!input) return null;
  const raw = String(input).trim();
  if (/@/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  return digits + '@c.us';
}

const numOf = (id) => String(id || '').split('@')[0];

// Etiket/numara/ID ile tek bir kişi kimliği çözer.
function resolve(input) {
  if (input && typeof input === 'object') {
    if (input.id) return input.id._serialized || input.id.user;
    if (input.user) return toId(input.user);
  }
  return toId(input);
}

// Gruptaki tüm katılımcıları tek dizide toplar (bot dahil).
async function groupContactIds(client, chat) {
  let participants = [];
  try { participants = (await chat.getParticipants()).map((p) => p.id._serialized); } catch {}
  if (!participants.length) participants = (chat.participants || []).map((p) => p.id._serialized);
  const me = client.info?.wid?._serialized;
  return [...new Set(participants.filter((id) => id && id !== me))];
}

// Birden çok kişiyi TEK mesajda (multi_vcard) göndermek için Contact dizisi.
function toContacts(ids) {
  return ids.map((id) => new Contact(id));
}

// .vcf dosyası üretmek isteyenler için gerçek vCard 3.0 metni. Her kişi kendi BEGIN/END bloğunu alır.
function vcardText(ids, names = {}) {
  return ids.map((id) => {
    const n = numOf(id);
    return ['BEGIN:VCARD', 'VERSION:3.0', 'FN:' + (names[n] || n), `TEL;type=CELL;type=VOICE;waid=${n}:+${n}`, 'END:VCARD'].join('\r\n');
  }).join('\r\n');
}

module.exports = { toId, numOf, resolve, groupContactIds, toContacts, vcardText };
