import chalk from 'chalk';

const hariIndonesia = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const bulanIndonesia = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function getTimestamp() {
  const d = new Date();
  const hari = hariIndonesia[d.getDay()];
  const tanggal = d.getDate();
  const bulan = bulanIndonesia[d.getMonth()];
  const tahun = d.getFullYear();
  const jam = d.getHours().toString().padStart(2, '0');
  const menit = d.getMinutes().toString().padStart(2, '0');
  const detik = d.getSeconds().toString().padStart(2, '0');
  return `${hari},${tanggal} ${bulan} ${tahun} ${jam}:${menit}:${detik}`;
}

function asciiBox(label, content, colorFn) {
  const lineLen = 28;
  const top = chalk.gray('─'.repeat(lineLen));
  const leftBar = chalk.gray('︳');
  const labelStr = colorFn(`﹂${label}﹁`);
  const lines = content.split('\n');
  const boxedLines = lines.map(line => `${leftBar} ${line}`);
  return [
    top,
    labelStr,
    ...boxedLines,
    top,
  ].join('\n');
}

export function logInfo(message) {
  const label = `INFO ${getTimestamp()}`;
  const content = chalk.blueBright(message);
  console.log(asciiBox(label, content, chalk.blueBright));
}

export function logSuccess(message) {
  const label = `SUCCESS ${getTimestamp()}`;
  const content = chalk.green(message);
  console.log(asciiBox(label, content, chalk.green));
}

export function logError(message) {
  const label = `ERROR ${getTimestamp()}`;
  const content = chalk.red.bold(message);
  console.error(asciiBox(label, content, chalk.red));
}

export function logCommand(ctx, success = true, command = '') {
  const statusColor = success ? chalk.yellowBright : chalk.redBright;
  const statusText = success ? 'SUCCESS' : 'FAILED';
  const statusEmoji = '➣';

  const user = `${chalk.bold(ctx.from.first_name)} (${chalk.gray(ctx.from.id)})`;
  const chatType = ctx.chat.type === 'private'
    ? chalk.magenta('Private')
    : chalk.magenta(`Grp:${ctx.chat.title}`);

  const cmd = chalk.bold.yellow(command || ctx.message?.text || ctx.update.callback_query?.data || '[No Cmd]');

  const content =
    `${statusEmoji} ${statusColor.bold(statusText)}\n` +
    `﹂Cmd﹁: ${cmd}\n` +
    `﹂By﹁: ${user}\n` +
    `﹂In﹁: ${chatType}`;

  console.log(asciiBox(`CMD ${getTimestamp()}`, content, statusColor));
}

export function logEvent(ctx, eventDescription) {
  const user = ctx.from
    ? `${chalk.bold(ctx.from.first_name)} (${chalk.gray(ctx.from.id)})`
    : chalk.gray('N/A');
  const chat = ctx.chat
    ? (ctx.chat.type === 'private' ? chalk.magenta('Private') : chalk.magenta(`Grp:${ctx.chat.title}`))
    : chalk.gray('N/A');

  const content =
    `${chalk.magenta(eventDescription)}\n` +
    `﹂By﹁: ${user}\n` +
    `﹂In﹁: ${chat}`;

  console.log(asciiBox(`EVENT ${getTimestamp()}`, content, chalk.magenta));
}

export function logMessage(ctx) {
  const types = ['text', 'sticker', 'photo', 'video', 'audio', 'document'];
  const messageType = Object.keys(ctx.message).find(k => types.includes(k)) || 'unknown';
  const messageEmoji = '👤';

  const user = `${chalk.bold(ctx.from.first_name)} (${chalk.gray(ctx.from.id)})`;
  const chatType = ctx.chat.type === 'private'
    ? chalk.magenta('Private')
    : chalk.magenta(`Grp:${ctx.chat.title}`);

  const content =
    `${messageEmoji} ${chalk.cyan.bold(messageType)}\n` +
    `﹂By﹁: ${user}\n` +
    `﹂In﹁: ${chatType}`;

  console.log(asciiBox(`MSG ${getTimestamp()}`, content, chalk.cyan));
}

export async function notifyOwner(conn, ctx, error, command) {
  const owners = Array.isArray(global.owner?.id)
    ? global.owner.id
    : [global.owner?.id].filter(Boolean);
  
  let chatInfo = ctx.isGroup
    ? `*Grup:* ${ctx.chat.title} (\`${ctx.chatId}\`)`
    : `*Private Chat*`;

  const report = `
*Terjadi Error pada Bot!*

*User:* ${ctx.sender.first_name} (\`${ctx.sender.id}\`)
*Perintah:* \`/${command}\`
*Lokasi:* ${chatInfo}
*Waktu:* \`${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\`

---
*Pesan Error:*
\`\`\`
${error.message}
\`\`\`
---
*Stack Trace:*
\`\`\`
${error.stack}
\`\`\`
  `.trim();
  
  for (const ownerId of owners) {
    try {
      await conn.sendMessage(ownerId, report);
    } catch (e) {
      console.error(`Gagal mengirim laporan error ke owner ${ownerId}:`, e.message);
    }
  }
}
