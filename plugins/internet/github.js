import axios from 'axios';

const handler = async (m, { conn, text }) => {
    if (!text) return conn.sendMessage(m.chat.id, 'Masukkan query pencarian. Contoh: `/github telegraf`');
    try {
        const { data } = await axios.get(`https://api.github.com/search/repositories?q=${encodeURIComponent(text)}`);
        if (!data.items || data.items.length === 0) throw new Error('Repositori tidak ditemukan.');

        const repo = data.items[0];
        let responseText = `*Hasil Pencarian GitHub*\n\n`;
        responseText += `*Nama:* [${repo.full_name}](${repo.html_url})\n`;
        responseText += `*Owner:* [${repo.owner.login}](${repo.owner.html_url})\n`;
        responseText += `*Stars:* ⭐ ${repo.stargazers_count}\n`;
        responseText += `*Forks:* 🍴 ${repo.forks_count}\n`;
        responseText += `*Bahasa:* ${repo.language}\n`;
        responseText += `*Deskripsi:* ${repo.description || 'Tidak ada'}`;

        await conn.sendMessage(m.chat.id, {
            text: responseText,
            disable_web_page_preview: true,
            buttons: [
                [
                    { displayText: 'Buka Repo', url: repo.html_url }
                ]
            ]
        });
    } catch (e) {
        console.error(e);
        await conn.sendMessage(m.chat.id, `Gagal mencari di GitHub. Error: ${e.message}`);
    }
};

handler.command = /^(github|ghsearch)$/i;
handler.help = ['github <query>'];
handler.tags = ['internet', 'tools'];
handler.limit = true;

export default handler;
