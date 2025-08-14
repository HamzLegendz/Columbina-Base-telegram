import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { logCommand, logError, logEvent, logMessage, notifyOwner } from './helpers/logger.js';
import * as DB from './helpers/db.js';
import { attachHelpersToContext } from './helpers/client.js';
import * as utils from './helpers/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let owners = [];
try {
    const ownerData = fs.readJsonSync(path.resolve(__dirname, './owner.json'));
    owners = Array.isArray(ownerData.owners)
        ? ownerData.owners
        : [ownerData.owners || global.owner?.id].filter(Boolean);
} catch {
    owners = [global.owner?.id].filter(Boolean);
}
/**
 * Helper untuk mencatat statistik penggunaan perintah.
 */
function updateStatistic(command, type) {
    if (!global.statistic[command]) {
        global.statistic[command] = { success: 0, error: 0, total: 0 };
    }
    global.statistic[command][type]++;
    global.statistic[command].total++;
}

/**
 * Menangani event saat anggota baru masuk grup.
 */
async function handleNewMember(ctx) {
    const groupSettings = DB.getGroup(ctx.chatId);
    if (groupSettings?.isWelcomeOn && groupSettings.welcome) {
        const groupName = ctx.chat.title;
        for (const member of ctx.message.new_chat_members) {
            logEvent(ctx, `User '${member.first_name}' joined`);
            const welcomeText = groupSettings.welcome
                .replace(/@user/g, `*${member.first_name}*`)
                .replace(/@group/g, `*${groupName}*`);
            await ctx.conn.sendMessage(ctx.chatId, welcomeText);
        }
    } else {
        logEvent(ctx, 'A new member joined.');
    }
}

/**
 * Menangani event saat anggota keluar dari grup.
 */
async function handleLeftMember(ctx) {
    const groupSettings = DB.getGroup(ctx.chatId);
    const member = ctx.message.left_chat_member;
    logEvent(ctx, `User '${member.first_name}' left`);
    if (groupSettings?.isGoodbyeOn && groupSettings.goodbye) {
        const groupName = ctx.chat.title;
        const goodbyeText = groupSettings.goodbye
            .replace(/@user/g, `*${member.first_name}*`)
            .replace(/@group/g, `*${groupName}*`);
        await ctx.conn.sendMessage(ctx.chatId, goodbyeText);
    }
}

/**
 * Helper kecil untuk format waktu AFK.
 */
function formatAfkTime(ms) {
    let s = Math.floor(ms / 1000);
    let m = Math.floor(s / 60);
    let h = Math.floor(m / 60);
    s %= 60;
    m %= 60;
    return `${h > 0 ? `${h} jam, ` : ''}${m > 0 ? `${m} menit, ` : ''}${s} detik`;
}

/**
 * Mendaftarkan semua middleware dan handler utama.
 */
export function registerHandler(conn, plugins) {
    conn.use(attachHelpersToContext(conn));

    // Middleware untuk mode bot & pemeliharaan
    conn.use(async (ctx, next) => {
        const isOwner = owners.includes(ctx.sender?.id);
        const settings = DB.getSettings();
        if (settings.maintenance && !isOwner) {
            return ctx.reply('🤖 Bot sedang dalam mode pemeliharaan. Coba lagi nanti.');
        }
        if (isOwner) return next();
        const mode = global.botMode;
        if (mode === 'ownerOnly') return;
        if (mode === 'privateOnly' && ctx.isGroup) return;
        if (mode === 'groupOnly' && !ctx.isGroup) return;
        return next();
    });

    // Event handler grup
    conn.on('new_chat_members', handleNewMember);
    conn.on('left_chat_member', handleLeftMember);
    conn.on('edited_message', (ctx) => logEvent(ctx, 'Message edited'));

    // Middleware utama pesan & perintah
    conn.use(async (ctx, next) => {
        try {
            const message = ctx.message || ctx.update.callback_query?.message;
            if (!message) return next();
            
            const user = DB.getUser(ctx.sender?.id);
            const isOwner = owners.includes(ctx.sender?.id);

            // Sistem AFK
            if (user?.afk?.time !== -1 && !ctx.update.callback_query) {
                await ctx.reply(`Anda telah kembali dari mode AFK setelah ${formatAfkTime(Date.now() - user.afk.time)}.`);
                DB.updateData('user', ctx.sender.id, { afk: { time: -1, reason: '' } });
            }
            if (ctx.message?.entities) {
                for (const entity of ctx.message.entities) {
                    if (entity.type === 'text_mention') {
                        const mentionedUser = DB.getUser(entity.user.id);
                        if (mentionedUser?.afk?.time !== -1) {
                            await ctx.reply(`Pengguna *${entity.user.first_name}* sedang AFK.\nAlasan: _${mentionedUser.afk.reason}_`);
                        }
                    }
                }
            }

            const text = ctx.message?.text || ctx.message?.caption || ctx.update.callback_query?.data || '';
            let matchedPlugin = null, command = null, args = [], textContent = '';

            for (const plugin of plugins) {
                if (plugin.customPrefix && plugin.customPrefix.test(text)) {
                    matchedPlugin = plugin;
                    const match = text.match(plugin.customPrefix);
                    command = match[0].trim();
                    textContent = text.slice(match[0].length).trim();
                    args = textContent.split(/ +/);
                    break;
                }
                if (text.startsWith(global.prefix)) {
                    const tempArgs = text.slice(global.prefix.length).trim().split(/ +/);
                    let tempCommand = tempArgs.shift().toLowerCase().split('@')[0];
                    if (plugin.command && plugin.command.test(tempCommand)) {
                        matchedPlugin = plugin;
                        command = tempCommand;
                        args = tempArgs;
                        textContent = args.join(' ');
                        break;
                    }
                }
            }

            // Anti-Link
            const isAdmin = isOwner || (await ctx.isAdmin);
            if (ctx.isGroup && !isAdmin && !matchedPlugin) {
                const groupData = DB.getGroup(ctx.chatId);
                if (groupData?.antiLink && /https?:\/\/[^\s/$.?#].[^\s]*/i.test(text)) {
                    await ctx.deleteMessage();
                    const warningMsg = await ctx.reply(`@${ctx.sender.username || ctx.sender.first_name}, dilarang mengirim link di grup ini!`);
                    setTimeout(() => conn.deleteMessage(ctx.chatId, warningMsg.message_id), 7000);
                    return;
                }
            }

            // Jalankan plugin
            if (matchedPlugin) {
                if (ctx.update.callback_query) await ctx.answerCbQuery().catch(logError);
                if (user?.banned && !isOwner) return;

                const limitToUse = (typeof matchedPlugin.limit === 'number') ? matchedPlugin.limit : (matchedPlugin.limit ? 1 : 0);
                
                if (!isOwner) {
                    if (user.limit < limitToUse) return ctx.reply(`⚠️ Limit Anda tidak cukup.\nAnda memerlukan *${limitToUse}* limit, sisa *${user.limit}* limit.`);
                    if (matchedPlugin.owner) return global.dfail('owner', ctx);
                    if (matchedPlugin.group && !ctx.isGroup) return global.dfail('group', ctx);
                    if (matchedPlugin.private && ctx.isGroup) return global.dfail('private', ctx);
                    if (matchedPlugin.admin && !isAdmin) return global.dfail('admin', ctx);
                    if (matchedPlugin.botAdmin && !(await ctx.isBotAdmin)) return global.dfail('botAdmin', ctx);
                }

                const groupMetadata = ctx.isGroup ? await conn.getChat(ctx.chatId) : null;
                logCommand(ctx, true, command);
                await conn.sendPresence(ctx.chatId, 'typing');

                try {
                    await matchedPlugin(ctx, { conn: ctx.conn, command, text: textContent, args, isOwner, user, plugins, groupMetadata, session: ctx.session, ...utils });
                    updateStatistic(command, 'success');
                    if (limitToUse > 0 && !isOwner) {
                        DB.useLimit(ctx.sender.id, limitToUse);
                        const updatedUser = DB.getUser(ctx.sender.id);
                        await ctx.reply(`✅ -${limitToUse} Limit digunakan.\nSisa limit Anda: *${updatedUser.limit}*`);
                    }
                } catch (e) {
                    updateStatistic(command, 'error');
                    logError(e.stack);
                    await notifyOwner(conn, ctx, e, command);
                    ctx.reply('Maaf, fitur ini sedang mengalami kesalahan. Laporan telah dikirim ke Owner untuk segera diperbaiki.');
                }
                return;
            }
            
            if (ctx.message) logMessage(ctx);

        } catch (e) {
            logError(e.stack);
            ctx.reply(`Terjadi kesalahan fatal pada sistem.`).catch(logError);
        }
        return next();
    });
}