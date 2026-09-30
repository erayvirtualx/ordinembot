module.exports = {
  name: 'ping',
  run: async ({ msg }) => {
    const t = Date.now();
    const m = await msg.reply('🏓 Pong...');
    await m.edit(`🏓 Pong! ${Date.now() - t}ms`).catch(() => {});
  }
};
