const fs = require('fs');
const os = require('os');
const path = require('path');

function tmpFile(ext) {
  return path.join(os.tmpdir(), `wabot_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`);
}
async function getTargetMedia(msg) {
  const m = msg.hasMedia ? msg : msg.hasQuotedMsg ? await msg.getQuotedMessage() : null;
  if (!m || !m.hasMedia) return null;
  return m.downloadMedia();
}
function cleanup(...files) {
  for (const f of files) { try { fs.unlinkSync(f); } catch {} }
}
module.exports = { tmpFile, getTargetMedia, cleanup };
