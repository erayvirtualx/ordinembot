const { levelOf } = require('./level');
const { dayIndex } = require('./xp');

// XP determines most of a player's strength; duel wins provide a smaller bonus.
const WIN_SCORE = 500;
const BOUNTIES = [8000, 6500, 5000, 3500];

function getYonkou(db) {
  return Object.entries(db.data.users || {})
    .map(([id, user]) => {
      const xp = Number(user.xp) || 0;
      const wins = Number(user.duelWins) || 0;
      return { id, xp, wins, level: levelOf(xp), score: xp + wins * WIN_SCORE };
    })
    .sort((a, b) => b.score - a.score || b.xp - a.xp || b.wins - a.wins || a.id.localeCompare(b.id))
    .slice(0, 4)
    .map((player, index) => ({ ...player, rank: index + 1, bounty: BOUNTIES[index] }));
}

function awardBounty(db, winnerNum, defeatedNum, roster) {
  const yonkou = roster.find((player) => player.id === defeatedNum);
  if (!yonkou) return 0;

  const today = dayIndex();
  if (!db.data.yonkouBountyClaims || db.data.yonkouBountyClaims.day !== today) {
    db.data.yonkouBountyClaims = { day: today, claims: {} };
  }

  const key = `${winnerNum}:${defeatedNum}`;
  if (db.data.yonkouBountyClaims.claims[key]) return 0;

  db.data.yonkouBountyClaims.claims[key] = true;
  db.user(winnerNum).balance += yonkou.bounty;
  return yonkou.bounty;
}

module.exports = { WIN_SCORE, getYonkou, awardBounty };
