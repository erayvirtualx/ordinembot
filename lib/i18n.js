const STR = {
  tr: {
    ping: '🏓 Pong! {ms}ms', creator: '👑 *{creator}*\n📞 wa.me/{owner}',
    onlyOwner: 'Bu komut sadece sahibe özel.', groupOnly: 'Bu komut sadece gruplarda çalışır.',
    adminOnly: 'Bu komut için admin olmalısın.', needMention: 'Birini etiketle veya numara yaz.',
    langSet: 'Dil: Türkçe olarak ayarlandı.', help: 'Yardım',
  },
  en: {
    ping: '🏓 Pong! {ms}ms', creator: '👑 *{creator}*\n📞 wa.me/{owner}',
    onlyOwner: 'This command is owner-only.', groupOnly: 'This command only works in groups.',
    adminOnly: 'You must be an admin for this.', needMention: 'Mention someone or provide a number.',
    langSet: 'Language set to English.', help: 'Help',
  }
};
function lang(u, config) { return u && u.lang ? u.lang : config.defaultLang; }
function t(key, l, vars = {}) {
  let s = (STR[l] || STR.tr)[key] || (STR.tr[key] || key);
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}
module.exports = { t, lang, STR };
