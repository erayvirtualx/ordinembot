const http = require('http');

const PAGE = `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>OrdinemBot</title>
<style>body{font:15px system-ui;max-width:1050px;margin:30px auto;padding:0 16px;background:#10151b;color:#e8edf2}input,button,textarea{font:inherit;padding:8px;border-radius:6px;border:1px solid #43505d;background:#18222c;color:inherit}button{cursor:pointer}section{padding:16px;margin:14px 0;background:#18222c;border-radius:10px}pre{white-space:pre-wrap;max-height:360px;overflow:auto}.row{display:flex;gap:8px;flex-wrap:wrap}#key{width:min(500px,90%)}textarea{width:100%;min-height:70px}</style>
<h1>OrdinemBot kontrol paneli</h1><p>API anahtarını gir. Bu panel ayarları yerel olarak saklar.</p><input id="key" type="password" placeholder="Dashboard API anahtarı"><button onclick="save()">Kaydet</button><div class="row"><button onclick="loadAll()">Yenile</button><button onclick="loadHistory()">Mesaj geçmişini aç</button></div>
<section><h2>Durum</h2><pre id="status">—</pre></section><section><h2>Sohbetler</h2><pre id="chats">—</pre></section><section><h2>Mesaj gönder</h2><input id="chat" placeholder="Sohbet ID (ör. 905...@c.us)" style="width:min(500px,90%)"><textarea id="text" placeholder="Mesaj"></textarea><button onclick="send()">Gönder</button><pre id="sendResult"></pre></section><section><h2>Mesaj geçmişi</h2><pre id="history">Kapalı veya henüz açılmadı.</pre></section><section><h2>Son olay kayıtları</h2><pre id="logs">—</pre></section>
<script>const key=document.querySelector('#key');key.value=localStorage.getItem('wabot-key')||'';function save(){localStorage.setItem('wabot-key',key.value);loadAll()}async function api(path,opts={}){const r=await fetch(path,{...opts,headers:{'content-type':'application/json','x-api-key':key.value,...opts.headers}});const j=await r.json();if(!r.ok)throw Error(j.error||r.status);return j}async function loadAll(){try{const [s,c,l]=await Promise.all([api('/api/status'),api('/api/chats'),api('/api/logs')]);document.querySelector('#status').textContent=JSON.stringify(s,null,2);document.querySelector('#chats').textContent=JSON.stringify(c,null,2);document.querySelector('#logs').textContent=JSON.stringify(l,null,2)}catch(e){document.querySelector('#status').textContent=e.message}}async function loadHistory(){try{document.querySelector('#history').textContent=JSON.stringify(await api('/api/messages'),null,2)}catch(e){document.querySelector('#history').textContent=e.message}}async function send(){try{const result=await api('/api/send',{method:'POST',body:JSON.stringify({chatId:document.querySelector('#chat').value,text:document.querySelector('#text').value})});document.querySelector('#sendResult').textContent=JSON.stringify(result)}catch(e){document.querySelector('#sendResult').textContent=e.message}}loadAll();setInterval(loadAll,10000);</script></html>`;

function startDashboard({ clients, db, config, logger }) {
  if (!config.dashboard.enabled) return null;
  if (!config.dashboard.apiKey) {
    console.error('Dashboard kapatıldı: DASHBOARD_API_KEY ayarlanmamış.');
    return null;
  }

  const send = (res, status, data) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(data));
  };
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(PAGE);
    }
    if (req.headers['x-api-key'] !== config.dashboard.apiKey && req.headers.authorization !== `Bearer ${config.dashboard.apiKey}`) return send(res, 401, { error: 'API anahtarı gerekli.' });
    try {
      if (req.method === 'GET' && req.url === '/api/status') return send(res, 200, { sessions: [...clients].map(([id, c]) => ({ id, ready: !!c.info, uptimeSeconds: Math.floor(process.uptime()) })), users: Object.keys(db.data.users || {}).length, events: (db.data.logs || []).length, messageHistoryEnabled: !!db.data.settings.messageHistoryEnabled });
      if (req.method === 'GET' && req.url === '/api/chats') {
        const result = [];
        for (const [session, client] of clients) if (client.info) for (const chat of await client.getChats()) result.push({ session, id: chat.id._serialized, name: chat.name, isGroup: chat.isGroup, unreadCount: chat.unreadCount });
        return send(res, 200, result);
      }
      if (req.method === 'GET' && req.url === '/api/logs') return send(res, 200, (db.data.logs || []).slice(-150).reverse());
      if (req.method === 'GET' && req.url === '/api/messages') {
        if (!db.data.settings.messageHistoryEnabled) return send(res, 403, { error: 'Mesaj geçmişi kapalı. Bot sahibinden .history on ayarını açmasını iste.' });
        return send(res, 200, (db.data.messageHistory || []).slice(-250).reverse());
      }
      if (req.method === 'POST' && req.url === '/api/send') {
        let raw = '';
        for await (const chunk of req) { raw += chunk; if (raw.length > 16384) return send(res, 413, { error: 'İstek çok büyük.' }); }
        const { chatId, text, session } = JSON.parse(raw || '{}');
        if (typeof chatId !== 'string' || !/^(\d+@(c\.us|g\.us))$/.test(chatId) || typeof text !== 'string' || !text.trim()) return send(res, 400, { error: 'Geçerli chatId ve text gerekli.' });
        const client = clients.get(session) || [...clients.values()].find((c) => c.info);
        if (!client?.info) return send(res, 503, { error: 'Bağlı WhatsApp oturumu yok.' });
        const sent = await client.sendMessage(chatId, text.slice(0, 4000));
        logger.add(db, 'dashboard_message_sent', { session: client.sessionId, chatId });
        return send(res, 200, { ok: true, messageId: sent?.id?._serialized || null });
      }
      return send(res, 404, { error: 'Bulunamadı.' });
    } catch (e) { logger.add(db, 'dashboard_error', { error: e.message }); return send(res, 500, { error: 'İşlem başarısız.' }); }
  });
  server.listen(config.dashboard.port, config.dashboard.host, () => console.log(`Kontrol paneli: http://${config.dashboard.host}:${config.dashboard.port}`));
  return server;
}

module.exports = { startDashboard };
