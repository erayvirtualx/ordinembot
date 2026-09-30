module.exports = {
  name: ['autai', 'chatbot', 'privacy', 'ayarlar', 'settings', 'history', 'aiprovider', 'autoreact', 'keyword'],
  // Hesap geneli ayarları yalnızca sahip değiştirebilir; grup ayarları yöneticiye açık.
  perm: {
    autai: 'owner',
    privacy: 'owner',
    history: 'owner',
    aiprovider: 'owner',
    autoreact: 'owner',
    chatbot: { level: 'admin', group: true },
    keyword: { level: 'admin', group: true },
    ayarlar: 'admin',
    settings: 'admin'
  },
  run: async ({ msg, cmd, args, db, config }) => {
    const value = (args[0] || '').toLowerCase();
    const yesNo = ['on', 'off'].includes(value);

    if (cmd === 'autai') {
      if (!yesNo) return msg.reply('Kullanım: .autai on|off — özel mesajlarda otomatik AI yanıtı');
      db.data.settings.autoAI = value === 'on'; db.save();
      return msg.reply(`Özel mesaj AI yanıtı: ${value}`);
    }
    if (cmd === 'chatbot') {
      if (!yesNo) return msg.reply('Kullanım: .chatbot on|off — botu grupta etiketleyince yanıt verir.');
      db.group(msg.from).chatbotEnabled = value === 'on'; db.save();
      return msg.reply(`Grup AI sohbeti: ${value}`);
    }
    if (cmd === 'privacy') {
      const key = ({ status: 'autoStatusSeen', viewonce: 'viewOnceInbox', calls: 'antiCall' })[value];
      const state = (args[1] || '').toLowerCase();
      if (!key || !['on', 'off'].includes(state)) return msg.reply('Kullanım: .privacy status|viewonce|calls on|off');
      db.data.settings[key] = state === 'on'; db.save();
      return msg.reply(`${value} özelliği: ${state}`);
    }
    if (cmd === 'history') {
      if (value === 'clear') { db.data.messageHistory = []; db.save(); return msg.reply('Mesaj geçmişi silindi.'); }
      if (!yesNo) return msg.reply('Kullanım: .history on|off|clear');
      db.data.settings.messageHistoryEnabled = value === 'on'; db.save();
      return msg.reply(`Yerel mesaj geçmişi: ${value}`);
    }
    if (cmd === 'autoreact') {
      if (!yesNo) return msg.reply('Kullanım: .autoreact on|off');
      db.data.settings.autoReact = value === 'on'; db.save(); return msg.reply(`Otomatik emoji tepkisi: ${value}`);
    }
    if (cmd === 'keyword') {
      const action = value;
      const g = db.group(msg.from); g.keywords ||= {};
      if (action === 'list') return msg.reply(Object.entries(g.keywords).map(([k, v]) => `${k} → ${v}`).join('\n') || 'Anahtar yanıt yok.');
      if (action === 'remove' && args[1]) { delete g.keywords[args[1].toLocaleLowerCase('tr')]; db.save(); return msg.reply('Anahtar yanıt silindi.'); }
      const raw = args.slice(1).join(' ').split('|'); const key = (raw[0] || '').trim().toLocaleLowerCase('tr'); const reply = (raw[1] || '').trim();
      if (action !== 'add' || !key || !reply) return msg.reply('Kullanım: .keyword add <kelime> | <yanıt> · .keyword remove <kelime> · .keyword list');
      g.keywords[key] = reply; db.save(); return msg.reply('Anahtar yanıt eklendi.');
    }
    if (cmd === 'aiprovider') {
      const ai = require('../lib/ai');
      const sag = ai.saglik(config);
      if (!value) {
        const liste = sag.length
          ? sag.map((s) => `• ${s.adTR} — ${s.anahtarSayisi} anahtar, ${s.modelSayisi} model, durum: ${s.durum}${s.sonHata ? ` (${s.sonHata})` : ''}`).join('\n')
          : 'Havuz boş — .env içine anahtar ekle.';
        return msg.reply(`🤖 *Yapay zekâ sağlayıcıları*\n\n${liste}\n\nSırayı değiştirmek için .env içindeki AI_ORDER değişkenini düzenle.`);
      }
      const istenen = value.toLowerCase();
      const hedef = sag.find((s) => s.ad === istenen || s.adTR.toLowerCase() === istenen);
      if (!hedef) return msg.reply(`Böyle bir sağlayıcı yok. Seçenekler: ${sag.map((s) => s.ad).join(', ') || '(havuz boş)'}`);
      // Sırayı kalıcı yerine bu çalışma için değiştir: seçilen başa alınır.
      config.ai.havuz.sort((a, b) => (a.ad === hedef.ad ? -1 : b.ad === hedef.ad ? 1 : 0));
      return msg.reply(`✅ ${hedef.adTR} birinci sıraya alındı. Hata verirse sıradaki sağlayıcıya kendiliğinden geçilir.\n\nSıra: ${config.ai.havuz.map((p) => p.ad).join(' → ')}`);
    }
    if (cmd === 'ayarlar' || cmd === 'settings') {
      const s = db.data.settings;
      const y = (v) => (v ? 'açık' : 'kapalı');
      const api = require('../lib/apihealth');
      const durum = api.apiDurumu(config);
      const eksik = api.eksikler(config);
      const apiSatir = Object.entries(durum).map(([k, v]) => `• ${k}: ${v}`).join('\n');
      const uyari = eksik.length
        ? `\n\n⚠️ *Eksikler*\n${eksik.map((e) => '• ' + e).join('\n')}`
        : '\n\n✅ Tüm servisler hazır.';
      return msg.reply(`⚙️ *Bot ayarları*\n\n*Servisler*\n${apiSatir}${uyari}\n\n*Gizlilik*\nDurumları otomatik görüntüleme: ${y(s.autoStatusSeen)}\nTek görüntülemeli içerikleri sahibe ilet: ${y(s.viewOnceInbox)}\nAramaları reddet: ${y(s.antiCall)}\nMesaj geçmişi: ${y(s.messageHistoryEnabled)}\n\n*Medya*\nOtomatik tepki: ${y(s.autoReact)}\nOtomatik indirme: ${y(s.autoDownload)}\nArka plan senkronizasyonu: ${y(s.backgroundSync)}\n\n*Diğer*\nOtomatik özel mesaj AI: ${y(s.autoAI)}\nPanel: ${y(config.dashboard.enabled)}`);
    }
  }
};
