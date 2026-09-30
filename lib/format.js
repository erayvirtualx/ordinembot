const fmt = (n) => Math.floor(n).toLocaleString('tr-TR');
function short(n) {
  const t = (x) => String(Math.round(x * 100) / 100).replace('.', ',');
  if (n >= 1e9) return `${t(n / 1e9)} Milyar`;
  if (n >= 1e6) return `${t(n / 1e6)} Milyon`;
  if (n >= 1e3) return `${t(n / 1e3)} Bin`;
  return t(n);
}
module.exports = { fmt, short };
