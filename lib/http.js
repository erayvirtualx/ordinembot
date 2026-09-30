// Küçük HTTP yardımcıları: tüm dış isteklerde zaman aşımı uygulanır.
async function getJson(url, { headers, timeout = 15000, method = 'GET', body } = {}) {
  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(timeout) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
  return data;
}

async function getText(url, { headers, timeout = 15000 } = {}) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeout) });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return text;
}

// Büyük gövdelerde stream ile okumak gereken yerler için (ör. yt-dlp benzeri servisler)
async function postBuffer(url, body, { headers, timeout = 60000, method = 'POST' } = {}) {
  const res = await fetch(url, { method, headers, body, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

module.exports = { getJson, getText, postBuffer };
