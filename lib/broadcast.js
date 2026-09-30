// Toplu kişisel mesaj gönderimi. WhatsApp spam korumasına karşı istekler arası bekleme,
// hız sınırı ve iptal desteği içerir.
const pending = new Map(); // jobId -> { cancelled, sent, failed, total, target }
const jobs = new Map();     // ownerNum -> jobId (aynı sahibin eşzamanlı iki işi olmasın)

let seq = 0;
const newJobId = () => `blast_${Date.now()}_${++seq}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Hedef listesini çıkarır: kayıtlı kullanıcılar + WhatsApp yayın listeleri.
function targets(db, client) {
  const out = new Set();
  for (const n of Object.keys(db.data.users || {})) out.add(`${n}@c.us`);
  for (const c of db.data.contacts || []) out.add(c.includes('@') ? c : `${c}@c.us`);
  return [...out];
}

function createJob(ownerNum, total) {
  if (jobs.has(ownerNum)) return null;
  const id = newJobId();
  const job = { id, ownerNum, cancelled: false, sent: 0, failed: 0, total, startedAt: Date.now() };
  jobs.set(ownerNum, id);
  pending.set(id, job);
  return job;
}

function finish(ownerNum, id) {
  if (jobs.get(ownerNum) === id) jobs.delete(ownerNum);
  setTimeout(() => pending.delete(id), 60 * 60 * 1000);
}

function cancel(id) {
  const job = pending.get(id);
  if (job) job.cancelled = true;
  return !!job;
}

function isRunning(ownerNum) {
  const id = jobs.get(ownerNum);
  return id ? pending.get(id) : null;
}

// content: string | { media: MessageMedia, caption?: string }
async function blast({ client, db, config, ownerNum, content, limit, onProgress }) {
  const list = targets(db, client);
  // config.broadcastMaxPerRun, tek çalıştırmada gönderilecek azami kişi sayısıdır (WhatsApp limit koruması).
  const maxRun = config.broadcastMaxPerRun || 1000;
  const requested = limit || list.length;
  const cap = Math.min(requested, maxRun);
  const capped = list.slice(0, cap);
  const job = createJob(ownerNum, capped.length);
  if (!job) return { started: false, reason: 'running' };

  const delay = config.broadcastDelayMs || 1200;
  const started = Date.now();

  for (let i = 0; i < capped.length; i++) {
    if (job.cancelled) break;
    const to = capped[i];
    try {
      if (typeof content === 'string') await client.sendMessage(to, content);
      else await client.sendMessage(to, content.media, { caption: content.caption, sendMediaAsDocument: false });
      job.sent++;
    } catch (e) {
      if (!/not-authorized|not-authorized|invalid|404|gone|blocked/i.test(e.message)) console.error('blast hatası:', to, e.message);
      job.failed++;
    }
    if (onProgress && (i % 10 === 0 || i === capped.length - 1)) onProgress(i + 1, capped.length, job);
    if (i < capped.length - 1) await sleep(delay);
  }

  finish(ownerNum, job.id);
  return {
    started: true,
    total: capped.length,
    available: list.length,
    truncated: list.length > capped.length,
    sent: job.sent,
    failed: job.failed,
    cancelled: job.cancelled,
    seconds: Math.round((Date.now() - started) / 1000)
  };
}

module.exports = { blast, targets, isRunning, cancel, jobs };
