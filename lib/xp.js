const { economy } = require('../config');
const { levelOf } = require('./level');
const quests = require('./quests');
const achievements = require('./achievements');

const dayIndex = () => Math.floor((Date.now() + economy.level.tzOffsetHours * 3600000) / 86400000);

function addXp(u, amount) {
  const before = levelOf(u.xp);
  u.xp += amount;
  const after = levelOf(u.xp);
  return { before, after, levelUp: after > before };
}

// Gruptaki her mesaj (komutlar dahil) cooldown + günlük limit dahilinde XP verir.
function onMessage(u, body) {
  const c = economy.level.message;
  const text = (body || '').trim();
  if (text.length < c.minLength) return null;
  const now = Date.now();
  if (now - (u.lastMsgXp || 0) < c.cooldownMs) return null;
  if (text === u.lastBody) return null;                 // aynı mesajı tekrar edene XP yok
  const today = dayIndex();
  if (u.msgXpDay !== today) { u.msgXpDay = today; u.msgXpToday = 0; }
  if ((u.msgXpToday || 0) >= c.dailyCap) return null;
  let gain = c.min + Math.floor(Math.random() * (c.max - c.min + 1));
  gain = Math.min(gain, c.dailyCap - u.msgXpToday);
  u.lastMsgXp = now; u.lastBody = text; u.msgXpToday += gain; u.msgs = (u.msgs || 0) + 1;
  const base = addXp(u, gain);
  const questsDone = quests.addProgress(u, 'msg', 1);
  const unlocked = base.levelUp ? achievements.checkLevel(u, base.after) : [];
  if (u.msgs === 100) { const a = achievements.grant(u, 'yuz_mesaj'); if (a) unlocked.push(a); }
  return { gain, ...base, questsDone, unlocked };
}

module.exports = { addXp, onMessage, dayIndex };
