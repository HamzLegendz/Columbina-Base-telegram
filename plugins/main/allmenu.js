import { formatUptime } from '../../helpers/utils.js';
import fs from 'fs-extra';

const db = fs.readJsonSync('./database.json');

const handler = async (m, { user, conn, plugins }) => {
    const botName = global.botname;
    const prefix = global.prefix;
    const uptime = formatUptime(process.uptime());
    const mention = m.from.first_name;
    const totalPlugins = plugins.length;
    const totalUsers = Object.keys(db.users || {}).length;

    let headerText =
`⟪ ${botName} ⟫
${ucapan()}, ${mention}!

╭─❏ INFORMASI BOT
│ Owner       : ${global.owner.name}
│ Prefix      : ${prefix}
│ Limit Anda  : ${user.limit}
│ Uptime      : ${uptime}
│ Total Plugin: ${totalPlugins}
│ Pengguna    : ${totalUsers}
╰───────────────❏`;

    let menuText = `${headerText}\n\n`;
    const groupedPlugins = groupPluginsByTag(plugins);
    const sortedTags = Object.keys(groupedPlugins).sort();

    const tagEmojis = {
        main: '📄', internet: '🌐', tools: '🛠️', owner: '👑', group: '🪩', downloader: '📥', info: '📡'
    };

    for (const tag of sortedTags) {
        const emoji = tagEmojis[tag] || '📁';
        const tagName = tag.charAt(0).toUpperCase() + tag.slice(1);
        menuText += `*${emoji} ${tagName}*\n`;

        groupedPlugins[tag].forEach(plugin => {
            const commandName = Array.isArray(plugin.help)
                ? plugin.help[0].split(' ')[0]
                : plugin.help.split(' ')[0];
            let line = `${prefix}${commandName}`;
            if (plugin.premium) line += ' Ⓟ';
            if (plugin.limit) line += ' Ⓛ';
            menuText += `${line}\n`;
        });

        menuText += '\n';
    }

    menuText += `*Keterangan:*  
Ⓟ: Perintah Khusus Premium  
Ⓛ: Perintah Menggunakan Limit`;

    await conn.sendMessage(m.chat.id, {
        image: global.thumb,
        caption: menuText.trim(),
        buttons: [
            [
                { displayText: 'Info Bot', buttonId: `${prefix}stats` },
                { displayText: 'Owner', url: global.tme }
            ]
        ]
    });
};

handler.command = /^(allmenu|fullmenu|menuall)$/i;
handler.help = ['allmenu'];
handler.tags = ['main'];

export default handler;

function ucapan() {
    const hour = parseInt(new Date().toLocaleString('en-US', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        hour12: false
    }));
    if (hour >= 4 && hour < 11) return 'Selamat Pagi ☀️';
    if (hour >= 11 && hour < 15) return 'Selamat Siang 🌤️';
    if (hour >= 15 && hour < 19) return 'Selamat Sore 🌇';
    return 'Selamat Malam 🌙';
}

function groupPluginsByTag(plugins) {
    return plugins.reduce((acc, plugin) => {
        if (!plugin.tags || !plugin.help || plugin.tags.includes('hidden')) return acc;
        const tag = plugin.tags[0] || 'lainnya';
        if (!acc[tag]) acc[tag] = [];
        acc[tag].push(plugin);
        return acc;
    }, {});
}
