// Gruba atılan desteklenen medya bağlantılarını otomatik indirip gönderir.
// Ayar: .otoindir on|off (grup düzeyinde, config.media.autoDownloadHosts listesiyle sınırlı).
const HOSTS = ['youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com', 'facebook.com', 'fb.watch',
  'x.com', 'twitter.com', 'threads.net', 'drive.google.com', 'mediafire.com', 'spotify.com', 'pinterest.com', 'pin.it'];

module.exports = {
  name: ['otomatikindir', 'otodl'],
  perm: { otomatikindir: 'admin', otodl: 'admin' },
  run: async ({ msg }) => {
    return msg.reply(`ℹ️ Otomatik indirme bir grup ayarıdır: *.otoindir on | off*\n\nDesteklenen alan adları:\n${(require('../config').media.autoDownloadHosts.length ? require('../config').media.autoDownloadHosts : HOSTS).join(', ')}`);
  },
  // index.js, .otoindir açık gruplarda link gördüğünde bunu çağırır.
  handle: async (client, msg, chat, db, config) => {
    if (msg.fromMe || msg.hasMedia) return;
    const g = db.group(chat.id._serialized);
    if (!g.autoDownload) return;

    const body = msg.body || '';
    const url = (body.match(/https?:\/\/\S+/g) || []).find((u) => {
      let host = '';
      try { host = new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { return false; }
      const allowed = config.media.autoDownloadHosts.length ? config.media.autoDownloadHosts : HOSTS;
      return allowed.some((h) => host === h || host.endsWith('.' + h));
    });
    if (!url) return;

    // Mesaj bir komutsa (prefix ile başlıyorsa) otomatik indirme yapma; kullanıcı zaten komut kullanmıştır.
    if (body.trim().startsWith(require('../config').prefix)) return;

    const { execFile } = require('child_process');
    const { promisify } = require('util');
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const { MessageMedia } = require('whatsapp-web.js');
    const execFileAsync = promisify(execFile);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wabot-autodl-'));
    const tpl = path.join(dir, 'media.%(ext)s');
    const args = ['--no-playlist', '--no-progress', '--no-warnings', '--max-filesize', '60M',
      '--print', 'after_move:filepath', '-o', tpl, '--format', 'bv*+ba/b', '--merge-output-format', 'mp4', url];
    try { args.push('--ffmpeg-location', require('ffmpeg-static')); } catch {}

    try {
      await msg.react('⏳').catch(() => {});
      const { stdout } = await execFileAsync(config.media.ytdlpPath, args, { timeout: 180000, maxBuffer: 1024 * 1024, windowsHide: true });
      const file = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1);
      if (!file || !fs.existsSync(file)) return;
      const media = await MessageMedia.fromFilePath(file);
      await client.sendMessage(chat.id._serialized, media, { caption: `📥 Otomatik indirme\n${url}` });
    } catch (e) {
      console.error('otomatik indirme başarısız:', e.message);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
};
