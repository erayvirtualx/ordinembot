const { economy } = require('../config');
const curve = economy.level.xpCurve;
const levelOf = (xp) => Math.floor(0.5 + Math.sqrt(0.25 + xp / curve));
const xpForLevel = (L) => curve * L * (L - 1);            // seviye L'ye ulaşmak için gereken toplam XP
const incomeMult = (L) => Math.pow(economy.levelGrowth, L - 1);
const rankOf = (L) => {
  let r = economy.level.ranks[0][1];
  for (const [min, name] of economy.level.ranks) if (L >= min) r = name;
  return r;
};
module.exports = { levelOf, xpForLevel, incomeMult, rankOf };
