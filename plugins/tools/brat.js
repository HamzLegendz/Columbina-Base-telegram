import axios from 'axios';

const handler = async (m, { conn, text }) => {
    const targetText = text || m.quoted?.text;
    if (!targetText) {
        return conn.sendMessage(m.chat.id, 'Masukkan teks atau balas sebuah pesan.\nContoh: `/brat hai`', { quoted: m });
    }

    const jawir = await conn.sendMessage(m.chat.id, 'Sedang membuat stiker gambar...', { quoted: m });

    try {
        const apiUrl = `https://brat.siputzx.my.id/image?text=${encodeURIComponent(targetText)}`;
        const response = await axios.get(apiUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data, 'binary');

        await conn.sendMessage(m.chat.id, { sticker: imageBuffer }, { quoted: m });
        await conn.deleteMessage(m.chat.id, jawir.message_id);

    } catch (e) {
        await conn.editMessage(m.chat.id, jawir.message_id, `Gagal membuat stiker.\n*Alasan:* ${e.message}`);
    }
};

handler.help = ['brat <teks>'];
handler.tags = ['sticker'];
handler.command = /^(brat)$/i;
handler.limit = true;

export default handler;
