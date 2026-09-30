const rss = require('../lib/rss');

const rssXml = [
  '<rss><channel>',
  '<item><title><![CDATA[Başlık & test]]></title><link>https://x.com/1</link>',
  '<pubDate>Mon, 01 Jan 2024 00:00:00 GMT</pubDate>',
  '<description><![CDATA[<p>Özet</p>]]></description></item>',
  '<item><title>İkinci</title><link>https://x.com/2</link><description>Ham &amp; açıklama</description></item>',
  '</channel></rss>'
].join('');

const atomXml = [
  '<feed>',
  '<entry><title>Atom başlık</title><link rel="alternate" href="https://a.com/2"/>',
  '<published>2024-05-01T10:00:00Z</published><summary>Özet2</summary></entry>',
  '</feed>'
].join('');

const r = rss.parse(rssXml);
console.log('RSS kayit sayisi:', r.length);
console.log(JSON.stringify(r, null, 1));

const a = rss.parse(atomXml);
console.log('Atom kayit sayisi:', a.length);
console.log(JSON.stringify(a, null, 1));

if (r.length !== 2) throw new Error('2 kayıt beklenirken ' + r.length);
if (r[0].title !== 'Başlık & test') throw new Error('CDATA başlığı hatalı: ' + r[0].title);
if (r[0].link !== 'https://x.com/1') throw new Error('link hatalı: ' + r[0].link);
if (r[0].description !== 'Özet') throw new Error('CDATA açıklama hatalı: ' + r[0].description);
if (r[1].description !== 'Ham & açıklama') throw new Error('entity çözümü hatalı: ' + r[1].description);
if (a.length !== 1) throw new Error('Atom kaydı yok');
if (a[0].link !== 'https://a.com/2') throw new Error('Atom linki hatalı: ' + a[0].link);
console.log('RSS testi başarılı.');
