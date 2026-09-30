// Konum gönderme. Adres → koordinat için OpenStreetMap Nominatim kullanılır (anahtarsız).
const { Location } = require('whatsapp-web.js');
const { getJson } = require('../lib/http');

async function geocode(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  const rows = await getJson(url.href, { headers: { 'User-Agent': 'OrdinemBot/1.0 (whatsapp bot)' } });
  if (!rows.length) return null;
  return { lat: parseFloat(rows[0].lat), lng: parseFloat(rows[0].lon), name: rows[0].display_name };
}

module.exports = {
  name: ['konum'],
  run: async ({ client, msg, chat, args }) => {
    const input = args.join(' ').trim();
    if (!input) return msg.reply('Kullanım:\n• .konum <adres>\n• .konum <enlem> <boylam> [ad]');

    const coords = input.match(/^(-?\d+(?:[.,]\d+)?)[\s,]+(-?\d+(?:[.,]\d+)?)(?:\s+(.*))?$/);
    if (coords) {
      const lat = parseFloat(coords[1].replace(',', '.'));
      const lng = parseFloat(coords[2].replace(',', '.'));
      if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return msg.reply('Koordinatlar geçersiz (enlem -90..90, boylam -180..180).');
      const name = coords[3] || 'Konum';
      return client.sendMessage(chat.id._serialized, new Location(lat, lng, { name, description: name }));
    }

    const place = await geocode(input).catch((e) => {
      msg.reply(`Adres çözülemedi: ${e.message}`);
      return null;
    });
    if (!place) return msg.reply(`"${input}" için konum bulunamadı. Koordinat olarak da gönderebilirsin.`);
    return client.sendMessage(chat.id._serialized, new Location(place.lat, place.lng, { name: place.name.split(',')[0], address: place.name }));
  }
};
