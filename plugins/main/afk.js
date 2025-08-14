import * as DB from '../../helpers/db.js';


const handler = async (m, { text }) => {
    const reason = text || 'Tidak ada alasan';

    DB.updateData('user', m.sender.id, {
        afk: {
            time: Date.now(),
            reason: reason
        }
    });
    
    await m.reply(`*${m.sender.first_name}* sekarang dalam mode AFK.\n*Alasan:* ${reason}`);
};

handler.command = /^(afk)$/i;
handler.help = ['afk [alasan]'];
handler.tags = ['main'];

export default handler;
