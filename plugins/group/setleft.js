import * as DB from '../../helpers/db.js';

/**
 * @file Mengelola pesan selamat tinggal (left/goodbye) untuk grup.
 */
const handler = async (m, { text }) => {
    const group = DB.getGroup(m.chatId);

    if (!text) {
        const status = group.isGoodbyeOn ? '✅ Aktif' : '❌ Nonaktif';
        let msg = `*Pengaturan Pesan Selamat Tinggal*\n\n`;
        msg += `*Status:* ${status}\n`;
        msg += `*Pesan Saat Ini:* \n\`${group.goodbye}\`\n\n`;
        msg += `*Cara Penggunaan:*\n`;
        msg += `- \` /setleft on \` (untuk mengaktifkan)\n`;
        msg += `- \` /setleft off \` (untuk menonaktifkan)\n`;
        msg += `- \` /setleft <teks> \` (untuk mengubah pesan)\n\n`;
        msg += `*Placeholder yang tersedia:*\n`;
        msg += `- \` @user \` untuk nama pengguna yang keluar.\n`;
        msg += `- \` @group \` untuk menampilkan nama grup.`;
        return m.reply(msg);
    }

    const action = text.toLowerCase();
    if (action === 'on') {
        DB.updateData('group', m.chatId, { isGoodbyeOn: true });
        return m.reply('✅ Pesan selamat tinggal diaktifkan.');
    }
    
    if (action === 'off') {
        DB.updateData('group', m.chatId, { isGoodbyeOn: false });
        return m.reply('❌ Pesan selamat tinggal dinonaktifkan.');
    }

    DB.updateData('group', m.chatId, { goodbye: text, isGoodbyeOn: true });
    m.reply(`✅ Pesan selamat tinggal berhasil diatur dan otomatis diaktifkan.`);
};

handler.command = /^(setleft|setgoodbye)$/i;
handler.help = ['setleft <teks|on|off>'];
handler.tags = ['admin'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;
export default handler;
