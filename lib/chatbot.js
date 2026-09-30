const { complete } = require('./ai');
const CHARACTERS = require('./characters');
const conversations = new Map();

function botMentioned(client, msg) {
  const botId = client.info?.wid?._serialized;
  return !!botId && (msg.mentionedIds || []).includes(botId);
}

async function maybeReply(client, msg, chat, senderNum, db, config) {
  if (msg.fromMe || msg.isStatus || msg.isViewOnce || msg.hasMedia || !msg.body || msg.body.startsWith(config.prefix)) return false;
  const enabled = chat.isGroup ? db.group(chat.id._serialized).chatbotEnabled && botMentioned(client, msg) : !!db.data.settings.autoAI;
  if (!enabled) return false;

  const text = chat.isGroup ? msg.body.replace(/@\d+/g, '').trim() : msg.body.trim();
  if (!text) return false;
  const id = `${chat.id._serialized}:${senderNum}`;
  const history = conversations.get(id) || [];
  history.push({ role: 'user', content: text });
  try {
    if (typeof chat.sendStateTyping === 'function') await chat.sendStateTyping();
    const user = db.user(senderNum);
    const system = `${config.personalities[user.personality || 'normal']}${CHARACTERS[user.character] ? ` ${CHARACTERS[user.character]}` : ''}`;
    const answer = await complete(config, system, history.slice(-8));
    history.push({ role: 'assistant', content: answer });
    conversations.set(id, history.slice(-8));
    await msg.reply(answer);
    return true;
  } catch (e) {
    console.error('AI otomatik yanıt hatası:', e.message);
    return false;
  }
}

function clear(senderNum) {
  for (const key of conversations.keys()) if (key.endsWith(`:${senderNum}`)) conversations.delete(key);
}

module.exports = { maybeReply, clear };
