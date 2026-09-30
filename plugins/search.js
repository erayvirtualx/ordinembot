const { MessageMedia } = require('whatsapp-web.js');

async function json(url, headers = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data;
}

module.exports = {
  name: ['search', 'gorsel', 'sarki', 'duvar', 'githubprofile'],
  run: async ({ msg, args, cmd, config, client, chat }) => {
    if (cmd === 'search') {
      // Baştaki "!" derin arama ister (Tavily advanced; daha yavaş, daha kapsamlı).
      const zengin = args[0] === '!';
      const q = (zengin ? args.slice(1) : args).join(' ').trim();
      if (!q) return msg.reply('Kullanım: .search <arama metni>  ·  derin arama için: .search ! <metin>');
      const { ara, bicimle } = require('../lib/websearch');
      try {
        return msg.reply(bicimle(q, await ara(q, { config, sayfa: 5, zengin })));
      } catch (e) {
        // Sırayla hepsi başarısız olduysa nedenlerini göster; tek hata yeterli değil.
        return msg.reply(`🔎 Arama yapılamadı.\n${(e.denemeler || [e.message]).join('\n')}`);
      }
    }

    const q = args.join(' ').trim();
    if (!q) return msg.reply(`Kullanım: .${cmd} <arama metni>`);
    try {
      if (cmd === 'gorsel') {
        // Anahtarsız yol: Openverse → Wikimedia Commons (Google anahtarı varsa o).
        const { ara, getir } = require('../lib/imageresearch');
        try {
          const sonuc = await ara(q, { config, sayfa: 5 });
          let gonderilen = 0;
          const hatalar = [];
          for (const r of sonuc.sonuclar.slice(0, 4)) {
            try {
              const m = await getir(r);
              await client.sendMessage(chat.id._serialized, new MessageMedia(m.mimetype, m.data.toString('base64'), 'arama.jpg'), {
                caption: `${m.baslik}${m.lisans ? `\n_${[m.kaynak, m.lisans].filter(Boolean).join(' · ')}_` : ''}`
              });
              gonderilen++;
            } catch (e) { hatalar.push(e.message); }
            if (gonderilen >= 3) break;
          }
          if (gonderilen) return;
          // Hiçbiri indirilemediyse bağlantı olarak düş.
          const satirlar = sonuc.sonuclar.slice(0, 5).map((r, i) => `${i + 1}. ${r.baslik}\n${r.baglanti}`);
          return msg.reply(`🖼️ *${q}* — görseller indirilemedi, bağlantılar:\n${satirlar.join('\n')}\n\n_${hatalar[0] || ''}_`);
        } catch (e) {
          return msg.reply(`Görsel araması başarısız:\n${(e.denemeler || [e.message]).join('\n')}`);
        }
      }
      if (cmd === 'sarki') {
        const params = new URLSearchParams({ q });
        const data = await json(`https://lrclib.net/api/search?${params}`, { 'User-Agent': 'OrdinemBot/1.0' });
        const song = data[0];
        if (!song) return msg.reply('Şarkı sözü bulunamadı.');
        return msg.reply(`🎵 *${song.trackName} — ${song.artistName}*\n${song.plainLyrics || song.syncedLyrics || 'Söz bulunamadı.'}`.slice(0, 4000));
      }
      if (cmd === 'duvar') {
        const data = await json(`https://wallhaven.cc/api/v1/search?${new URLSearchParams({ q, sorting: 'relevance', purity: '100' })}`);
        const rows = (data.data || []).slice(0, 5).map((x, i) => `${i + 1}. ${x.resolution} — ${x.url}\n${x.path}`);
        return msg.reply(rows.length ? `🖼️ *Duvar kağıtları: ${q}*\n${rows.join('\n\n')}` : 'Görsel bulunamadı.');
      }
      if (cmd === 'githubprofile') {
        const user = q.replace(/^@/, '');
        const data = await json(`https://api.github.com/users/${encodeURIComponent(user)}`, { 'User-Agent': 'OrdinemBot' });
        return msg.reply(`🐙 *${data.name || data.login}*\n${data.bio || ''}\nTakipçi: ${data.followers} · Depo: ${data.public_repos}\n${data.html_url}`);
      }
    } catch (e) { return msg.reply(`Arama yapılamadı: ${e.message}`); }
  }
};
