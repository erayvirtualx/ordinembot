const { levelOf, incomeMult, rankOf } = require('../lib/level');
const { addXp } = require('../lib/xp');
const quests = require('../lib/quests');
const achievements = require('../lib/achievements');
const { short, fmt } = require('../lib/format');

const JOBS = require('../config').economy.jobs;
const aliasMap = {};
for (const [id, j] of Object.entries(JOBS)) for (const a of j.aliases) aliasMap[a] = id;

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const timeLeft = (ms) => {
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)}sa ${m % 60}dk` : `${m}dk`;
};

module.exports = {
  name: [...Object.keys(aliasMap), 'isler', 'işler'],
  run: async ({ msg, cmd, senderNum, db }) => {
    const u = db.user(senderNum);
    const lvl = levelOf(u.xp);
    const mult = incomeMult(lvl);

    if (cmd === 'isler' || cmd === 'işler') {
      const lines = Object.entries(JOBS).map(([id, j]) => {
        const left = (u.cd[id] || 0) - Date.now();
        const state = left > 0 ? `⏳ ${timeLeft(left)}` : '✅ hazır';
        return `• *.${id}* — ${short(j.min * mult)} ~ ${short(j.max * mult)} TL, +${j.xp} XP (${timeLeft(j.cooldownMs)} bekleme) ${state}`;
      });
      return msg.reply(`💼 *Legal İşler* (Seviye ${lvl} — ${rankOf(lvl)})\n\n${lines.join('\n')}\n\nSeviye atladıkça gelirin katlanır. En büyük XP kaynağı grupta sohbet etmek! (.seviye)`);
    }

    const id = aliasMap[cmd];
    const job = JOBS[id];
    const left = (u.cd[id] || 0) - Date.now();
    if (left > 0) return msg.reply(`⏳ *.${id}* için ${timeLeft(left)} beklemelisin.`);

    let pay = job.min + Math.random() * (job.max - job.min);
    let extra = '';
    if (job.rare && Math.random() < job.rare.chance) { pay *= job.rare.mult; extra = `\n${job.rare.text} (x${job.rare.mult})`; }
    pay = Math.floor(pay * mult);

    u.balance += pay;
    u.cd[id] = Date.now() + job.cooldownMs;
    const r = addXp(u, job.xp);

    const questsDone = quests.addProgress(u, 'job', 1)
      .concat(quests.addProgress(u, 'earn', pay))
      .concat(id === 'maden' || id === 'ciftlik' ? quests.addProgress(u, 'bigjob', 1) : []);
    const unlocked = achievements.checkLevel(u, r.after);
    const wealthA = achievements.checkWealth(u); if (wealthA) unlocked.push(wealthA);
    db.save();

    let out = `💼 ${pick(job.texts)}: *+${short(pay)} TL*, *+${job.xp} XP*${extra}\nCüzdan: ${fmt(u.balance)}`;
    if (r.levelUp) out += `\n\n🎉 *Seviye atladın! Seviye ${r.after} — ${rankOf(r.after)}* (gelir çarpanı x${short(incomeMult(r.after))})`;
    for (const q of questsDone) out += `\n\n✅ *Görev tamam:* ${q.desc} — +${fmt(q.reward)} TL`;
    for (const a of unlocked) out += `\n\n🏆 *Başarım:* ${a.name} — +${fmt(a.reward)} TL`;
    return msg.reply(out);
  }
};
