import axios from 'axios';

const handler = async (m, { conn, text, isUrl, escapeMarkdownV2 }) => {

    if (!text || !isUrl(text) || !text.includes('tiktok.com')) {
        return conn.sendMessage(m.chatId, 'Masukkan URL video atau slideshow TikTok yang valid.', { quoted: m });
    }

    const sabar = await conn.sendMessage(m.chat.id, 'Sedang memproses link TikTok, mohon tunggu...', { quoted: m });

    try {
        const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}&hd=1`);

        if (!data || data.code !== 0) {
            throw new Error(data?.msg || 'Gagal mengambil data dari API TikTok.');
        }

        const result = data.data;
        

        const title = escapeMarkdownV2(result.title || 'Konten TikTok');
        const author = escapeMarkdownV2(result.author.unique_id);
        const musicTitle = escapeMarkdownV2(result.music_info.title);
        const likes = result.digg_count?.toLocaleString('id-ID') || '0';
        const comments = result.comment_count?.toLocaleString('id-ID') || '0';
        const shares = result.share_count?.toLocaleString('id-ID') || '0';


        if (result.images && result.images.length > 0) {
       
            let detailedCaption = `*Album:* ${title}\n👤 *Author:* @${author}\n\n`;
            detailedCaption += `🎵 *Musik:* ${musicTitle}\n`;
            detailedCaption += `❤️ *Likes:* ${likes}\n`;
            detailedCaption += `💬 *Komentar:* ${comments}\n`;
            detailedCaption += `🔗 *Dibagikan:* ${shares}`;

            
            await conn.sendAlbum(m.chat.id, result.images, {
                caption: detailedCaption,
                quoted: m
            });

        } else if (result.play) {

            let videoUrl = result.play;
            if (!videoUrl.startsWith('http')) {
                videoUrl = `https://www.tikwm.com${videoUrl}`;
            }
            
            const plays = result.play_count?.toLocaleString('id-ID') || '0';

            let detailedCaption = `🎬 *${title}*\n👤 @${author}\n\n`;
            detailedCaption += `🎵 *Musik:* ${musicTitle}\n`;
            detailedCaption += `▶️ *Dilihat:* ${plays}\n`;
            detailedCaption += `❤️ *Likes:* ${likes}\n`;
            detailedCaption += `💬 *Komentar:* ${comments}\n`;
            detailedCaption += `🔗 *Dibagikan:* ${shares}`;

            await conn.sendMessage(m.chat.id, {
                video: { url: videoUrl },
                caption: detailedCaption
            }, { quoted: m });

        } else {
            throw new Error('Tidak ditemukan video atau gambar pada URL yang diberikan.');
        }

        await conn.deleteMessage(m.chat.id, sabar.message_id);

    } catch (e) {
        console.error(e);
        await conn.editMessage(m.chat.id, sabar.message_id, `❌ Gagal memproses link TikTok.\n*Alasan:* ${e.message}`);
    }
};

handler.command = /^(tiktok|tt|ttdl)$/i;
handler.help = ['tiktok <url>'];
handler.tags = ['downloader'];
handler.limit = 3;
handler.premium = true;

export default handler;
