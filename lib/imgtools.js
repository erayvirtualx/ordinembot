// sharp tabanlı görsel işlemleri (bulanıklaştırma, kırpma, dönüş, renk, keskinleştirme).
const sharp = require('sharp');

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

async function load(media) {
  return sharp(Buffer.from(media.data, 'base64'));
}

async function blur(media, sigma = 6) {
  const s = await load(media);
  const out = await s.blur(clamp(sigma, 0.3, 40)).toBuffer();
  return { data: out, mimetype: 'image/png', filename: 'bulanik.png' };
}

async function sharpen(media, amount = 1) {
  const s = await load(media);
  const out = await s.sharpen({ sigma: 1, m1: 0.5, m2: clamp(amount * 2, 0.5, 5) }).png().toBuffer();
  return { data: out, mimetype: 'image/png', filename: 'keskin.png' };
}

async function resize(media, factor = 2) {
  const s = await load(media);
  const meta = await s.metadata();
  const width = clamp(Math.round((meta.width || 512) * factor), 64, 4096);
  const out = await s.resize({ width, kernel: 'lanczos3' }).png().toBuffer();
  return { data: out, mimetype: 'image/png', filename: 'boyut.png' };
}

// Merkezden kare kırpma (sticker kırpma komutu için).
async function cropSquare(media) {
  const s = await load(media);
  const meta = await s.metadata();
  const size = Math.min(meta.width || 512, meta.height || 512);
  const left = Math.floor(((meta.width || size) - size) / 2);
  const top = Math.floor(((meta.height || size) - size) / 2);
  const out = await s.extract({ left, top, width: size, height: size }).png().toBuffer();
  return { data: out, mimetype: 'image/png', filename: 'kirpildi.png' };
}

async function rotate(media, deg = 90) {
  const out = await (await load(media)).rotate(clamp(deg, -360, 360)).png().toBuffer();
  return { data: out, mimetype: 'image/png', filename: 'donduruldu.png' };
}

async function grayscale(media) {
  const out = await (await load(media)).grayscale().png().toBuffer();
  return { data: out, mimetype: 'image/png', filename: 'gri.png' };
}

async function flip(media) {
  const out = await (await load(media)).flop().png().toBuffer();
  return { data: out, mimetype: 'image/png', filename: 'cevirildi.png' };
}

const asMedia = (r) => ({ mimetype: r.mimetype, data: r.data.toString('base64'), filename: r.filename });

module.exports = { blur, sharpen, resize, cropSquare, rotate, grayscale, flip, asMedia };
