// Bağımlılıksız RSS/Atom ayrıştırıcı. Haber komutu ve otomatik duyuru akışı kullanır.

function decode(s) {
  return String(s == null ? '' : s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

// CDATA içinde de HTML olabilir (açıklama alanları). Önce etiketleri temizleyip
// geriye hiçbir şey kalmazsa CDATA metnini olduğu gibi kullanıyoruz.
function strip(s) {
  const raw = String(s == null ? '' : s);
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  const inner = cdata ? cdata[1] : raw;
  const cleaned = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (cdata && !cleaned) return decode(inner).trim();
  return decode(cleaned).trim();
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? strip(m[1]) : '';
}

// <link href="..."/> biçimindeki Atom linklerini de yakalar.
function linkOf(block) {
  const self = block.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/i)
    || block.match(/<link[^>]*href="([^"]+)"[^>]*rel="alternate"/i);
  if (self) return decode(self[1]);
  const plain = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
  return plain ? strip(plain[1]) : '';
}

function parse(xml, limit = 20) {
  const source = String(xml || '');
  const blocks = source.match(/<item[\s\S]*?<\/item>/gi) || source.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, limit).map((b) => ({
    title: tag(b, 'title'),
    link: linkOf(b),
    date: tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated'),
    description: (tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 400)
  })).filter((x) => x.title);
}

module.exports = { parse, strip, decode };
