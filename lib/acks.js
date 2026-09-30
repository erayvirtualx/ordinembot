// Gönderilen mesajların iletim durumu (message_ack) takibi.
// whatsapp-web.js ACK_ERROR=-1, ACK_PENDING=0, ACK_SERVER=1, ACK_DEVICE=2, ACK_READ=3 üretir.
const MAX = 60;

const rows = [];   // [{ at, chatId, id, author, status }]
const pending = new Map(); // id -> index

const LABEL = {
  '-1': '❌ hata',
  0: '⏳ bekliyor',
  1: '✔️ sunucuya ulaştı',
  2: '📱 telefona ulaştı',
  3: '👁️ okundu'
};

function track(msg) {
  if (!msg || !msg.id || !msg.id._serialized) return;
  const chatId = msg.from;
  const rec = { at: Date.now(), chatId, id: msg.id._serialized, author: msg.author || chatId, status: 0 };
  rows.push(rec);
  if (rows.length > MAX) rows.shift();
  pending.set(rec.id, rec);
}

function update(msg, ack) {
  if (!msg || !msg.id || !msg.id._serialized) return;
  const rec = pending.get(msg.id._serialized);
  if (!rec) return;
  rec.status = ack;
  if (ack >= 2) pending.delete(msg.id._serialized);
}

// Metinsel okunabilir son durum listesi (sahiip paneli / .takip komutu için).
function list(limit = 15) {
  return rows.slice(-limit).map((r) => {
    const chat = r.chatId.includes('@g.us') ? r.chatId.replace('@g.us', '') : r.chatId.replace('@c.us', '');
    return `${LABEL[r.status] || r.status} · ${r.at ? new Date(r.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'} · ${chat.slice(0, 14)}`;
  });
}

const summary = () => {
  const last = rows[rows.length - 1];
  if (!last) return 'Kayıtlı iletim durumu yok.';
  return `${LABEL[last.status] || last.status}\nSohbet: ${last.chatId}\nID: ${last.id.slice(0, 24)}…`;
};

module.exports = { track, update, list, summary, LABEL };
