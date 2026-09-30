const { levelOf } = require('./level');
const { getYonkou, awardBounty } = require('./yonkou');

// Seviye farkı kazanma ihtimalini etkiler ama asla belirlemez; her zaman şansa yer bırakır.
function winProbability(lvlA, lvlB) {
  let p = 0.5 + (lvlA - lvlB) * 0.015;      // seviye farkı başına ±%1.5
  p = Math.max(0.2, Math.min(0.8, p));       // seviyenin etkisi sınırlı (max %80/%20)
  const luck = (Math.random() - 0.5) * 0.3;  // ±%15 ekstra şans faktörü
  return Math.max(0.05, Math.min(0.95, p + luck));
}

const MOVES = [
  'Bir anda saldırıya geçtiler!', 'İkisi de birbirine girdi!', 'Ortalık savaş alanına döndü!',
  'Güçlü hamleler denendi!', 'İkisi de son gücünü kullandı!'
];
const FINISH = [
  '{w} son darbeyi indirdi ve kazandı! 🥊', '{w} rakibini yere serdi! 🏆', '{w} nefes nefese ama ayakta kalan o oldu! 💪'
];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Bahis kontrolü dahil gerçek dövüşü çözer. Balans yetersizse null döner.
function resolveFight(db, aNum, bNum, bet) {
  const u = db.user(aNum), v = db.user(bNum);
  if (bet > 0 && (bet > u.balance || bet > v.balance)) return { insufficientFunds: true };

  const yonkouBeforeFight = getYonkou(db);
  const lvlA = levelOf(u.xp), lvlB = levelOf(v.xp);
  const p = winProbability(lvlA, lvlB);
  const aWins = Math.random() < p;
  const winnerNum = aWins ? aNum : bNum;
  const loserNum = aWins ? bNum : aNum;
  const winner = db.user(winnerNum);

  let reward;
  if (bet > 0) { u.balance -= bet; v.balance -= bet; reward = bet * 2; winner.balance += reward; }
  else { reward = 3000 + Math.floor(Math.random() * 5000); winner.balance += reward; }
  winner.duelWins = (winner.duelWins || 0) + 1;
  db.user(loserNum).duelLosses = (db.user(loserNum).duelLosses || 0) + 1;
  const bounty = awardBounty(db, winnerNum, loserNum, yonkouBeforeFight);

  const winPct = aWins ? p : 1 - p;
  const bountyText = bounty ? `\n🏴‍☠️ Yonkou ödülü: +${bounty.toLocaleString('tr-TR')} TL` : '';
  const text = `🥊 *Kavga!*\n@${aNum} (Sv.${lvlA}) vs @${bNum} (Sv.${lvlB})\n\n${pick(MOVES)}\n${pick(FINISH).replace('{w}', `@${winnerNum}`)}\n\n💰 Ödül: +${reward.toLocaleString('tr-TR')} TL${bet ? ' (bahisten)' : ' (dostane maç ödülü)'}${bountyText}\n🎲 Kazananın o an kazanma ihtimali: %${Math.round(winPct * 100)} (seviye + şans)`;
  return { winnerNum, loserNum, reward, bounty, text, mentions: [`${aNum}@c.us`, `${bNum}@c.us`] };
}

module.exports = { winProbability, resolveFight };
