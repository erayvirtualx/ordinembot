const { ITEMS, getBuff, fmtPrice, find } = require('../lib/items');
const { consumables } = require('../config');
const achievements = require('../lib/achievements');
const fmt = (n) => Math.floor(n).toLocaleString('tr-TR');

module.exports = {
  name: ['market', 'al', 'envanter', 'iksirler', 'kullan'],
  run: async ({ msg, cmd, args, senderNum, db }) => {
    const u = db.user(senderNum);
    const has = (id) => (u.inventory || []).includes(id);

    if (cmd === 'market') {
      const lines = ITEMS.map((it, i) => `${has(it.id) ? '✅' : '▫️'} *${i + 1}.* ${it.name}\n     ${fmtPrice(it.price)} — 🎲 +%${it.buff} kumar buff`);
      return msg.reply(`🛒 *${require('../config').botName} Market*\nBuff: kazanınca net kazancına eklenir. Toplam buff en fazla %40.\n\n${lines.join('\n')}\n\nSatın al: .al <numara|isim>\nTüketilebilir iksirler için: .iksirler\nSenin buff'ın: %${getBuff(u)}`);
    }

    if (cmd === 'iksirler') {
      const lines = Object.entries(consumables).map(([id, c], i) => `*${i + 1}.* ${c.name} — ${fmtPrice(c.price)}\n     ${c.desc}`);
      const inv = (u.consumables || {});
      const have = Object.entries(inv).filter(([, n]) => n > 0).map(([id, n]) => `${consumables[id]?.name || id} x${n}`).join(', ') || 'yok';
      return msg.reply(`🧪 *İksirler*\n\n${lines.join('\n')}\n\nSatın al: .al <isim>\nKullan: .kullan <isim>\nElindekiler: ${have}`);
    }

    if (cmd === 'kullan') {
      const q = (args.join(' ') || '').toLocaleLowerCase('tr');
      const entry = Object.entries(consumables).find(([id, c]) => id === q || c.name.toLocaleLowerCase('tr').includes(q));
      if (!entry) return msg.reply('Kullanım: .kullan <iksir adı>. Liste: .iksirler');
      const [id] = entry;
      u.consumables = u.consumables || {};
      if (!u.consumables[id]) return msg.reply('Bu iksirden hiç yok, önce .al ile satın al.');
      u.consumables[id]--;
      if (id === 'kalkan') { u.shield = (u.shield || 0) + 1; db.save(); return msg.reply('🛡️ Kalkan aktif! Bir sonraki soygun girişimi başarısız olacak.'); }
      if (id === 'sans' || id === 'cifte') { u.tempEffect = id; db.save(); return msg.reply(`✨ ${consumables[id].name} aktif, bir sonraki oyununda etkili olacak.`); }
    }

    if (cmd === 'envanter') {
      const mine = ITEMS.filter((i) => has(i.id));
      if (!mine.length) return msg.reply('🎒 Envanterin boş. .market ile göz at.');
      return msg.reply(`🎒 *Envanter*\n${mine.map((i) => `• ${i.name} (+%${i.buff})`).join('\n')}\n\n🎲 Toplam kumar buff: *%${getBuff(u)}*`);
    }

    if (cmd === 'al') {
      if (!args.length) return msg.reply('Kullanım: .al <numara|isim>. Liste için .market veya .iksirler');
      const q = args.join(' ').toLocaleLowerCase('tr');
      const cEntry = Object.entries(consumables).find(([id, c]) => id === q || c.name.toLocaleLowerCase('tr').includes(q));
      if (cEntry) {
        const [id, c] = cEntry;
        if (u.balance < c.price) return msg.reply(`Cüzdanın yetmiyor. Gereken: ${fmtPrice(c.price)}, cüzdanın: ${fmt(u.balance)}`);
        u.balance -= c.price; u.consumables = u.consumables || {}; u.consumables[id] = (u.consumables[id] || 0) + 1;
        db.save();
        return msg.reply(`🧪 *${c.name}* satın alındı! (Kullan: .kullan ${c.name})\nCüzdan: ${fmt(u.balance)}`);
      }
      const it = find(args.join(' '));
      if (!it) return msg.reply('Böyle bir eşya yok. .market veya .iksirler ile listeye bak.');
      if (has(it.id)) return msg.reply('Bu eşyaya zaten sahipsin.');
      if (u.balance < it.price) return msg.reply(`Cüzdanın yetmiyor. Gereken: ${fmtPrice(it.price)}, cüzdanın: ${fmt(u.balance)} (bankadaki parayı .cek ile çek)`);
      u.balance -= it.price;
      u.inventory.push(it.id);
      const a = achievements.grant(u, 'ilk_esya');
      db.save();
      return msg.reply(`🛍️ *${it.name}* satın alındı!\n🎲 Toplam kumar buff: %${getBuff(u)}\nCüzdan: ${fmt(u.balance)}${a ? `\n\n🏆 *Başarım:* ${a.name} — +${fmt(a.reward)} TL` : ''}`);
    }
  }
};
