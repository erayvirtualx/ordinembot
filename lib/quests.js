const { economy } = require('../config');
const TZ_MS = (economy.level.tzOffsetHours || 3) * 3600000;
const dayIndex = () => Math.floor((Date.now() + TZ_MS) / 86400000);

const POOL = [
  { id: 'work3',   desc: '💼 3 iş tamamla',                         type: 'job',    target: 3,     reward: 15000 },
  { id: 'earn50k', desc: '💰 Toplam 50.000 TL kazan (iş+oyun)',      type: 'earn',   target: 50000, reward: 20000 },
  { id: 'win3',    desc: '🎲 3 kumar oyunu kazan',                   type: 'win',    target: 3,     reward: 25000 },
  { id: 'msg20',   desc: '💬 Grupta 20 mesaj yaz',                   type: 'msg',    target: 20,    reward: 10000 },
  { id: 'bigjob1', desc: '🌾 Bir maden ya da çiftlik işi yap',        type: 'bigjob', target: 1,     reward: 8000 },
];

function ensureDaily(u) {
  const day = dayIndex();
  if (!u.quests || u.quests.day !== day) {
    const picked = [...POOL].sort(() => Math.random() - 0.5).slice(0, 3);
    u.quests = { day, list: picked.map((q) => ({ ...q, progress: 0, done: false })) };
  }
  return u.quests;
}

// Tamamlanan görevleri döndürür (yeni tamamlananlar), ödülü otomatik verir.
function addProgress(u, type, amount = 1) {
  const q = ensureDaily(u);
  const completed = [];
  for (const item of q.list) {
    if (item.done || item.type !== type) continue;
    item.progress = Math.min(item.target, item.progress + amount);
    if (item.progress >= item.target) { item.done = true; u.balance += item.reward; completed.push(item); }
  }
  return completed;
}

module.exports = { ensureDaily, addProgress, dayIndex, POOL };
