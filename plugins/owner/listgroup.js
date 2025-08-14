import fs from 'fs-extra';
const handler = async (m, { conn }) => {
    const db = fs.readJsonSync('./database.json');
    const groups = Object.values(db.groups || {});
    if (groups.length === 0) return m.reply('Bot tidak berada di grup mana pun.');
    let text = `*Daftar Grup (${groups.length})*\n\n`;
    for (const group of groups) {
        try {
            const chat = await conn.telegram.getChat(group.id);
            text += `*${chat.title}*\n - ID: \`${chat.id}\`\n - Anggota: ${await conn.telegram.getChatMembersCount(chat.id)}\n\n`;
        } catch {
            text += `*Grup Tidak Dikenal*\n - ID: \`${group.id}\` (Mungkin bot sudah ditendang)\n\n`;
        }
    }
    await m.reply(text.trim());
};
handler.command = /^(listgroups|lg)$/i;
handler.help = ['listgroups'];
handler.tags = ['owner'];
handler.owner = true;
export default handler;
