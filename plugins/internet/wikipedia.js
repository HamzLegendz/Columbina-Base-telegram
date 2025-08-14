import axios from 'axios';

const handler = async (m, { conn, text }) => {
    if (!text) {
        return conn.sendMessage(m.chat.id, 'Silakan masukkan topik yang ingin Anda cari.`', { quoted: m });
    }

    const wiki = await conn.sendMessage(m.chat.id, `🔍 Mencari artikel Wikipedia untuk "*${text}*"...`, { quoted: m });

    try {
        const searchResponse = await axios.get(`https://id.wikipedia.org/w/api.php`, {
            params: {
                action: 'query',
                list: 'search',
                srsearch: text,
                format: 'json'
            }
        });

        if (!searchResponse.data.query.search.length) {
            throw new Error(`Artikel dengan judul "*${text}*" tidak dapat ditemukan di Wikipedia.`);
        }
        
        const pageId = searchResponse.data.query.search[0].pageid;
        const pageTitle = searchResponse.data.query.search[0].title;

        const detailsResponse = await axios.get(`https://id.wikipedia.org/w/api.php`, {
            params: {
                action: 'query',
                prop: 'extracts|pageimages|info',
                exintro: true,
                explaintext: true,
                pithumbsize: 500,
                pageids: pageId,
                format: 'json',
                inprop: 'url'
            }
        });

        const page = detailsResponse.data.query.pages[pageId];
        if (!page) throw new Error('Gagal memuat detail artikel.');

        const summary = page.extract?.substring(0, 900) || 'Ringkasan tidak tersedia.';
        const pageUrl = page.fullurl;
        const lastModified = new Date(page.touched).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });

        let responseText = `*${pageTitle}*\n\n${summary}...\n\n*Terakhir diubah:* ${lastModified}`;
        
        let respon;
        const buttons = [[{ displayText: 'Baca Selengkapnya di Wikipedia', url: pageUrl }]];

        if (page.thumbnail && page.thumbnail.source) {
            respon = {
                image: { url: page.thumbnail.source },
                caption: responseText,
                buttons: buttons
            };
        } else {
            respon = {
                text: responseText,
                buttons: buttons,
                disable_web_page_preview: true
            };
        }
        
        await conn.editMessage(m.chat.id, wiki.message_id, respon);

    } catch (e) {
        console.error(e);
        await conn.editMessage(m.chat.id, wiki.message_id, `Gagal memproses permintaan.\n*Alasan:* ${e.message}`);
    }
};

handler.command = /^(wiki|pedia)$/i;
handler.help = ['wiki <topik>'];
handler.tags = ['internet'];
handler.limit = true;

export default handler;
