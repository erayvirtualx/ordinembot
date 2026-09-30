const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { MessageMedia } = require('whatsapp-web.js');
const execFileAsync = promisify(execFile);

const HOSTS = ['youtube.com', 'youtu.be', 'tiktok.com', 'instagram.com', 'facebook.com', 'fb.watch', 'x.com', 'twitter.com', 'threads.net', 'drive.google.com', 'docs.google.com', 'mediafire.com', 'spotify.com', 'pinterest.com', 'pin.it'];
function safeUrl(value) {
  let url; try { url = new URL(value); } catch { return null; }
  return url.protocol === 'https:' && HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`)) ? url.href : null;
}

async function download(query, audio, config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wabot-media-'));
  const outTemplate = path.join(dir, 'media.%(ext)s');
  const args = ['--no-playlist', '--no-progress', '--no-warnings', '--socket-timeout', '25', '--retries', '1', '--max-filesize', '100M', '--print', 'after_move:filepath', '-o', outTemplate];
  if (audio) {
    let ffmpeg;
    try { ffmpeg = require('ffmpeg-static'); } catch {}
    if (ffmpeg) args.push('--ffmpeg-location', ffmpeg);
    args.push('-x', '--audio-format', 'mp3');
  } else args.push('--format', 'bv*+ba/b', '--merge-output-format', 'mp4');
  args.push(query);
  try {
    const { stdout } = await execFileAsync(config.media.ytdlpPath, args, { timeout: 180000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
    const file = stdout.trim().split(/\r?\n/).filter(Boolean).at(-1) || fs.readdirSync(dir).map((x) => path.join(dir, x)).find((x) => fs.statSync(x).isFile());
    if (!file || !fs.existsSync(file)) throw new Error('İndirilen dosya bulunamadı.');
    if (fs.statSync(file).size > 65 * 1024 * 1024) throw new Error('Dosya WhatsApp gönderim sınırını aşıyor.');
    return { dir, file };
  } catch (e) { fs.rmSync(dir, { recursive: true, force: true }); throw e; }
}

async function spotifySearch(url, config) {
  const { stdout } = await execFileAsync(config.media.ytdlpPath, ['--flat-playlist', '--dump-single-json', '--no-warnings', url], { timeout: 30000, maxBuffer: 2 * 1024 * 1024, windowsHide: true });
  const data = JSON.parse(stdout);
  const track = data.entries?.[0] || data;
  if (!track.title) throw new Error('Spotify parça adı alınamadı.');
  return `ytsearch1:${track.title} ${track.artist || track.uploader || ''}`;
}

module.exports = {
  name: ['play', 'ytmp4', 'ytsearch', 'tiktok', 'ig', 'fb', 'xdl', 'threads', 'gdrive', 'mediafire', 'spotify', 'pinterest'],
  run: async ({ client, msg, chat, cmd, args, config }) => {
    const query = args.join(' ').trim();
    if (!query) return msg.reply(`Kullanım: .${cmd} <bağlantı${cmd === 'ytsearch' ? ' veya arama' : ''}>`);
    const audio = cmd === 'play' || cmd === 'spotify';
    let target = query;
    if (cmd === 'ytsearch') target = `ytsearch1:${query}`;
    else {
      const url = safeUrl(query);
      if (!url) return msg.reply('Desteklenen, https ile başlayan bir bağlantı yaz.');
      if (cmd === 'tiktok' && !/tiktok\.com$/i.test(new URL(url).hostname)) return msg.reply('TikTok bağlantısı gerekli.');
      if (cmd === 'ig' && !/instagram\.com$/i.test(new URL(url).hostname)) return msg.reply('Instagram bağlantısı gerekli.');
      if (cmd === 'fb' && !/(facebook\.com|fb\.watch)$/i.test(new URL(url).hostname)) return msg.reply('Facebook bağlantısı gerekli.');
      if (cmd === 'xdl' && !/(x\.com|twitter\.com)$/i.test(new URL(url).hostname)) return msg.reply('X bağlantısı gerekli.');
      if (cmd === 'threads' && !/threads\.net$/i.test(new URL(url).hostname)) return msg.reply('Threads bağlantısı gerekli.');
      if (cmd === 'gdrive' && !/(drive\.google\.com|docs\.google\.com)$/i.test(new URL(url).hostname)) return msg.reply('Google Drive bağlantısı gerekli.');
      if (cmd === 'mediafire' && !/mediafire\.com$/i.test(new URL(url).hostname)) return msg.reply('MediaFire bağlantısı gerekli.');
      if (cmd === 'pinterest' && !/(pinterest\.com|pin\.it)$/i.test(new URL(url).hostname)) return msg.reply('Pinterest bağlantısı gerekli.');
      if (cmd === 'spotify') {
        if (!/spotify\.com$/i.test(new URL(url).hostname)) return msg.reply('Spotify bağlantısı gerekli.');
        try { target = await spotifySearch(url, config); } catch (e) { return msg.reply(`Spotify parçası çözülemedi: ${e.message}`); }
      }
    }
    await msg.reply('⏳ Medya indiriliyor…');
    let result;
    try {
      result = await download(target, audio, config);
      const media = MessageMedia.fromFilePath(result.file);
      await client.sendMessage(chat.id._serialized, media, audio ? { caption: '🎵 İndirilen ses' } : { caption: '🎬 İndirilen medya' });
    } catch (e) {
      await msg.reply(`İndirme başarısız oldu. yt-dlp kurulu ve güncel mi kontrol et.\n${e.message}`);
    } finally { if (result?.dir) fs.rmSync(result.dir, { recursive: true, force: true }); }
  }
};
