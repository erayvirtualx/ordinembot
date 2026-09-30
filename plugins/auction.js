const { ITEMS, find } = require('../lib/items');
const { parseAmount } = require('../lib/risk');
const { fmt } = require('../lib/format');

module.exports = {
  name: ['acikartirma', 'teklif'],
  group: true,
  run: async ({ msg, chat, cmd, args, senderNum, db, config }) => {
    const g = db.group(chat.id._serialized);
    const u = db.user(senderNum);
    const c = config.economy.auction;

    if (cmd === 'acikartirma') {
      if (g.auction) return msg.reply(`Bu grupta zaten aktif bir açık artırma var: *${g.auction.itemName}* — güncel teklif ${fmt(g.auction.currentBid)}`);
      const minutes = parseInt(args[args.length - 1]);
      const price = parseAmount(args[args.length - 2], Infinity);
      const itemQuery = args.slice(0, -2).join(' ');
      if (!itemQuery || !price || !minutes) return msg.reply('Kullanım: .acikartirma <eşya adı> <başlangıç fiyatı> <dakika>');
      const item = find(itemQuery);
      if (!item) return msg.reply('Böyle bir eşya yok. Market listesi için: .market');
      if (!u.inventory.includes(item.id)) return msg.reply('Bu eşyaya sahip değilsin.');
      const mins = Math.max(c.minMinutes, Math.min(c.maxMinutes, minutes));

      u.inventory.splice(u.inventory.indexOf(item.id), 1); // emanete alınır
      g.auction = { sellerId: senderNum, itemId: item.id, itemName: item.name, currentBid: price, currentBidder: null, endsAt: Date.now() + mins * 60000 };
      db.save();
      return msg.reply(`🔨 *Açık Artırma Başladı!*\n📦 ${item.name}\n💰 Başlangıç: ${fmt(price)} TL\n⏳ Süre: ${mins} dk\n\nTeklif vermek için: .teklif <miktar>`);
    }

    if (cmd === 'teklif') {
      if (!g.auction) return msg.reply('Bu grupta aktif bir açık artırma yok.');
      if (g.auction.sellerId === senderNum) return msg.reply('Kendi eşyana teklif veremezsin.');
      const min = Math.ceil(g.auction.currentBid * (1 + config.economy.auction.minRaisePct));
      const amt = parseAmount(args[0], u.balance);
      if (!amt || amt < min) return msg.reply(`En az ${fmt(min)} TL teklif etmelisin.`);
      if (amt > u.balance) return msg.reply('Cüzdanında bu kadar para yok.');
      g.auction.currentBid = amt; g.auction.currentBidder = senderNum; db.save();
      return msg.reply(`💸 @${senderNum} yeni en yüksek teklifi verdi: *${fmt(amt)} TL*`, { mentions: [`${senderNum}@c.us`] });
    }
  }
};
