import * as DB from '../../helpers/db.js';

const handler = async (m, { conn, command, text }) => {
    const targetUser = m.message?.reply_to_message?.from || (text ? { id: text.replace('@', '') } : null);
    if (!targetUser) return m.reply('Balas pesan pengguna atau masukkan ID/username mereka.');

    const userId = String(targetUser.id);
    const action = command === 'ban';
    
    try {
        const user = DB.getUser(userId);
        if (user.banned === action) {
            return m.reply(`Pengguna dengan ID \`${userId}\` sudah dalam status *${action ? 'ter-ban' : 'tidak ter-ban'}*.`);
        }
        
        DB.updateData('user', userId, { banned: action });
        
        await m.reply(`✅ Berhasil *${action ? 'mem-ban' : 'membuka ban'}* pengguna dengan ID \`${userId}\`.`);
    } catch (e) {
        await m.reply(`Gagal memperbarui status ban. Error: ${e.message}`);
    }
};

handler.command = /^(ban|unban)$/i;
handler.help = ['ban', 'unban'];
handler.tags = ['owner'];
handler.owner = true;

export default handler;
