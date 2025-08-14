import fs from 'fs-extra';
import { formatUptime } from '../../helpers/utils.js';

const randomQuotes = [
    "Teruslah belajar, karena hidup tak pernah berhenti memberi pelajaran.",
    "Satu-satunya cara untuk melakukan pekerjaan hebat adalah dengan mencintai apa yang Anda lakukan.",
    "Masa depan adalah milik mereka yang menyiapkan hari ini.",
    "Jangan takut berjalan lambat, takutlah jika hanya berdiri diam.",
    "Kesuksesan adalah hasil dari kesempurnaan, kerja keras, dan belajar dari kegagalan."
];

const handler = async (m, { conn, user, plugins, isOwner }) => {
    const botInfo = m.botInfo;
    const from = m.sender;
    const db = fs.readJsonSync('./database.json');
    const totalUsers = Object.keys(db.users || {}).length;
    const totalCommands = plugins.length;

    let userStatus = user.premium ? 'Premium ✨' : 'Standard';
    if (isOwner) userStatus = 'Owner 👑';

    const greeting = getGreeting();
    const dateTime = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        dateStyle: 'full',
        timeStyle: 'short'
    });
    const randomQuote = randomQuotes[Math.floor(Math.random() * randomQuotes.length)];

    let menuText = `╭─「 *${botInfo.first_name}* 」\n`;
    menuText += `│ ${greeting}, *${from.first_name}*!\n`;
    menuText += `│\n`;
    menuText += `├─ 👤 *Status Anda*: ${userStatus}\n`;
    menuText += `├─ 🎟️ *Sisa Limit*: ${user.limit}\n`;
    menuText += `╰─────────────────✧\n\n`;
    menuText += `Berikut adalah informasi bot saat ini:\n`;
    menuText += "```\n";
    menuText += `• Waktu Server : ${dateTime} WIB\n`;
    menuText += `• Uptime      : ${formatUptime(process.uptime())}\n`;
    menuText += `• Mode Bot    : ${global.botMode.toUpperCase()}\n`;
    menuText += `• Total User  : ${totalUsers} Pengguna\n`;
    menuText += `• Total Fitur : ${totalCommands} Perintah\n`;
    menuText += "```\n\n";
    menuText += `_"${randomQuote}"_`;

    const buttons = [
        [
            { displayText: 'Allmenu', buttonId: `${global.prefix}allmenu` },
            { displayText: 'Statistik Bot', buttonId: `${global.prefix}stats` }
        ],
        [
            { displayText: 'Owner', url: global.tme }
        ]
    ];

    await conn.sendMessage(m.chatId, {
        caption: menuText.trim(),
        buttons: buttons,
        image: global.thumb
    });
};

handler.command = /^(menu|help|\?)$/i;
handler.help = ['menu', 'help'];
handler.tags = ['main'];

export default handler;

function getGreeting() {
    const hour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }));
    if (hour >= 4 && hour < 11) return 'Selamat Pagi ☀️';
    if (hour >= 11 && hour < 15) return 'Selamat Siang 🌤️';
    if (hour >= 15 && hour < 19) return 'Selamat Sore 🌇';
    return 'Selamat Malam 🌙';
}
