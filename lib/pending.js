const store = new Map(); // targetId(senderNum) -> { id, type, from, expires, ...data }

// ttlMs sonunda hâlâ bekliyorsa otomatik siler ve onExpire(req) çağırır.
function create(targetId, data, ttlMs, onExpire) {
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  const req = { id, targetId, expires: Date.now() + ttlMs, ...data };
  store.set(targetId, req);
  setTimeout(() => {
    const cur = store.get(targetId);
    if (cur && cur.id === id) {
      store.delete(targetId);
      if (onExpire) onExpire(req).catch?.(() => {});
    }
  }, ttlMs);
  return req;
}

function get(targetId) {
  const r = store.get(targetId);
  if (!r) return null;
  if (Date.now() > r.expires) { store.delete(targetId); return null; }
  return r;
}

// Sadece hâlâ aynı istek duruyorsa siler, true döner (kabul/red işlemine izin verir).
function resolve(targetId, id) {
  const r = store.get(targetId);
  if (r && r.id === id) { store.delete(targetId); return true; }
  return false;
}

module.exports = { create, get, resolve };
