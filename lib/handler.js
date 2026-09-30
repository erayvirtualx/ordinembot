const db = require('./db');
const protection = require('./protection');
const xp = require('./xp');
const { rankOf } = require('./level');
const msgcache = require('./msgcache');
const { checkAfk } = require('./afk');
const logger = require('./logger');
const chatbot = require('./chatbot');
const perm = require('./perm');
const cooldowns = new Map();
const num = (id) => (id || '').split('@')[0];

module.exports = async function handler(client, msg) {
  // Client henüz hazır değilse (sayfa yüklenmedi/bağlantı yok) sessizce çık
  if (!client?.info?.wid) return;
  try {
    const body = msg.body || '';
    if (msg.fromMe && !body.startsWith(client.config.prefix)) return;
    let chat;
    try { chat = await msg.getChat(); } catch (e) { console.error('[HANDLER] getChat failed:', e?.stack || e); return; }
    if (!chat) return;
    const sender = msg.fromMe ? client.info.wid._serialized : (msg.author || msg.from);
    const senderNum = num(sender);
    const isOwner = senderNum === client.config.owner || msg.fromMe;
    const isSudo = db.data.sudo.includes(senderNum);
    const isGroup = chat.isGroup;

    if (!msg.isStatus) {
      logger.add(db, msg.fromMe ? 'outgoing' : 'incoming', { chatId: chat.id._serialized, sender: senderNum, type: msg.type || 'chat' });
      logger.message(db, { at: Date.now(), chatId: chat.id._serialized, sender: senderNum, fromMe: !!msg.fromMe, body: msg.body || '', isStatus: !!msg.isStatus, isViewOnce: !!msg.rawData?.isViewOnce });
    }

    if (!msg.fromMe) msgcache.remember(msg);
    if (db.data.banned.includes(senderNum) && !isOwner) return;

    if (isGroup && !msg.fromMe) {
      const g = db.group(chat.id._serialized);
      const muteUntil = g.mutes && g.mutes[sender];
      if (muteUntil) {
        if (muteUntil > Date.now()) { await msg.delete(true).catch(() => {}); return; }
        delete g.mutes[sender]; db.save();
      }
    }
    if (!msg.fromMe) await checkAfk(client, msg, chat, sender).catch(() => {});
    if (isGroup && !msg.fromMe) {
      const removed = await protection(client, msg, chat, sender, isOwner);
      if (!removed) {
        const r = xp.onMessage(db.user(senderNum), body);
        if (r) {
          db.save();
          if (r.levelUp) chat.sendMessage(`🎉 @${senderNum} seviye atladı! *Seviye ${r.after}* — ${rankOf(r.after)}`, { mentions: [sender] }).catch(() => {});
          for (const q of r.questsDone || []) chat.sendMessage(`✅ @${senderNum} görev tamamladı: ${q.desc} (+${q.reward} TL)`, { mentions: [sender] }).catch(() => {});
          for (const a of r.unlocked || []) chat.sendMessage(`🏆 @${senderNum} başarım kazandı: ${a.name} (+${a.reward} TL)`, { mentions: [sender] }).catch(() => {});
        }
      }
    }

    if (!body.startsWith(client.config.prefix)) {
      if (isGroup) await require('../plugins/games_text').checkQuizAnswer(msg, chat, senderNum, db).catch(() => {});
      if (isGroup && !msg.fromMe) {
        const keywords = db.group(chat.id._serialized).keywords || {};
        const text = body.toLocaleLowerCase('tr');
        const matched = Object.keys(keywords).sort((a, b) => b.length - a.length).find((word) => word && text.includes(word));
        if (matched) { await chat.sendMessage(keywords[matched]); return; }
      }
      await chatbot.maybeReply(client, msg, chat, senderNum, db, client.config).catch(() => {});
      return;
    }
    const [cmd, ...args] = body.slice(client.config.prefix.length).trim().split(/\s+/);
    console.log('[HANDLER] cmd:', cmd, '| fromMe:', msg.fromMe, '| sender:', senderNum, '| prefix:', client.config.prefix);
    const plugin = client.commands.get(cmd.toLowerCase());
    console.log('[HANDLER] plugin found:', !!plugin, '| plugin.name:', plugin?.name);
    if (!plugin) return;

    const mode = db.data.settings.mode || client.config.defaultMode;
    if (mode === 'private' && !isOwner && !isSudo) return;

    let isAdmin = false;
    if (isGroup) {
      const p = chat.participants.find((x) => x.id._serialized === sender);
      isAdmin = !!(p && p.isAdmin);
    }

    // Komut bazlı yetki şartı (lib/perm.js): all | admin | owner
    const key = cmd.toLowerCase();
    const denied = perm.check(perm.spec(plugin, key), { isGroup, isAdmin, isOwner, isSudo });
    if (denied) return msg.reply(denied);

    const last = cooldowns.get(sender) || 0;
    if (Date.now() - last < client.config.cooldownMs && !isOwner) return;
    cooldowns.set(sender, Date.now());

    await plugin.run({ client, msg, chat, args, cmd: cmd.toLowerCase(), sender, senderNum, isOwner, isSudo, isAdmin, isGroup, db, config: client.config });
  } catch (e) {
    console.error('Handler hatası:', e);
  }
};
