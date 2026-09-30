const { t, lang } = require('../lib/i18n');

async function safeJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'OrdinemBot/1.0' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

module.exports = {
  name: ['hava', 'namaz', 'kur', 'deprem', 'vikipedi', 'dil'],
  run: async ({ msg, cmd, args, senderNum, db }) => {
    const u = db.user(senderNum);
    try {
      if (cmd === 'dil') {
        const l = (args[0] || '').toLowerCase();
        if (!['tr', 'en'].includes(l)) return msg.reply('Kullanım: .dil tr | en');
        u.lang = l; db.save();
        return msg.reply(t('langSet', l));
      }

      if (cmd === 'hava') {
        const city = args.join(' ');
        if (!city) return msg.reply('Kullanım: .hava <şehir>');
        const geo = await safeJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=tr`);
        const p = geo.results?.[0];
        if (!p) return msg.reply('Şehir bulunamadı.');
        const w = await safeJson(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`);
        const c = w.current;
        return msg.reply(`🌤️ *${p.name}, ${p.country}*\n🌡️ Sıcaklık: ${c.temperature_2m}°C\n💧 Nem: %${c.relative_humidity_2m}\n💨 Rüzgar: ${c.wind_speed_10m} km/s`);
      }

      if (cmd === 'namaz') {
        const city = args.join(' ') || 'Istanbul';
        const d = await safeJson(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Turkey&method=13`);
        const tm = d.data.timings;
        return msg.reply(`🕌 *${city} Namaz Vakitleri*\nİmsak: ${tm.Fajr}\nGüneş: ${tm.Sunrise}\nÖğle: ${tm.Dhuhr}\nİkindi: ${tm.Asr}\nAkşam: ${tm.Maghrib}\nYatsı: ${tm.Isha}`);
      }

      if (cmd === 'kur') {
        const d = await safeJson('https://api.frankfurter.app/latest?from=USD&to=TRY,EUR');
        const e = await safeJson('https://api.frankfurter.app/latest?from=EUR&to=TRY');
        return msg.reply(`💱 *Döviz Kurları*\n💵 1 USD = ${d.rates.TRY.toFixed(2)} TRY\n💶 1 EUR = ${e.rates.TRY.toFixed(2)} TRY`);
      }

      if (cmd === 'deprem') {
        const d = await safeJson('https://api.orhanaydogdu.com.tr/deprem/kandilli/live');
        const list = (d.result || []).slice(0, 5);
        if (!list.length) return msg.reply('Veri alınamadı.');
        return msg.reply('🌍 *Son Depremler*\n' + list.map((e) => `• ${e.title} — M${e.mag} (${e.date})`).join('\n'));
      }

      if (cmd === 'vikipedi') {
        const q = args.join(' ');
        if (!q) return msg.reply('Kullanım: .vikipedi <konu>');
        const d = await safeJson(`https://tr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`);
        if (d.type === 'disambiguation' || !d.extract) return msg.reply('Sonuç bulunamadı ya da belirsiz, daha spesifik yaz.');
        return msg.reply(`📖 *${d.title}*\n${d.extract}`);
      }
    } catch (e) {
      return msg.reply('⚠️ Bilgi alınamadı, servis şu an ulaşılamıyor olabilir.');
    }
  }
};
