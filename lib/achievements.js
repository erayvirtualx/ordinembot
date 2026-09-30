const ACH = {
  ilk_milyon:    { name: '💰 İlk Milyon',    desc: 'Toplam servetin 1.000.000 TL\'ye ulaştı', reward: 50000 },
  ilk_soygun:    { name: '🦹 İlk Soygun',    desc: 'İlk başarılı soygununu yaptın',            reward: 20000 },
  yuz_mesaj:     { name: '💬 Sosyal Kelebek', desc: '100 mesaj yazdın',                        reward: 30000 },
  seviye_10:     { name: '⭐ Kalfa',         desc: 'Seviye 10\'a ulaştın',                     reward: 50000 },
  seviye_20:     { name: '⭐ Efsane',        desc: 'Seviye 20\'ye ulaştın',                    reward: 150000 },
  evli:          { name: '💍 Evlilik',       desc: 'Evlendin',                                 reward: 20000 },
  ilk_esya:      { name: '🛍️ İlk Alışveriş', desc: 'Marketten ilk eşyanı aldın',               reward: 10000 },
  kumar_ustasi:  { name: '🎰 Kumar Ustası',  desc: 'Toplam 50 kumar oyunu kazandın',           reward: 100000 }
};

function grant(u, id) {
  u.achievements = u.achievements || [];
  if (u.achievements.includes(id)) return null;
  u.achievements.push(id);
  const a = ACH[id];
  u.balance += a.reward;
  return a;
}

function checkWealth(u) { return u.balance + u.bank >= 1_000_000 ? grant(u, 'ilk_milyon') : null; }
function checkLevel(u, level) {
  const out = [];
  if (level >= 10) { const a = grant(u, 'seviye_10'); if (a) out.push(a); }
  if (level >= 20) { const a = grant(u, 'seviye_20'); if (a) out.push(a); }
  return out;
}
function checkGameWin(u) {
  u.gameWinsTotal = (u.gameWinsTotal || 0) + 1;
  return u.gameWinsTotal >= 50 ? grant(u, 'kumar_ustasi') : null;
}

module.exports = { ACH, grant, checkWealth, checkLevel, checkGameWin };
