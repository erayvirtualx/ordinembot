// Komut bazlı yetki sistemi.
//
// Seviyeler (küçükten büyüğe):
//   all   → herkes kullanabilir
//   admin → grup yöneticisi VEYA bot sahibi VEYA sudo kullanıcı
//   owner → yalnızca bot sahibi
//
// Plugin iki şekilde tanımlayabilir:
//   1) Dosya geneli:  { owner: true } / { admin: true } / { group: true }
//   2) Komut bazlı:  perm: { kanalolustur: 'owner', grupkart: { level: 'admin', group: true } }
//      Bu yöntem aynı dosyadaki farklı risk seviyelerini ayırmak içindir ve
//      dosya geneli bayrakların üzerine yazar.

const LEVELS = ['all', 'admin', 'owner'];
const lower = (s) => String(s == null ? '' : s).toLocaleLowerCase('tr');

function normalize(v) {
  if (typeof v === 'string') return { level: LEVELS.includes(v) ? v : 'all', group: null };
  if (v && typeof v === 'object') {
    return {
      level: LEVELS.includes(v.level) ? v.level : 'all',
      group: v.group === true ? true : v.group === false ? false : null
    };
  }
  return null;
}

/** Komut için etkin yetki şartını çözer. */
function spec(plugin, cmd) {
  const key = lower(cmd);
  // perm anahtarları büyük/küçük harf ve Türkçe harf farklarına duyarsız olsun.
  let table = null;
  const raw = plugin && plugin.perm;
  if (raw) {
    for (const k of Object.keys(raw)) {
      if (lower(k) === key) { table = { level: normalize(raw[k]) }; break; }
    }
  }
  const override = table && table.level;
  const base = {
    level: plugin && plugin.owner ? 'owner' : plugin && plugin.admin ? 'admin' : 'all',
    group: !!(plugin && plugin.group)
  };
  if (!override) return base;
  return {
    level: override.level,
    group: override.group === null ? base.group : override.group
  };
}

/**
 * Yetki kontrolü. İzin veriyorsa null, reddediyorsa kullanıcıya gösterilecek
 * mesajı döndürür.
 */
function check(s, ctx) {
  if (s.group && !ctx.isGroup) return 'Bu komut sadece gruplarda çalışır.';
  if (s.level === 'owner' && !ctx.isOwner) return 'Bu komut sadece bot sahibine özel.';
  if (s.level === 'admin' && !ctx.isAdmin && !ctx.isOwner && !ctx.isSudo) {
    return ctx.isGroup
      ? 'Bu komut için grup yöneticisi olmalısın.'
      : 'Bu komut gruplarda kullanılabilir.';
  }
  return null;
}

/** Kısa etiket — yardım çıktısında ve hata mesajlarında kullanılır. */
function label(s) {
  return s.level === 'all' ? '' : s.level === 'admin' ? ' [admin]' : ' [sahip]';
}

module.exports = { LEVELS, spec, check, label };
