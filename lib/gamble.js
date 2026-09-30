const { targetRtp } = require('./risk');

// Basit oyunlar (rulet, zar): doğal RTP'si r0. Hedef RTP >= r0 ise kazançlar büyütülür,
// değilse (büyük bahis) olasılıkla o tur kaybettirilir.
function simplePlan(bet, cash, r0) {
  const T = targetRtp(bet, cash);
  return { T, boost: T >= r0 ? T / r0 : 1, forceLoss: T < r0 && Math.random() < 1 - T / r0 };
}

// Blackjack: sadece kazanılan eller ayarlanır. rtpFlipped = tüm kazançlar kaybettirilince kalan RTP
// (21 yapan ele krupiye ancak beraberlik verebildiği için 0 değil). RTP(p) = r0 - p * (r0 - rtpFlipped).
function blackjackPlan(bet, cash, r0, push, rtpFlipped) {
  const T = targetRtp(bet, cash);
  if (T >= r0) return { T, boost: (T - push) / (r0 - push), flipP: 0 };
  return { T, boost: 1, flipP: Math.min(1, (r0 - T) / (r0 - rtpFlipped)) };
}

const riskNote = (T) => (T < 0.9 ? `\n⚠️ Büyük bahis, risk yüksek (RTP %${Math.round(T * 100)})` : '');

module.exports = { simplePlan, blackjackPlan, riskNote };
