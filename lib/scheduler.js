const db = require('./db');
const { economy } = require('../config');
const { fmt } = require('./format');
const TZ_MS = (economy.level.tzOffsetHours || 3) * 3600000;

const fs = require('fs');
const path = require('path');
const BACKUP_DIR = './backups';
let lastBackupAt = 0;

// data.json'ı backups/ altına zaman damgalı kopyalar. .otoyedek <süre> ile açılır.
function backupIfDue() {
  const cfg = db.data.settings.autoBackup;
  if (!cfg || !cfg.everyMs) return null;
  const now = Date.now();
  if (now - lastBackupAt < cfg.everyMs) return null;
  if (!fs.existsSync('./data.json')) return null;
  lastBackupAt = now;
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const name = `wabot-${new Date(now).toISOString().replace(/[:.]/g, '-')}.json`;
    fs.copyFileSync('./data.json', path.join(BACKUP_DIR, name));
    // En eski 20 yedeği temizle.
    const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json')).sort();
    for (const old of files.slice(0, Math.max(0, files.length - 20))) fs.unlinkSync(path.join(BACKUP_DIR, old));
    return name;
  } catch (e) {
    console.error('otomatik yedek hatası:', e.message);
    return null;
  }
}

function startScheduler(client) {
  setInterval(async () => {
    // --- Hatırlatıcılar ---
    const rems = db.data.reminders || [];
    const due = rems.filter((r) => r.at <= Date.now());
    if (due.length) {
      db.data.reminders = rems.filter((r) => r.at > Date.now());
      db.save();
      for (const r of due) {
        client.sendMessage(r.chatId, `⏰ @${r.userId.split('@')[0]} hatırlatma: ${r.text}`, { mentions: [r.userId] }).catch(() => {});
      }
    }
    // --- Zamanlı grup mesajları (dakikada bir kontrol) ---
    const now = new Date(Date.now() + TZ_MS);
    const hhmm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const today = now.toISOString().slice(0, 10);
    for (const [chatId, g] of Object.entries(db.data.groups || {})) {
      for (const sch of g.scheduled || []) {
        if (sch.time === hhmm && sch.lastSent !== today) {
          sch.lastSent = today;
          client.sendMessage(chatId, `📅 ${sch.text}`).catch(() => {});
        }
      }
    }
    // --- Kredi faizi (günde bir kez, kullanıcı bazlı) ---
    const day = require('./quests').dayIndex();
    for (const u of Object.values(db.data.users)) {
      if (u.debt > 0 && (u.lastInterestDay || 0) < day) {
        u.debt = Math.ceil(u.debt * (1 + economy.credit.dailyInterest));
        u.lastInterestDay = day;
      }
    }

    // --- Açık artırma kapanışı ---
    for (const [chatId, g] of Object.entries(db.data.groups || {})) {
      if (g.auction && g.auction.endsAt <= Date.now()) {
        const a = g.auction; g.auction = null;
        const seller = db.user(a.sellerId);
        if (a.currentBidder) {
          const buyer = db.user(a.currentBidder);
          if (buyer.balance >= a.currentBid) {
            buyer.balance -= a.currentBid; seller.balance += a.currentBid; buyer.inventory.push(a.itemId);
            client.sendMessage(chatId, `🔨 Açık artırma bitti! *${a.itemName}* → @${a.currentBidder} (${fmt(a.currentBid)} TL)`, { mentions: [`${a.currentBidder}@c.us`] }).catch(() => {});
          } else {
            seller.inventory.push(a.itemId);
            client.sendMessage(chatId, `🔨 Açık artırma bitti! Kazanan yeterli bakiyeye sahip değildi, eşya sahibine iade edildi: *${a.itemName}*`).catch(() => {});
          }
        } else {
          seller.inventory.push(a.itemId);
          client.sendMessage(chatId, `🔨 Açık artırma bitti, teklif gelmedi. *${a.itemName}* sahibine iade edildi.`).catch(() => {});
        }
      }
    }

    // --- Otomatik yedek (.otoyedek ile açılır) ---
    const made = backupIfDue();
    if (made) console.log(`[scheduler] Otomatik yedek alındı: ${made}`);

    db.save();
  }, 30000);
}
module.exports = { startScheduler, backupIfDue, BACKUP_DIR };
