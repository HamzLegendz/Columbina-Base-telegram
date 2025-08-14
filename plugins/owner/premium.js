import * as DB from '../../helpers/db.js';

const handler = async (m, { conn, command, text }) => {
    const targetUser = m.message?.reply_to_message?.from || (text ? { id: text.replace('@', '') } : null);
    if (!targetUser) return m.reply('Balas pesan pengguna atau masukkan ID/username mereka.');

    const userId = String(targetUser.id);
    const action = command === 'addprem';
    
    try {
        const user = DB.getUser(userId);
        if (user.premium === action) {
            return m.reply(`Pengguna dengan ID \`${userId}\` sudah dalam status *${action ? 'premium' : 'bukan premium'}*.`);
        }
        
        DB.updateData('user', userId, { premium: action });
        
        await m.reply(`✅ Berhasil *${action ? 'menambahkan' : 'menghapus'}* status premium untuk pengguna dengan ID \`${userId}\`.`);
    } catch (e) {
        await m.reply(`Gagal memperbarui status premium. Error: ${e.message}`);
    }
};

handler.command = /^(addprem|delprem)$/i;
handler.help = ['addprem', 'delprem'];
handler.tags = ['owner'];
handler.owner = true;

export default handler;
