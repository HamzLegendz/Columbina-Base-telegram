import { Markup } from 'telegraf';
import fs from 'fs';
import { isUrl, getRandomId } from './utils.js';
import { fileTypeFromBuffer } from 'file-type';
import axios from 'axios'

//  function untuk ngubah message_id jadi id
function transformMessage(msg) {
    if (msg && msg.message_id && !msg.id) {
        msg.id = msg.message_id;
    }
    return msg;
}

/**
 * Memformat array tombol kustom menjadi format inline_keyboard Telegraf yang valid.
 */
function formatButtons(buttons = []) {
    return buttons.map(row =>
        row.map(button => {
            const text = button.displayText || button.text || 'Tombol';
            if (button.url) return Markup.button.url(text, button.url);
            if (button.webApp) return Markup.button.webApp(text, button.webApp.url);
            return Markup.button.callback(text, button.buttonId || button.id || `btn_${getRandomId(8)}`);
        })
    );
}

/**
 * Memproses berbagai jenis input file
 */
async function resolveFileSource(file) {
    if (!file) throw new Error('Sumber file tidak boleh kosong.');
    if (Buffer.isBuffer(file)) return { source: file };
    if (file instanceof fs.ReadStream) return { source: file };
    if (typeof file === 'object' && (file.url || file.source)) return file;
    if (typeof file === 'string') {
        if (file.startsWith('data:')) {
            const base64Data = file.split(';base64,').pop();
            return { source: Buffer.from(base64Data, 'base64') };
        }
        if (isUrl(file)) return { url: file };
        if (fs.existsSync(file)) return { source: fs.createReadStream(file) };
        return file; // Asumsikan sebagai file_id 
    }
    throw new Error(`Jenis file tidak didukung: ${typeof file}`);
}

/**
 * Middleware untuk menempelkan helper cerdas ke objek konteks (ctx) Telegraf
 */
export function attachHelpersToContext(conn) {
    return (ctx, next) => {
        ctx.conn = conn;
        
        // TRANSFORM SEMUA MESSAGE OBJECTS KE FORMAT ID
        if (ctx.message) transformMessage(ctx.message);
        if (ctx.update.callback_query?.message) transformMessage(ctx.update.callback_query.message);
        if (ctx.message?.reply_to_message) transformMessage(ctx.message.reply_to_message);

        Object.defineProperties(ctx, {
            sender: { get: () => ctx.from, configurable: true },
            chatId: { get: () => ctx.chat?.id, configurable: true },
            messageId: { get: () => ctx.message?.id || ctx.update.callback_query?.message?.id, configurable: true },
            isGroup: { get: () => ['group', 'supergroup'].includes(ctx.chat?.type), configurable: true },
            quoted: { get: () => ctx.message?.reply_to_message, configurable: true },
            target: {
                get() {
                    return this.quoted?.from || this.from;
                },
                configurable: true
            },
            isAdmin: {
                async get() {
                    if (!this.isGroup) return false;
                    if (this._isAdmin !== undefined) return this._isAdmin;
                    const admins = await conn.getChatAdministrators(this.chatId);
                    this._isAdmin = admins.some(admin => admin.user.id === this.sender.id);
                    return this._isAdmin;
                },
                configurable: true
            },
            isBotAdmin: {
                async get() {
                    if (!this.isGroup) return false;
                    if (this._isBotAdmin !== undefined) return this._isBotAdmin;
                    const admins = await conn.getChatAdministrators(this.chatId);
                    this._isBotAdmin = admins.some(admin => admin.user.id === ctx.botInfo.id);
                    return this._isBotAdmin;
                },
                configurable: true
            }
        });

        ctx.reply = (content, options) => conn.sendMessage(ctx.chatId, content, { ...options, quoted: ctx.message || ctx.update.callback_query?.message });
        ctx.edit = (content, options) => conn.editMessage(ctx.chatId, ctx.messageId, content, { ...options, quoted: ctx.message || ctx.update.callback_query?.message });
        ctx.react = (emoji) => conn.react(ctx.chatId, ctx.messageId, emoji);
        ctx.deleteMessage = (messageId) => conn.deleteMessage(ctx.chatId, messageId || ctx.messageId);
        ctx.sendFile = (file, options) => conn.sendFile(ctx.chatId, file, options);

        return next();
    };
}

/**
 * Membungkus instance Telegraf dengan metode-metode kustom
 */
export function createClient(conn) {
    const tg = conn.telegram;

    for (const methodName of Object.keys(Object.getPrototypeOf(tg))) {
        if (typeof tg[methodName] === 'function' && !conn[methodName]) {
            conn[methodName] = (...args) => tg[methodName](...args);
        }
    }

    /**
     * Metode pengiriman pesan
     */
    conn.sendMessage = async (chatId, content, options = {}) => {
        let extra = { parse_mode: 'Markdown', ...options };
        
        // PERBAIKAN: Gunakan message_id untuk Telegram API, tapi fallback ke id
        if (options.quoted) {
            const messageId = options.quoted.message_id || options.quoted.id;
            extra.reply_parameters = { message_id: messageId };
        }
        delete extra.quoted;

        let result;
        
        if (typeof content === 'string') {
            result = await tg.sendMessage(chatId, content, extra);
        } else if (typeof content === 'object' && content !== null) {
            extra.caption = content.caption || content.text || '';
            if (content.buttons) extra.reply_markup = { inline_keyboard: formatButtons(content.buttons) };
            else if (content.keyboard) extra.reply_markup = Markup.keyboard(content.keyboard).resize().oneTime();
            else if (content.force_reply) extra.reply_markup = Markup.forceReply();

            const typeHandlers = {
                photo: async (c) => tg.sendPhoto(chatId, await resolveFileSource(c.photo), extra),
                image: async (c) => tg.sendPhoto(chatId, await resolveFileSource(c.image), extra),
                video: async (c) => tg.sendVideo(chatId, await resolveFileSource(c.video), extra),
                audio: async (c) => tg.sendAudio(chatId, await resolveFileSource(c.audio), extra),
                voice: async (c) => tg.sendVoice(chatId, await resolveFileSource(c.voice), extra),
                document: async (c) => {
                    const source = await resolveFileSource(c.document);
                    if (source.source instanceof Buffer && !c.mimetype) {
                        const type = await fileTypeFromBuffer(source.source);
                        extra.mime_type = type?.mime;
                    }
                    return tg.sendDocument(chatId, source, { ...extra, file_name: c.fileName });
                },
                sticker: async (c) => tg.sendSticker(chatId, await resolveFileSource(c.sticker), extra),
                animation: async (c) => tg.sendAnimation(chatId, await resolveFileSource(c.animation), extra),
                location: (c) => tg.sendLocation(chatId, c.location.latitude, c.location.longitude, extra),
                contact: (c) => tg.sendContact(chatId, c.contact.phone_number, c.contact.first_name, extra),
                poll: (c) => tg.sendPoll(chatId, c.poll.question, c.poll.options, extra),
                dice: (c) => tg.sendDice(chatId, { emoji: c.dice, ...extra }),
                venue: (c) => tg.sendVenue(chatId, c.venue.latitude, c.venue.longitude, c.venue.title, c.venue.address, extra),
                mediaGroup: async (c) => tg.sendMediaGroup(chatId, await Promise.all(c.mediaGroup.map(async item => ({...item, media: await resolveFileSource(item.media)})))),
            };

            for (const type in typeHandlers) {
                if (content[type]) {
                    result = await typeHandlers[type](content);
                    break;
                }
            }
            
            if (!result) {
                result = await tg.sendMessage(chatId, content.text || extra.caption || '', extra);
            }
        } else {
            throw new Error('Konten tidak valid.');
        }
        
        // TRANSFORM RESULT: Tambahkan id dari message_id
        return transformMessage(result);
    };

    conn.sendFile = (chatId, file, options) => conn.sendMessage(chatId, { document: file, ...options });

    /**
     * Metode untuk mengedit pesan
     */
    conn.editMessage = async (chatId, messageId, newContent, options = {}) => {
        // PERBAIKAN: Pastikan messageId adalah message_id yang valid
        const actualMessageId = typeof messageId === 'object' ? messageId.message_id || messageId.id : messageId;
        
        let text = '';
        let extra = { parse_mode: 'Markdown', ...options };
        
        if (typeof newContent === 'object' && newContent !== null) {
            text = newContent.caption || newContent.text || '';
            if (newContent.buttons) extra.reply_markup = { inline_keyboard: formatButtons(newContent.buttons) };

            const mediaTypeKey = ['photo', 'image', 'video', 'document', 'audio', 'animation'].find(type => newContent[type]);
            if (mediaTypeKey) {
                const mediaSource = await resolveFileSource(newContent[mediaTypeKey]);
                const media = {
                    type: mediaTypeKey === 'image' ? 'photo' : mediaTypeKey,
                    media: mediaSource.url || mediaSource.source || mediaSource,
                    caption: text,
                    parse_mode: 'Markdown'
                };
                return tg.editMessageMedia(chatId, actualMessageId, undefined, media, extra);
            }
        } else {
            text = String(newContent);
        }

        const originalMessage = options.quoted;
        if (originalMessage && (originalMessage.photo || originalMessage.video || originalMessage.document || originalMessage.animation)) {
            return tg.editMessageCaption(chatId, actualMessageId, undefined, text, extra);
        }
        return tg.editMessageText(chatId, actualMessageId, undefined, text, extra);
    };

    conn.kickChatMember = async (chatId, userId, options) => {
        await tg.banChatMember(chatId, userId, options);
        return tg.unbanChatMember(chatId, userId);
    };
    
    conn.unbanChatMember = (chatId, userId, options) => tg.unbanChatMember(chatId, userId, options);
    conn.getChatAdministrators = (chatId) => tg.getChatAdministrators(chatId);
    
    conn.react = (chatId, messageId, emoji) => {
        try {
            const actualMessageId = typeof messageId === 'object' ? messageId.message_id || messageId.id : messageId;
            const reaction = [{ type: 'emoji', emoji: emoji }];
            return tg.setMessageReaction(chatId, actualMessageId, reaction);
        } catch (e) {
            console.error(`Failed to react: ${e.message}`);
            return Promise.resolve();
        }
    };
    
    conn.deleteMessage = (chatId, messageId) => {
        const actualMessageId = typeof messageId === 'object' ? messageId.message_id || messageId.id : messageId;
        return tg.deleteMessage(chatId, actualMessageId);
    };

    conn.sendAlbum = async (chatId, mediaArray, options = {}) => {
        if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
            throw new Error('mediaArray harus berupa array yang tidak kosong.');
        }

        const caption = options.caption || '';

        const formattedMedia = await Promise.all(mediaArray.map(async (mediaItem, index) => {
            const mediaUrl = typeof mediaItem === 'string' ? mediaItem : mediaItem.media;
            const itemCaption = typeof mediaItem === 'object' ? mediaItem.caption : undefined;

            let type = 'photo';
            if (/\.(mp4|mov|mkv)$/i.test(mediaUrl)) type = 'video';

            return {
                type: type,
                media: await resolveFileSource(mediaUrl),
                caption: itemCaption || (index === 0 ? caption : ''),
                parse_mode: 'Markdown'
            };
        }));

        return conn.sendMessage(chatId, { mediaGroup: formattedMedia }, options);
    };

    conn.downloadFile = async (fileId) => {
        const fileLink = await tg.getFileLink(fileId);
        const response = await axios({ url: fileLink.href, responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    };

    conn.getChat = (chatId) => tg.getChat(chatId);

    conn.sendPresence = (chatId, action = 'typing') => {
        return tg.sendChatAction(chatId, action);
    };

    return conn;
}
