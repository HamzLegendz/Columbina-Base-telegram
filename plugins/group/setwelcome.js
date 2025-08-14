import * as DB from '../../helpers/db.js';

/**
 * @file Mengelola pesan selamat datang (welcome) untuk grup.
 */
const handler = async (m, { text }) => {
    const group = DB.getGroup(m.chatId);
    
    // Jika tidak ada argumen, tampilkan status nya
    if (!text) {
        const status = group.isWelcomeOn ? '✅ Aktif' : '❌ Nonaktif';
        let msg = `*Pengaturan Pesan Selamat Datang*\n\n`;
        msg += `*Status:* ${status}\n`;
        msg += `*Pesan Saat Ini:* \n\`${group.welcome}\`\n\n`;
        msg += `*Cara Penggunaan:*\n`;
        msg += `- \` /setwelcome on \` (untuk mengaktifkan)\n`;
        msg += `- \` /setwelcome off \` (untuk menonaktifkan)\n`;
        msg += `- \` /setwelcome <teks> \` (untuk mengubah pesan)\n\n`;
        msg += `*Placeholder yang tersedia:*\n`;
        msg += `- \` @user \` untuk mention pengguna baru.\n`;
        msg += `- \` @group \` untuk menampilkan nama grup.`;
        return m.reply(msg);
    }

    const action = text.toLowerCase();
    if (action === 'on') {
        DB.updateData('group', m.chatId, { isWelcomeOn: true });
        return m.reply('✅ Pesan selamat datang telah diaktifkan.');
    }
    
    if (action === 'off') {
        DB.updateData('group', m.chatId, { isWelcomeOn: false });
        return m.reply('❌ Pesan selamat datang telah dinonaktifkan.');
    }

    DB.updateData('group', m.chatId, { welcome: text, isWelcomeOn: true });
    m.reply(`✅ Pesan selamat datang berhasil diatur dan otomatis diaktifkan.`);
};

handler.command = /^setwelcome$/i;
handler.help = ['setwelcome <teks|on|off>'];
handler.tags = ['group'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true
export default handler;
