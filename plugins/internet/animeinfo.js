import axios from 'axios';

const handler = async (m, { conn, text, escapeMarkdownV2 }) => {
    if (!text) return m.reply('Masukkan judul anime yang ingin dicari.');
    try {
        const { data } = await axios.get(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(text)}&limit=1`);
        if (!data.data || data.data.length === 0) throw new Error('Anime tidak ditemukan.');
        
        const anime = data.data[0];
        const synopsis = escapeMarkdownV2(anime.synopsis?.substring(0, 500) || 'Tidak ada');
        const title = escapeMarkdownV2(anime.title);

        let responseText = `*${title}* (${escapeMarkdownV2(anime.title_japanese)})\n\n`;
        responseText += `*Rating:* ⭐ ${anime.score}\n`;
        responseText += `*Episode:* ${anime.episodes}\n`;
        responseText += `*Status:* ${anime.status}\n`;
        responseText += `*Studio:* ${anime.studios.map(s => s.name).join(', ')}\n\n`;
        responseText += `*Sinopsis:*\n${synopsis}...`;

        await conn.sendMessage(m.chatId, {
            image: { url: anime.images.jpg.large_image_url },
            caption: responseText,
            buttons: [[{ displayText: 'Lihat di MyAnimeList', url: anime.url }]]
        });
    } catch (e) {
        await m.reply(`Gagal mencari anime. Error: ${e.message}`);
    }
};
handler.command = /^(anime|animeinfo)$/i;
handler.help = ['anime <judul>'];
handler.tags = ['internet'];
handler.limit = true;
export default handler;
