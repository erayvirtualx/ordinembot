const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠️', '♥️', '♦️', '♣️'];
const val = (r) => (r === 'A' ? 11 : ['J', 'Q', 'K'].includes(r) ? 10 : parseInt(r, 10));
const mk = (r) => ({ r, s: SUITS[Math.floor(Math.random() * 4)] });
const draw = () => mk(RANKS[Math.floor(Math.random() * 13)]);
const ten = () => mk(['10', 'J', 'Q', 'K'][Math.floor(Math.random() * 4)]);

function total(cards) {
  let t = 0, a = 0;
  for (const c of cards) { t += val(c.r); if (c.r === 'A') a++; }
  while (t > 21 && a > 0) { t -= 10; a--; }
  return t;
}
const isBJ = (cards) => cards.length === 2 && total(cards) === 21;
function isSoft(cards) {
  const hard = cards.reduce((t, c) => t + (c.r === 'A' ? 1 : val(c.r)), 0);
  return cards.some((c) => c.r === 'A') && hard + 10 <= 21;
}
const show = (cards) => cards.map((c) => c.r + c.s).join(' ');

function combos(S, n) {
  const out = [];
  const rec = (k, rem, cur) => {
    if (k === 0) { if (rem === 0) out.push(cur); return; }
    for (let v = 2; v <= 10; v++) if (v <= rem) rec(k - 1, rem - v, [...cur, v]);
  };
  rec(n, S, []);
  return out;
}
const cardOf = (v) => (v === 10 ? ten() : mk(String(v)));

// Risk sistemi: oyuncu kazanacakken krupiyenin eli, oyuncuyu geçecek (veya berabere getirecek) şekilde kurulur.
function forcedDealer(up, pt) {
  const upV = val(up.r);
  const lo = Math.max(17, pt + 1);
  const T = pt >= 21 ? 21 : lo + Math.floor(Math.random() * (21 - lo + 1));
  const S = T - upV;
  const minCards = pt >= 21 ? 2 : 1;
  for (let n = minCards; n <= 3; n++) {
    const list = combos(S, n);
    if (list.length) return [up, ...list[Math.floor(Math.random() * list.length)].map(cardOf)];
  }
  return null;
}

// plan: { flipP, boost }  flipP: kazanılan elin kaybettirilme ihtimali, boost: kazanç çarpanı
function deal(bet, plan = { flipP: 0, boost: 1 }) {
  const s = { bet, totalBet: bet, player: [draw(), draw()], dealer: [draw(), draw()], flip: Math.random() < plan.flipP, boost: plan.boost, doubled: false, over: false, outcome: null, gross: 0 };
  if (isBJ(s.player) && s.flip) s.dealer = Math.random() < 0.5 ? [mk('A'), ten()] : [ten(), mk('A')];
  if (isBJ(s.player) || isBJ(s.dealer)) return finish(s);
  return s;
}

function finish(s) {
  const pt = total(s.player), dt = total(s.dealer);
  const b = s.boost || 1;
  if (isBJ(s.player) && !isBJ(s.dealer)) { s.outcome = 'bj'; s.gross = Math.floor(s.totalBet * 2.5 * b); }
  else if (pt > 21) { s.outcome = 'lose'; s.gross = 0; }
  else if (isBJ(s.dealer) && !isBJ(s.player)) { s.outcome = 'lose'; s.gross = 0; }
  else if (dt > 21 || pt > dt) { s.outcome = 'win'; s.gross = Math.floor(s.totalBet * 2 * b); }
  else if (pt === dt) { s.outcome = 'push'; s.gross = s.totalBet; }
  else { s.outcome = 'lose'; s.gross = 0; }
  s.over = true;
  return s;
}

function dealerPlay(s) {
  const pt = total(s.player);
  if (pt <= 21) {
    let d = [...s.dealer];
    while (total(d) < 17) d.push(draw());
    const dt = total(d);
    const playerWouldWin = dt > 21 || dt < pt;
    if (s.flip && playerWouldWin) { const f = forcedDealer(s.dealer[0], pt); if (f) d = f; }
    s.dealer = d;
  }
  return finish(s);
}

function hit(s) {
  s.player.push(draw());
  const pt = total(s.player);
  if (pt > 21) return finish(s);
  if (pt === 21) return dealerPlay(s);
  return s;
}
const stand = (s) => dealerPlay(s);
function double(s) {
  s.totalBet = s.bet * 2; s.doubled = true;
  s.player.push(draw());
  return total(s.player) > 21 ? finish(s) : dealerPlay(s);
}

module.exports = { deal, hit, stand, double, total, isSoft, show, val };
