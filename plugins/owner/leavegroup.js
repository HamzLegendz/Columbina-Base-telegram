const handler = async (m, { conn, text }) => {
    if (!text) return m.reply('Masukkan ID grup yang ingin ditinggalkan.');
    try {
        await m.reply(`Mencoba keluar dari grup \`${text}\`...`);
        await conn.telegram.leaveChat(text);
        // Tidak bisa mengirim pesan konfirmasi setelah keluar
    } catch (e) {
        await m.reply(`Gagal keluar dari grup. Mungkin ID salah atau saya bukan anggota. Error: ${e.message}`);
    }
};
handler.command = /^leavegroup|leave$/i;
handler.help = ['leavegroup <chat_id>'];
handler.tags = ['owner'];
handler.owner = true;
export default handler;
