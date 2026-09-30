const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');

const directory = path.resolve('./plugins');
const allowedHosts = new Set(['raw.githubusercontent.com', 'gist.githubusercontent.com']);

module.exports = {
  name: ['plugin'],
  owner: true,
  run: async ({ client, msg, args }) => {
    const action = (args[0] || '').toLowerCase();
    if (action === 'list') {
      const rows = [...client.commands.entries()].map(([name, plugin]) => `.${name} — ${plugin.__source || 'yerleşik'}`);
      return msg.reply(`🧩 *Yüklü komutlar*\n${rows.join('\n')}`);
    }
    if (action === 'remove') {
      const name = (args[1] || '').toLowerCase();
      const file = path.join(directory, `${name}.js`);
      if (!/^[a-z0-9_-]{1,32}$/.test(name) || !fs.existsSync(file)) return msg.reply('Kullanım: .plugin remove <eklenti-adı>');
      const loaded = require.cache[require.resolve(file)]?.exports;
      if (loaded) for (const command of [].concat(loaded.name || [])) if (client.commands.get(command) === loaded) client.commands.delete(command);
      delete require.cache[require.resolve(file)]; fs.unlinkSync(file);
      return msg.reply(`🗑️ ${name} eklentisi kaldırıldı.`);
    }
    if (action !== 'install') return msg.reply('Kullanım: .plugin list | .plugin install <ad> <GitHub raw URL> | .plugin remove <ad>');

    const name = (args[1] || '').toLowerCase();
    const source = args[2];
    if (!/^[a-z0-9_-]{1,32}$/.test(name) || !source || !source.startsWith('https://')) return msg.reply('Kullanım: .plugin install <ad> <GitHub raw URL>');
    let url;
    try { url = new URL(source); } catch { return msg.reply('Geçersiz URL.'); }
    if (!allowedHosts.has(url.hostname)) return msg.reply('Yalnızca raw.githubusercontent.com veya gist.githubusercontent.com kaynakları kabul edilir.');
    const file = path.join(directory, `${name}.js`);
    if (fs.existsSync(file)) return msg.reply('Bu eklenti adı zaten kullanılıyor.');

    let response;
    try { response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' }); }
    catch (e) { return msg.reply(`Eklenti indirilemedi: ${e.message}`); }
    if (!response.ok) return msg.reply(`Eklenti kaynağı HTTP ${response.status} döndürdü.`);
    const sourceCode = await response.text();
    if (Buffer.byteLength(sourceCode, 'utf8') > 150000) return msg.reply('Eklenti 150 KB sınırını aşıyor.');
    try { new vm.Script(sourceCode, { filename: `${name}.js` }); }
    catch (e) { return msg.reply(`JavaScript sözdizimi hatası: ${e.message}`); }

    fs.writeFileSync(file, sourceCode, { encoding: 'utf8', flag: 'wx' });
    try {
      const plugin = require(file);
      if (!plugin || !plugin.name || typeof plugin.run !== 'function') throw new Error('Eklenti { name, run } dışa aktarmalı.');
      const names = [].concat(plugin.name);
      const conflict = names.find((command) => client.commands.has(command));
      if (conflict) throw new Error(`.${conflict} komutu zaten kayıtlı.`);
      plugin.__source = name;
      for (const command of names) client.commands.set(command, plugin);
      return msg.reply(`✅ ${names.length} komut canlı olarak yüklendi: ${names.map((x) => `.${x}`).join(', ')}`);
    } catch (e) {
      delete require.cache[require.resolve(file)]; fs.unlinkSync(file);
      return msg.reply(`Eklenti yüklenemedi: ${e.message}`);
    }
  }
};
