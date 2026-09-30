// Sahte WhatsApp istemcisi: testlerde eksik kalan her metot burada tanımlanır.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const config = require('../config');
const commands = new Map();
for (const f of fs.readdirSync('./plugins').filter((x) => x.endsWith('.js'))) {
  const plugin = require('../plugins/' + f);
  for (const n of [].concat(plugin.name)) commands.set(n, plugin);
}

const state = {
  sent: [],
  reactions: [],
  calls: [],
  labels: [{ id: '1', name: 'Önemli', hexColor: '#FF0000' }],
  labelChats: { 1: [{ name: 'Test Grubu' }] },
  chats: {},
  messages: [{ chat: { name: 'Test Grubu' }, body: 'bulunan mesaj', from: '111@s.whatsapp.net' }],
  requests: [{ id: { _serialized: '222@s.whatsapp.net', user: '222' }, method: 'InviteLink' }]
};

const groupChat = {
  id: { _serialized: '123@g.us', user: '123', server: 'g.us' },
  isGroup: true,
  name: 'Test Grubu',
  participants: [
    { id: { _serialized: '111@s.whatsapp.net', user: '111' }, isAdmin: false },
    { id: { _serialized: '999@s.whatsapp.net', user: '999' }, isAdmin: true },
    { id: { _serialized: 'BOT@c.us', user: 'BOT' }, isAdmin: true }
  ],
  sent: [],
  async sendMessage(content, opts) { this.sent.push(content); return makeMessage('out' + this.sent.length, this); },
  async sendSeen() { this.seen = true; return true; },
  async removeParticipants() { return true; },
  async getParticipants() { return this.participants; },
  async clearMessages() { this.cleared = true; },
  async getInviteCode() { return 'INV123'; },
  async revokeInvite() { return 'REV456'; },
  async leave() { return true; },
  async setSubject(v) { this.name = v; return true; },
  async setDescription(v) { this.desc = v; return true; },
  async setPicture() { return true; },
  async promote() { return true; },
  async demote() { return true; },
  async addParticipants() { return '999@s.whatsapp.net' },
  async ban() { return true; },
  async unban() { return true; },
  async setProfilePicture() { return true; },
  async deleteProfilePicture() { return true; },
  async setStatus() { return true; },
  async pinMessage() { return true; },
  async unpinAllMessages() { return true; },
  async getPinnedMessages() { return []; },
  async searchMessages() { return []; },
  async archive() {},
  async unarchive() {},
  async markUnread() {},
  async sendStateTyping() {},
  async getLabels() { return state.labels; },
  async changeLabels(ids) { state.chats.labels = ids; },
  async mute() { this.muted = true; },
  async unmute() { this.muted = false; }
};

const privateChat = {
  id: { _serialized: '111@c.us', user: '111', server: 'c.us' },
  isGroup: false,
  name: 'Test Kişi',
  participants: [],
  sent: [],
  async sendMessage(content, opts) { this.sent.push(content); return makeMessage('pout' + this.sent.length, this); },
  async sendSeen() { return true; },
  async getParticipants() { return []; },
  async getLabels() { return []; },
  async changeLabels() {},
  async clearMessages() { this.cleared = true; },
  async setDisplayName(v) { this.name = v; return true; },
  async archive() {},
  async unarchive() {},
  async markUnread() {},
  async sendStateTyping() {}
};

function makeMessage(id, chat) {
  const sent = [];
  return {
    id: { _serialized: id },
    from: chat.id._serialized,
    author: '111@s.whatsapp.net',
    fromMe: false,
    body: '.test',
    type: 'chat',
    hasMedia: false,
    hasQuotedMsg: false,
    isStatus: false,
    rawData: {},
    mentions: [],
    reactions: [],
    replied: [],
    async getChat() { return chat; },
    async getMentions() { return [{ id: { user: '222', _serialized: '222@s.whatsapp.net' } }]; },
    async getQuotedMessage() { return null; },
    async reply(text) { this.replied.push(text); return makeMessage(id + 'r' + this.replied.length, chat); },
    async react(e) { state.reactions.push(e); return true; },
    async edit(text) { this.edited = text; return true; },
    async delete() { return true; },
    async downloadMedia() { return { mimetype: 'image/png', data: Buffer.from('89504e470d0a1a0a', 'hex').toString('base64'), filename: 'x.png' }; },
    async downloadAndSendMsgAsMedia() { return makeMessage(id + 'd', chat); }
  };
}

const contact = (id) => ({
  id: { _serialized: id, user: id.split('@')[0] },
  name: 'Kişi ' + id.split('@')[0],
  isBusinessContact: false,
  isMyContact: false,
  blocked: false,
  async block() { this.blocked = true; return true; },
  async unblock() { this.blocked = false; return true; },
  async getAbout() { return 'Merhaba'; },
  async getCommonGroups() { return [{ _serialized: '123@g.us' }]; }
});

const client = {
  info: { wid: { _serialized: 'BOT@c.us', user: 'BOT' } },
  state: 'CONNECTED',
  commands,
  async sendMessage(chatId, content, opts) {
    state.sent.push({ chatId, content, opts });
    return makeMessage('out' + state.sent.length, chatId.includes('@g.us') ? groupChat : privateChat);
  },
  async sendPresenceAvailable() { state.calls.push('online'); },
  async sendPresenceUnavailable() { state.calls.push('offline'); },
  async sendSeen() { return true; },
  async archiveChat() { return true; },
  async unarchiveChat() { return true; },
  async markChatUnread() { return true; },
  async pinChat() { return true; },
  async unpinChat() { return true; },
  async muteChat() { return { isMuted: true, muteExpiration: Date.now() + 1000 } },
  async unmuteChat() { return { isMuted: false, muteExpiration: 0 } },
  async getChatById(id) {
    if (id.includes('@g.us')) { state.chats[id] = state.chats[id] || Object.assign({}, groupChat); return state.chats[id]; }
    return privateChat;
  },
  async getLabels() { return state.labels; },
  async getChatsByLabelId(id) { return state.labelChats[id] || []; },
  async searchMessages() { return state.messages; },
  async getCommonGroups() { return [{ _serialized: '123@g.us' }]; },
  async getBlockedContacts() { return [contact('555@c.us')]; },
  async getContactById(id) { return contact(id); },
  async getProfilePicUrl() { return 'https://example.com/pic.jpg'; },
  async getBroadcasts() { return []; },
  async createGroup(title, participants) { return { title, gid: { _serialized: '999@g.us' }, participants }; },
  async getGroupMembershipRequests() { return state.requests; },
  async approveGroupMembershipRequests() { return [{ userId: '222@s.whatsapp.net' }]; },
  async rejectGroupMembershipRequests() { return [{ userId: '222@s.whatsapp.net' }]; },
  async getPollVotes() { return [{ sender: '111@s.whatsapp.net', options: [{ name: 'Evet', localId: 1 }, { name: 'Hayır', localId: 2 }] }]; },
  async createCallLink() { return 'https://meet.whatsapp.com/test'; },
  async setAutoDownloadAudio() {}, async setAutoDownloadPhotos() {},
  async setAutoDownloadVideos() {}, async setAutoDownloadDocuments() {},
  async setBackgroundSync() {},
  async setProfilePicture() { return true; },
  async deleteProfilePicture() { return true; },
  async setStatus() {},
  async setDisplayName() { return true; },
  async getChannels() { return [{ id: { _serialized: '123@newsletter' }, name: 'Kanal', description: 'açıklama' }]; },
  async searchChannels() { return [{ id: { _serialized: '456@newsletter' }, name: 'Bulunan', description: 'd' }]; },
  async getChannelByInviteCode() { return { id: { _serialized: '456@newsletter' }, name: 'Bulunan' }; },
  async subscribeToChannel() { return true; },
  async unsubscribeFromChannel() { return true; },
  async createChannel(title) { return { title, gid: { _serialized: '789@newsletter' } }; },
  async removeParticipant() { return true; },
  async getChats() { return [groupChat, privateChat]; },
  async getAllContacts() { return [contact('111@s.whatsapp.net'), contact('222@s.whatsapp.net')]; },
  async getContactProfilePicUrl() { return 'https://example.com/pic.jpg'; },
  async sendPresenceAvailable() {},
  state_: state
};

// config.owner geçerli olsun ki handler testleri çalışsın
config.owner = '111';

module.exports = { client, state, groupChat, privateChat, makeMessage, contact, commands, config };
