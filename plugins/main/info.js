import { formatUptime, formatBytes, systemInfo } from '../../helpers/utils.js';
import fs from 'fs-extra';
import os from 'os';

const handler = async (m, { conn, plugins }) => {
    const stats = global.statistic;
    const system = systemInfo();
    const memoryUsage = process.memoryUsage();
    const db = fs.readJsonSync('./database.json');

    let text = `┌─「 *💻 Sistem & Proses* 」\n`;
    text += `│  *Platform:* ${system.platform} (${system.arch})\n`;
    text += `│  *CPU:* ${system.cpu}\n`;
    text += `│  *RAM:* ${formatBytes(os.freemem())} / ${formatBytes(os.totalmem())}\n`;
    text += `│  *Uptime Bot:* ${formatUptime(process.uptime())}\n`;
    text += `│  *Memori Node.js:* ${formatBytes(memoryUsage.rss)}\n`;
    text += `╰─────────────────\n\n`;

    text += `┌─「 *Informasi Bot* 」\n`;
    text += `│  *Versi Bot:* ${global.botVersion || '1.0.0'}\n`;
    text += `│  *Mode Bot:* ${global.botMode.toUpperCase()}\n`;
    text += `│  *Total Plugin:* ${plugins.length}\n`;
    text += `╰─────────────────\n\n`;

    text += `┌─「 *🗃️ Database* 」\n`;
    text += `│  *Pengguna:* ${Object.keys(db.users || {}).length} terdaftar\n`;
    text += `│  *Grup:* ${Object.keys(db.groups || {}).length} terdaftar\n`;
    text += `╰─────────────────\n\n`;

    text += `┌─「 *📊 Statistik Perintah* 」\n`;
    if (Object.keys(stats).length === 0) {
        text += `│  Belum ada perintah yang digunakan hari ini.\n`;
    } else {
        const sortedCmds = Object.entries(stats).sort((a, b) => b[1].total - a[1].total);
        for (const [command, data] of sortedCmds.slice(0, 10)) {
            text += `│  ◦ \`/${command}\`: *${data.total}* (✅${data.success} | ❌${data.error})\n`;
        }
      }
    text += `╰─────────────────`;

    await conn.sendMessage(m.chatId, text.trim());
};

handler.command = /^(stats|ping)$/i;
handler.help = ['stats', 'ping'];
handler.tags = ['main'];

export default handler;
