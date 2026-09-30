// RSS tabanlı haber komutu. Kaynaklar config.media.newsFeeds içinden okunur.
const { getText } = require('../lib/http');
const rss = require('../lib/rss');

const cache = new Map();  // feedUrl -> { at, items }
const TTL = 15 * 60 * 1000;

async function fetchFeed(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) return hit.items;
  const xml = await getText(url, { headers: { 'User-Agent': 'OrdinemBot/1.0' }, timeout: 12000 });
  const items = rss.parse(xml, 15);
  cache.set(url, { at: Date.now(), items });
  return items;
}

module.exports = {
  name: ['haber', 'gunun', 'günün'],
  run: async ({ msg, chat, args, config }) => {
    const feeds = config.media.newsFeeds || [];
    if (!feeds.length) return msg.reply('Haber kaynağı tanımlı değil (NEWS_FEEDS).');

    const filter = args.filter((a) => !a.includes('http')).join(' ').trim();
    const matched = filter ? feeds.filter((f) => f.toLowerCase().includes(filter.toLowerCase())) : feeds;
    const pool = matched.length ? matched : feeds;

    const results = await Promise.all(pool.slice(0, 3).map((f) => fetchFeed(f).catch(() => [])));
    const lowered = filter.toLowerCase();
    const items = results.flat().filter((i) => !lowered || (i.title + ' ' + i.description).toLowerCase().includes(lowered));

    if (!items.length) return msg.reply(`📰 "${filter || pool[0]}" için haber bulunamadı.`);

    const seen = new Set();
    const unique = items.filter((i) => !seen.has(i.title) && seen.add(i.title)).slice(0, 8);
    const date = (d) => d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) : '';
    const body = unique.map((i, idx) => `*${idx + 1}.* ${i.title}${date(i.date) ? ` _(${date(i.date)})_` : ''}`).join('\n\n');
    const links = unique.map((i, idx) => `${idx + 1}. ${i.link}`).join('\n');

    return msg.reply(`📰 *Son haberler*\n\n${body}\n\n🔗 ${links}`);
  }
};
