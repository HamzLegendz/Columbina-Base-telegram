const handler = async (m, { conn, args }) => {  
    const action = args[0] ? args[0].toLowerCase() : '';  
    const timeStr = args[1];  

    if (!['open', 'close'].includes(action)) {  
        return m.reply('Gunakan format:\n`/group <open|close> [waktu]`\n\nContoh:\n`/group close 10m` (menutup selama 10 menit)\n`/group open` (membuka selamanya)');  
    }  

    const durationSeconds = parseTimeToSeconds(timeStr);  
    const isOpen = action === 'open';  

    try {  
        const currentChat = await conn.getChat(m.chatId);  

        await conn.setChatPermissions(m.chatId, {  
            ...currentChat.permissions,  
            can_send_messages: isOpen,  
        });  

        let replyText = `✅ Grup berhasil di-*${isOpen ? 'buka' : 'tutup'}*.`;  
          
        if (!isOpen && durationSeconds > 0) {  
            replyText += `\nBot akan membuka kembali grup secara otomatis dalam *${timeStr}*.`;  

            setTimeout(async () => {  
                try {  
                    await conn.setChatPermissions(m.chatId, { ...currentChat.permissions, can_send_messages: true });  
                    await conn.sendMessage(m.chatId, '⏰ Waktu penutupan grup telah berakhir. Grup sekarang dibuka kembali!');  
                } catch (e) {  
                    console.error(`Gagal membuka kembali grup ${m.chatId}:`, e);  
                }  
            }, durationSeconds * 1000);  
        }  
          
        await m.reply(replyText);  

    } catch (e) {  
        await m.reply(`Gagal mengubah status grup. Pastikan saya adalah admin dengan izin yang cukup. Error: ${e.message}`);  
    }  
};  

handler.command = /^group$/i;  
handler.help = ['group <open|close> [waktu]'];  
handler.tags = ['admin'];  
handler.group = true;  
handler.admin = true;  
handler.botAdmin = true;  
export default handler;  

function parseTimeToSeconds(timeStr) {  
    if (!timeStr) return 0;  
    const match = timeStr.match(/^(\d+(?:\.\d+)?)(s|m|h|d)$/i);  
    if (!match) return 0;  

    const value = parseFloat(match[1]);  
    const unit = match[2].toLowerCase();  

    switch (unit) {  
        case 's': return value;  
        case 'm': return value * 60;  
        case 'h': return value * 60 * 60;  
        case 'd': return value * 60 * 60 * 24;  
        default: return 0;  
    }  
}