const { economy } = require('../config');

// Bahsin cebe oranına göre hedef RTP: küçükte baseRtp, büyüdükçe allInRtp'ye iner.
function targetRtp(bet, cash) {
  const { baseRtp, safeRatio, allInRtp } = economy.risk;
  const r = Math.min(1, bet / Math.max(cash, 1));
  if (r <= safeRatio) return baseRtp;
  const t = (r - safeRatio) / (1 - safeRatio);
  return baseRtp - t * (baseRtp - allInRtp);
}

// Kullanıcı yazısını miktara çevirir: "500", "10k", "1.5m", "hepsi"/"all"
function parseAmount(str, max) {
  if (!str) return null;
  const s = str.toLowerCase().replace(',', '.');
  if (s === 'hepsi' || s === 'all') return max;
  const m = s.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return null;
  const mult = m[2] === 'k' ? 1e3 : m[2] === 'm' ? 1e6 : 1;
  return Math.floor(parseFloat(m[1]) * mult);
}

module.exports = { targetRtp, parseAmount };
