// Etkileşimli mesajlar: hızlı yanıt düğmeleri ve listeler.
// Not: WhatsApp bu mesaj türlerini "eski" olarak işaretler; yine de çalışır.
const { Buttons, List } = require('whatsapp-web.js');

module.exports = {
  name: ['buton', 'liste'],
  run: async ({ client, msg, chat, args }) => {
    const sep = args.indexOf('|');

    if (msg.hasQuotedMsg) {
      const quoted = await msg.getQuotedMessage();
      const body = args.join(' ') || (quoted.body || '').slice(0, 200) || 'Seçenekler';
      const labels = (args.length ? args : ['Evet', 'Hayır']).slice(0, 3);
      const buttons = new Buttons(
        body,
        labels.map((label, i) => ({ id: `b${i + 1}`, body: label.slice(0, 40) })),
        null,
        'Seçeneğine dokun'
      );
      return client.sendMessage(chat.id._serialized, buttons);
    }

    if (sep === -1) {
      return msg.reply('Kullanım:\n• .buton Gövde | Buton1 | Buton2 | Buton3\n• Bir mesajı alıntılayıp .buton yaz (gövde mesajdan alınır)\n• .liste Gövde | Başlık1,Soru1,Seçenek1; Seçenek2 | Menü');
    }

    const body = args.slice(0, sep).join(' ').trim() || 'Menü';
    const sectionTitle = args[sep + 1] || 'Seçenekler';
    const rows = (args[sep + 2] || 'Evet,Hayır').split(';').map((s) => s.trim()).filter(Boolean);
    const title = args[sep + 3] || null;

    const sections = [{
      title: sectionTitle,
      rows: rows.map((r) => {
        const parts = r.split(',');
        const name = (parts[0] || r).trim();
        const description = (parts[1] || '').trim();
        return { title: name, description, rowId: name.toLowerCase().replace(/\s+/g, '_') };
      })
    }];

    const list = new List(body, 'Menüyü aç', sections, title, 'Lütfen bir seçim yap');
    return client.sendMessage(chat.id._serialized, list);
  }
};
