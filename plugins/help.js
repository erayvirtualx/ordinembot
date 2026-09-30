const { CATEGORIES, ORDER, entry } = require('../lib/commandmeta');
const perm = require('../lib/perm');

const ICONS = {
  temel: '⚡',
  grup: '👥',
  gizlilik: '🔐',
  medya: '🎬',
  arac: '🛠️',
  arama: '🔍',
  ai: '🧠',
  ekonomi: '💰',
  seviye: '⭐',
  oyun: '🎮',
  sosyal: '💕',
  eglence: '🎭',
  diger: '📦',
  sahip: '👑'
};

const MARK = { owner: ' 🔒', admin: ' 🛡' };

// Kategori kısayolları (alt kategori birleştirme için)
const ALIASES = {
  grup: ['grup', 'koruma', 'otomasyon'],
  temel: ['temel'],
  gizlilik: ['gizlilik', 'ayarlar'],
  medya: ['medya'],
  arac: ['arac', 'araç', 'tools'],
  arama: ['arama', 'search'],
  ai: ['ai', 'yapayzeka', 'yapay-zeka'],
  ekonomi: ['ekonomi', 'eco', 'para'],
  seviye: ['seviye', 'level', 'lvl'],
  oyun: ['oyun', 'game', 'games'],
  sosyal: ['sosyal', 'sosyal', 'relationship'],
  eglence: ['eglence', 'eğlence', 'fun'],
  diger: ['diger', 'diğer', 'other', 'misc'],
  sahip: ['sahip', 'owner', 'admin']
};

// Ters çevrim: kategori -> anahtar (içsel kullanım)
const ALIAS_MAP = {};
for (const [key, aliases] of Object.entries(ALIASES)) {
  for (const a of aliases) ALIAS_MAP[a] = key;
}

// Kısayol komutlar (.grup .oyun .eko vb.) - ÇAKIŞMAYANLAR SADECE
const SHORTCUTS = {
  grup: 'grup',
  temel: 'temel',
  gizlilik: 'gizlilik',
  medya: 'medya',
  arac: 'arac',
  arama: 'arama',
  ai: 'yapayzeka',  // 'ai' çakışıyor, 'yapayzeka' kullan
  ekonomi: 'eko',     // 'ekonomi' uzun, 'eko' kısayol
  seviye: 'lvl',      // 'seviye'/'level' çakışıyor, 'lvl' kısayol
  oyun: 'oyun',
  sosyal: 'sosyal',
  eglence: 'eglence',
  diger: 'diger',
  sahip: 'sahip'
};

function mergeCategories(buckets) {
  // grup, koruma, otomasyon -> tek "grup" kategorisi
  const merged = new Map(buckets);
  const grupCmds = new Map();
  
  for (const cat of ['grup', 'koruma', 'otomasyon']) {
    if (merged.has(cat)) {
      for (const [line, level] of merged.get(cat)) {
        grupCmds.set(line, level);
      }
      merged.delete(cat);
    }
  }
  
  if (grupCmds.size > 0) {
    merged.set('grup', grupCmds);
  }
  
  return merged;
}

function buildCategoryMap(commands, config) {
  const buckets = new Map();
  const seen = new Set();
  for (const [name, plugin] of commands) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = entry(key, plugin);
    if (!buckets.has(meta.category)) buckets.set(meta.category, new Map());
    const line = meta.usage || `.${meta.name}`;
    const level = perm.spec(plugin, key).level;
    const prev = buckets.get(meta.category).get(line);
    if (!prev || (level === 'owner' && prev !== 'owner')) buckets.get(meta.category).set(line, level);
  }
  
  // Kategorileri birleştir
  const merged = mergeCategories(buckets);
  
  return { buckets: merged, total: seen.size };
}

function formatCategoryList(buckets, config) {
  // Sıralama: birleştirilmiş kategoriler
  const displayOrder = ['temel', 'grup', 'gizlilik', 'medya', 'arac', 'arama', 'ai', 'ekonomi', 'seviye', 'oyun', 'sosyal', 'eglence', 'diger', 'sahip'];
  const order = displayOrder.filter(c => buckets.has(c));
  
  let text = `┌─ ⚜ *${config.botName} Menü* ⚜\n`;
  text += `│ Prefix: \`${config.prefix}\` · ${buckets.size} kategori · ${Array.from(buckets.values()).reduce((a, b) => a + b.size, 0)} komut\n`;
  text += `├────────────────────────\n`;
  
  for (const cat of order) {
    const cmds = buckets.get(cat);
    const count = cmds.size;
    const icon = ICONS[cat] || '📁';
    const label = CATEGORIES[cat] || cat;
    text += `│ ${icon} *${label}* — \`${count}\` komut\n`;
  }
  
  text += `└────────────────────────\n\n`;
  text += `💡 *Kategori aç:* \`.yardim <kategori>\` veya kısayol:\n`;
  text += `   \`.grup\` \`.oyun\` \`.yapayzeka\` \`.eko\` \`.lvl\` \`.medya\` \`.arac\` \`.arama\` \`.sosyal\` \`.eglence\` \`.diger\` \`.sahip\` \`.temel\` \`.gizlilik\`\n`;
  text += `🔒 = Sahip · 🛡 = Yönetici`;
  return text;
}

function formatCategoryCommands(cat, buckets, config) {
  const cmds = buckets.get(cat);
  if (!cmds) return `❌ Kategori bulunamadı: \`${cat}\``;
  
  const icon = ICONS[cat] || '📁';
  const label = CATEGORIES[cat] || cat;
  const displayOrder = ['temel', 'grup', 'gizlilik', 'medya', 'arac', 'arama', 'ai', 'ekonomi', 'seviye', 'oyun', 'sosyal', 'eglence', 'diger', 'sahip'];
  const order = displayOrder.filter(c => buckets.has(c));
  const index = order.indexOf(cat) + 1;
  
  const lines = [...cmds.entries()]
    .map(([line, level]) => `  ${line}${(MARK[level] || '')}`)
    .sort((a, b) => a.localeCompare(b, 'tr'));
  
  let text = `┌─ ${icon} *${label}* (${index}/${order.length})\n`;
  text += `│ ${cmds.size} komut\n`;
  text += `├────────────────────────\n`;
  text += lines.join('\n') + '\n';
  text += `└────────────────────────\n\n`;
  text += `🔙 Ana menü: \`.yardim\` veya \`.menu\``;
  return text;
}

module.exports = {
  name: ['yardim', 'menu', 'help', 'komutlar', ...Object.values(SHORTCUTS)],
  run: async ({ msg, client, args, config, cmd }) => {
    const { buckets } = buildCategoryMap(client.commands, config);
    
    // Kısayol komut: .grup .oyun .eko .lvl .yapayzeka vb.
    const shortcutKey = SHORTCUTS[cmd.toLowerCase()];
    const aliasKey = ALIAS_MAP[cmd.toLowerCase()];
    let cat = shortcutKey || aliasKey || (args[0] || '').toLowerCase();
    
    if (!cat) {
      // Ana menü
      return msg.reply(formatCategoryList(buckets, config));
    }
    
    // Kategori eşleşmesi
    const match = [...buckets.keys()].find(c => 
      c === cat || c.startsWith(cat) || (CATEGORIES[c] || '').toLowerCase().includes(cat)
    );
    
    if (match) {
      return msg.reply(formatCategoryCommands(match, buckets, config));
    }
    
    // Kategori bulunamadı, benzerleri öner
    const suggestions = [...buckets.keys()]
      .filter(c => c.includes(cat) || (CATEGORIES[c] || '').toLowerCase().includes(cat))
      .slice(0, 5);
    
    let text = `❌ Kategori bulunamadı: \`${cat}\`\n\n`;
    if (suggestions.length) {
      text += `💡 *Benzerler:*\n${suggestions.map(s => `  • \`.yardim ${s}\` — ${CATEGORIES[s] || s}`).join('\n')}\n\n`;
    }
    text += `📋 Tüm kategoriler: \`.yardim\``;
    return msg.reply(text);
  }
};