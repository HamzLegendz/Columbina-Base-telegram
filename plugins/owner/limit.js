import * as DB from '../../helpers/db.js';
const handler = async (m, { conn, command, text }) => {
    const [target, amountStr] = text.split(' ');
    const amount = parseInt(amountStr);
    if (!target || !amount || isNaN(amount)) return m.reply(`Gunakan format:\n/${command} <user_id> <jumlah>`);
    const userId = target.replace('@', '');
    const user = DB.getUser(userId);
    if (command === 'setlimit') {
        DB.updateData('user', userId, { limit: amount });
        await m.reply(`✅ Limit untuk pengguna \`${userId}\` berhasil diatur menjadi *${amount}*.`);
    } else {
        DB.updateData('user', userId, { limit: user.limit + amount });
        await m.reply(`✅ Berhasil menambahkan *${amount}* limit untuk pengguna \`${userId}\`. Total sekarang: *${user.limit + amount}*.`);
    }
};
handler.command = /^(setlimit|addlimit)$/i;
handler.help = ['setlimit', 'addlimit'];
handler.tags = ['owner'];
handler.owner = true;
export default handler;
