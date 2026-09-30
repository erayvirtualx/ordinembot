// "30m", "2sa", "1g", "45s" gibi süreleri ms'ye çevirir.
function parseDuration(str) {
  if (!str) return null;
  const m = str.toLowerCase().match(/^(\d+)(s|sn|m|dk|h|sa|d|g)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  if (['s', 'sn'].includes(unit)) return n * 1000;
  if (['m', 'dk'].includes(unit)) return n * 60000;
  if (['h', 'sa'].includes(unit)) return n * 3600000;
  if (['d', 'g'].includes(unit)) return n * 86400000;
  return null;
}
module.exports = { parseDuration };
