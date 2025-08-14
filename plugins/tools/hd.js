import axios from 'axios';
import FormData from 'form-data';

const handler = async (m, { conn }) => {
    const photo = m.quoted?.photo || m.message?.photo;

    if (!photo) {
        return conn.sendMessage(m.chat.id, 'Gambar tidak ditemukan.\nKirim gambar dengan caption `/hd` atau balas gambar dengan perintah ini.', { quoted: m });
    }

    const sabar = await conn.sendMessage(m.chat.id, '⏳ Sedang meningkatkan resolusi gambar, tunggu sebentar...', { quoted: m });

    try {
        const fileId = photo[photo.length - 1].file_id;
        const fileLink = await conn.telegram.getFileLink(fileId);
        const imageResponse = await axios.get(fileLink.href, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, seperti Gecko) Chrome/139.0.0.0 Mobile Safari/537.36,gzip(gfe)' }
        });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');

        const form = new FormData();
        form.append('image', imageBuffer, 'image.jpg');
        form.append('scale', '2');

        const { data } = await axios.post('https://api2.pixelcut.app/image/upscale/v1', form, {
            headers: {
                ...form.getHeaders(),
                accept: 'application/json',
                'x-client-version': 'web'
            },
            timeout: 30000
        });

        if (!data.result_url) throw new Error('API tidak mengembalikan hasil.');

        await conn.sendMessage(m.chat.id, {
            image: { url: data.result_url },
            caption: 'Gambar berhasil di-HD!'
        }, { quoted: m });

            await conn.deleteMessage(m.chat.id, sabar.message_id);
        

    } catch (e) {
        try {
            await conn.editMessage(m.chat.id, sabar.message_id, `❌ Gagal memproses gambar.\n*Alasan:* ${e.message}`);
        } catch {
            await conn.sendMessage(m.chat.id, `❌ Gagal memproses gambar.\n*Alasan:* ${e.message}`, { quoted: m });
        }
    }
};

handler.help = ['hd', 'upscale'];
handler.command = /^(hd|upscale)$/i;
handler.tags = ['tools'];
handler.limit = true;
handler.premium = true;

export default handler;
