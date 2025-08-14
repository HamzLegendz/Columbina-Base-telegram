const handler = async (m, { conn }) => {
    if (!m.quoted) {
        return m.reply('Balas (reply) pesan yang ingin Anda hapus.');
    }

    try {
        // Hapus pesan yang dibalas
        await conn.deleteMessage(m.chatId, m.quoted.message_id);
        // Hapus juga pesan perintah /del
        await m.deleteMessage(); 
    } catch (e) {
        await m.reply(`Gagal menghapus pesan. Pastikan saya adalah admin dengan izin yang cukup.`);
    }
};

handler.command = /^(del|delete|hapus)$/i;
handler.help = ['del'];
handler.tags = ['admin'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;
export default handler;
