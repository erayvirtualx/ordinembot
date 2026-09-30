const fs = require('fs');
const path = require('path');

module.exports = {
  name: ['update', 'reload', 'yenile'],
  run: async ({ client, msg, chat, sender, isOwner, db, config }) => {
    if (!isOwner) return msg.reply('❌ Sahip komutu.');

    const start = Date.now();

    // 1. Config'i yeniden yükle
    delete require.cache[require.resolve('../config')];
    const newConfig = require('../config');
    Object.assign(config, newConfig);
    // Mevcut client'ın config'ini güncelle
    client.config = config;

    // 2. Sadece pluginleri yenile (lib/cache'e DOKUNMA)
    client.commands.clear();
    const pluginFiles = fs.readdirSync('./plugins').filter((f) => f.endsWith('.js'));
    let loaded = 0;
    for (const f of pluginFiles) {
      try {
        delete require.cache[require.resolve('./plugins/' + f)];
        const plugin = require('./plugins/' + f);
        for (const name of [].concat(plugin.name)) {
          client.commands.set(name, plugin);
        }
        loaded++;
      } catch (e) {
        console.error(`Plugin yükleme hatası (${f}):`, e.message);
      }
    }

    const ms = Date.now() - start;
    await msg.reply(`🔄 Yenilendi: ${loaded}/${pluginFiles.length} plugin + config\n⏱️ ${ms}ms\n\n⚠️ Not: Diğer oturumlar/ Lib/DB değişiklikleri için \`npm start\` ile yeniden başlatın.`);
  }
};