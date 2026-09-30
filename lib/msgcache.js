const cache = new Map(); // msgId -> { body, from, chatId, hasMedia, ts }
function remember(msg) {
  if (!msg.id || !msg.id._serialized) return;
  cache.set(msg.id._serialized, { body: msg.body, author: msg.author || msg.from, chatId: msg.from, hasMedia: msg.hasMedia, ts: Date.now() });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
}
function get(id) { return cache.get(id); }
module.exports = { remember, get };
