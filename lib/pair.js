function pctHash(a, b) {
  const s = [a, b].sort().join('-');
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 101;
}
function shipName(n1, n2) {
  const half = (s) => s.slice(0, Math.ceil(s.length / 2));
  return half(n1) + n2.slice(Math.floor(n2.length / 2));
}
function displayName(contact, fallback) {
  return (contact && (contact.pushname || contact.name)) || fallback;
}
module.exports = { pctHash, shipName, displayName };
