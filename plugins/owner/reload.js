const handler = async (m, { conn }) => {
    try {
        await m.reply('Memuat ulang semua plugin...');
        await conn.loadPlugins();
        await m.reply(`✅ Berhasil memuat ulang *${conn.plugins.length}* plugin.`);
    } catch (e) {
        await m.reply(`Gagal memuat ulang plugin:\n${e.message}`);
    }
};
handler.command = /^(reload)$/i;
handler.help = ['reload'];
handler.tags = ['owner'];
handler.owner = true;
export default handler;
