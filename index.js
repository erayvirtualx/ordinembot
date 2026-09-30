const fs = require('fs');
const path = require('path');

// WhatsApp Web 2.3000.x renamed lastReceivedKey._serialized to $1.
// Patch whatsapp-web.js 1.34.7 before it injects Utils.js into Chromium.
const wwebUtils = path.join(__dirname, 'node_modules', 'whatsapp-web.js', 'src', 'util', 'Injected', 'Utils.js');
if (fs.existsSync(wwebUtils)) {
  const source = fs.readFileSync(wwebUtils, 'utf8');
  const oldKey = 'chat.lastReceivedKey._serialized';
  const newKey = 'chat.lastReceivedKey._serialized || chat.lastReceivedKey.$1';
  if (source.includes(oldKey) && !source.includes(newKey)) fs.writeFileSync(wwebUtils, source.replaceAll(oldKey, newKey), 'utf8');
}

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('./lib/db');
const handler = require('./lib/handler');
const msgcache = require('./lib/msgcache');
const { startScheduler } = require('./lib/scheduler');
const logger = require('./lib/logger');
const { startDashboard } = require('./lib/dashboard');
let config = require('./config');

function loadCommands() {
  const pluginFiles = fs.readdirSync('./plugins').filter((f) => f.endsWith('.js'));
  const commands = new Map();
  for (const f of pluginFiles) {
    const plugin = require('./plugins/' + f);
    for (const name of [].concat(plugin.name)) {
      if (commands.has(name)) console.warn(`⚠️ Komut çakışması: ".${name}" birden fazla dosyada tanımlı (${f} içindeki eziyor).`);
      commands.set(name, plugin);
    }
  }
  console.log(`${commands.size} komut yüklendi.`);
  return commands;
}

let commands = loadCommands();

// Servis durumu: hangi API anahtarları gerçekten yüklendi, hangileri eksik.
{
  const api = require('./lib/apihealth');
  const durum = api.apiDurumu(config);
  const eksik = api.eksikler(config);
  console.log('Servisler: ' + Object.values(durum).join(' · '));
  if (eksik.length) {
    console.log('⚠️ Eksikler:');
    for (const e of eksik) console.log('   • ' + e);
  }
}

const clients = new Map();
const reconnectTimers = new Map();

function isViewOnce(msg) {
  return !!(msg?.isViewOnce || msg?.rawData?.isViewOnce || msg?._data?.isViewOnce);
}

async function handlePrivacy(client, msg) {
  if (msg.fromMe) return;
  if (!client.info?.wid) return;
  try {
    if (msg.isStatus && db.data.settings.autoStatusSeen) {
      const chat = await msg.getChat().catch(() => null);
      if (chat?.sendSeen) await chat.sendSeen();
      else if (typeof client.sendSeen === 'function') await client.sendSeen('status@broadcast');
      logger.add(db, 'status_seen', { session: client.sessionId, sender: msg.author || msg.from });
      return;
    }
    if (isViewOnce(msg) && db.data.settings.viewOnceInbox) {
      const media = await msg.downloadMedia().catch(() => null);
      const ownerId = `${client.config.owner}@c.us`;
      if (media) await client.sendMessage(ownerId, media, { caption: `Tek görüntülemelik içerik · ${msg.author || msg.from}` });
      else await client.sendMessage(ownerId, `Tek görüntülemelik bir içerik geldi ancak WhatsApp Web erişilebilir medya vermedi. Gönderen: ${msg.author || msg.from}`);
      logger.add(db, 'view_once_received', { session: client.sessionId, sender: msg.author || msg.from, mediaCopied: !!media });
    }
  } catch (e) { logger.add(db, 'privacy_feature_error', { session: client.sessionId, error: e.message }); }
}

function setupClient(sessionId) {
  const client = new Client({
    authStrategy: new LocalAuth({ clientId: sessionId }),
    puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  });
  client.sessionId = sessionId;
  client.commands = commands;
  client.config = config;
  clients.set(sessionId, client);

  let pairingRequested = false;
  client.on('qr', (qr) => {
    const phone = process.env.PAIRING_PHONE;
    if (phone && !pairingRequested && typeof client.requestPairingCode === 'function') {
      pairingRequested = true;
      client.requestPairingCode(phone.replace(/\D/g, '')).then((code) => console.log(`[${sessionId}] WhatsApp bağlantı kodu: ${code}`)).catch((e) => logger.add(db, 'pairing_code_error', { session: sessionId, error: e.message }));
      return;
    }
    console.log(`[${sessionId}] QR kodu okut.`); qrcode.generate(qr, { small: true });
  });
  client.on('ready', () => { reconnectTimers.delete(sessionId); console.log(`[${sessionId}] Bot hazır ✅`); logger.add(db, 'ready', { session: sessionId }); });
  // --- Yeni eklentiler ---
  const acks = require('./lib/acks');
  const polls = require('./lib/polls');
  const autodl = require('./plugins/autodl');

  // İletim durumu yalnızca botun gönderdiği mesajlar için anlamlıdır.
  client.on('message_create', (msg) => {
    if (!client.info?.wid) return;                // Client hazır değilse çık
    
    // Kendi mesajlarımız: prefix ile başlıyorsa komut olarak işle, aksi halde sadece ack takip et
    if (msg.fromMe) {
      acks.track(msg);
      const body = msg.body || '';
      if (body.startsWith(client.config.prefix)) {
        return handler(client, msg);
      }
      return;
    }
    
    // Başkalarının mesajları: her zaman handler'a gönder
    return handler(client, msg);
  });

  client.on('message', async (msg) => {
    if (!client.info?.wid) return;        // Client hazır değilse çık
    await handlePrivacy(client, msg);
    if (msg.fromMe) return;

    if (db.data.settings.autoReact && !msg.isStatus && typeof msg.react === 'function') {
      const reactions = ['👍', '❤️', '😂', '🔥', '👏'];
      await msg.react(reactions[Math.floor(Math.random() * reactions.length)]).catch(() => {});
    }

    const chat = await msg.getChat().catch(() => null);
    if (!chat || !chat.isGroup) return;
    const g = db.group(chat.id._serialized);

    if (g.autoread) await chat.sendSeen().catch(() => {});
    if (g.autotyping) {
      await client.sendPresenceAvailable().catch(() => {});
      setTimeout(() => client.sendPresenceUnavailable().catch(() => {}), 4000);
    }
    if (g.pmblocker) {
      const me = client.info.wid._serialized;
      const p = chat.participants.find((x) => x.id._serialized === msg.author);
      if (msg.author && p && !p.isAdmin && msg.author !== me) await msg.reply('Bu bot yalnızca gruplarda çalışıyor.').catch(() => {});
    }
    if (g.autoDownload) await autodl.handle(client, msg, chat, db, client.config).catch(() => {});
  });

  // İletim durumu takibi (.takip komutu)
  client.on('message_ack', (msg, ack) => acks.update(msg, ack));

  // Anket oyu anlık takibi
  client.on('vote_update', (vote) => {
    try { polls.record(vote); } catch (e) { console.error('vote_update:', e.message); }
  });

  // Gruba katılma başvuruları
  client.on('group_membership_request', async (req) => {
    try {
      const g = db.group(req.chatId);
      if (g.autoApprove) {
        await client.approveGroupMembershipRequests(req.chatId, { requesterIds: [req.id._serialized] });
        logger.add(db, 'membership_auto_approved', { session: sessionId, chatId: req.chatId, user: req.id.user });
        return;
      }
      const chat = await client.getChatById(req.chatId).catch(() => null);
      if (chat && g.announceRequests) {
        await chat.sendMessage(`🙋 Gruba katılmak isteyen: @${req.id.user}\nOnay: .onayla ${req.id.user} · Ret: .onayreddet ${req.id.user}`, { mentions: [req.id._serialized] });
      }
      logger.add(db, 'membership_request', { session: sessionId, chatId: req.chatId, user: req.id.user });
    } catch (e) { logger.add(db, 'membership_request_error', { session: sessionId, error: e.message }); }
  });
  client.on('call', async (call) => {
    if (!db.data.settings.antiCall || call.fromMe) return;
    try { await call.reject(); logger.add(db, 'call_rejected', { session: sessionId, caller: call.from }); }
    catch (e) { logger.add(db, 'call_reject_error', { session: sessionId, error: e.message }); }
  });

  client.on('group_join', async (n) => {
    try {
      const chat = await client.getChatById(n.chatId);
      const g = db.group(n.chatId);
      if (!g.welcomeEnabled) return;
      for (const id of n.recipientIds) await chat.sendMessage(g.welcome.replace('@user', '@' + id.split('@')[0]), { mentions: [id] });
      logger.add(db, 'group_join', { session: sessionId, chatId: n.chatId, users: n.recipientIds });
    } catch (e) { logger.add(db, 'group_join_error', { session: sessionId, error: e.message }); }
  });

  client.on('group_leave', async (n) => {
    try {
      const g = db.group(n.chatId);
      if (!g.goodbyeEnabled) return;
      const leaving = n.recipientIds || [];
      const botId = client.info?.wid?._serialized;
      if (leaving.includes(botId)) return;
      const chat = await client.getChatById(n.chatId);
      for (const id of leaving) await chat.sendMessage(g.goodbye.replace('@user', '@' + id.split('@')[0]), { mentions: [id] });
      logger.add(db, 'group_leave', { session: sessionId, chatId: n.chatId, users: leaving });
    } catch (e) { logger.add(db, 'group_leave_error', { session: sessionId, error: e.message }); }
  });

  client.on('message_revoke_everyone', async (msg, revoked) => {
    try {
      const chat = await msg.getChat();
      if (!chat.isGroup) return;
      const g = db.group(chat.id._serialized);
      if (!g.antidelete) return;
      const cached = revoked && revoked.id ? msgcache.get(revoked.id._serialized) : null;
      if (!cached || !cached.body) return;
      await chat.sendMessage(`🗑️ @${cached.author.split('@')[0]} bir mesaj sildi:\n"${cached.body}"`, { mentions: [cached.author] });
    } catch (e) { console.error('antidelete hatası:', e); }
  });

  client.on('message_edit', async (msg, newBody, prevBody) => {
    try {
      const chat = await msg.getChat();
      if (!chat.isGroup) return;
      const g = db.group(chat.id._serialized);
      if (!g.antiedit) return;
      await chat.sendMessage(`✏️ @${(msg.author || msg.from).split('@')[0]} mesajını düzenledi:\n"${prevBody}" → "${newBody}"`, { mentions: [msg.author || msg.from] });
    } catch (e) { console.error('antiedit hatası:', e); }
  });

  client.on('disconnected', (reason) => {
    logger.add(db, 'disconnected', { session: sessionId, reason: String(reason) });
    if (reconnectTimers.has(sessionId)) return;
    const attempts = client.reconnectAttempts || 0;
    const delay = Math.min(5000 * (2 ** attempts), 120000);
    client.reconnectAttempts = attempts + 1;
    const timer = setTimeout(() => client.initialize().catch((e) => logger.add(db, 'reconnect_error', { session: sessionId, error: e.message })), delay);
    reconnectTimers.set(sessionId, timer);
    console.warn(`[${sessionId}] Bağlantı koptu; ${Math.round(delay / 1000)} sn sonra yeniden bağlanılacak.`);
  });

  client.on('auth_failure', (error) => logger.add(db, 'auth_failure', { session: sessionId, error }));
  return client;
}

for (const [index, sessionId] of config.sessionIds.entries()) {
  const client = setupClient(sessionId);
  setTimeout(() => client.initialize().catch((e) => logger.add(db, 'initialize_error', { session: sessionId, error: e.message })), index * 5000);
}

const primary = clients.values().next().value;
if (primary) startScheduler(primary);
startDashboard({ clients, db, config, logger });

process.on('unhandledRejection', (e) => {
  console.error('Yakalanmayan hata:', e);
  logger.add(db, 'unhandled_rejection', { error: e?.message || String(e) });
  if (config.logChatId && primary) primary.sendMessage(config.logChatId, `⚠️ Bot hatası: ${e.message || e}`).catch(() => {});
});
