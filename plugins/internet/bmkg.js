import axios from 'axios';

const handler = async (m, { conn }) => {
    try {
        const { data } = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
        
        if (!data.Infogempa || !data.Infogempa.gempa) {
            throw new Error('Gagal mendapatkan data gempa dari BMKG.');
        }

        const gempa = data.Infogempa.gempa;
        const imageUrl = `https://data.bmkg.go.id/DataMKG/TEWS/${gempa.Shakemap}`;
        const bmkgLink = 'https://www.bmkg.go.id/gempabumi/gempabumi-terkini.bmkg';

        let responseText = `*Informasi Gempa Terkini*\n\n`;
        responseText += `*Waktu:* ${gempa.Tanggal}, ${gempa.Jam}\n`;
        responseText += `*Magnitudo:* ${gempa.Magnitude} SR\n`;
        responseText += `*Kedalaman:* ${gempa.Kedalaman}\n`;
        responseText += `*Koordinat:* ${gempa.Lintang} - ${gempa.Bujur}\n\n`;
        responseText += `*Lokasi:*\n${gempa.Wilayah}\n\n`;
        responseText += `*Potensi:*\n${gempa.Potensi}`;

        await conn.sendMessage(m.chat.id, {
            image: { url: imageUrl },
            caption: responseText.trim(),
            buttons: [
                [
                    { displayText: 'Lihat di BMKG', url: bmkgLink }
                ]
            ]
        });

    } catch (e) {
        console.error(e);
        await conn.sendMessage(m.chat.id, `Gagal mengambil data gempa. Sumber data mungkin sedang tidak tersedia.`);
    }
};

handler.command = /^(gempa)$/i;
handler.help = ['gempa'];
handler.tags = ['internet', 'info'];
handler.limit = true;

export default handler;
