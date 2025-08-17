import { Markup } from 'telegraf';
import fs from 'fs';
import { isUrl, getRandomId } from './utils.js';
import { fileTypeFromBuffer } from 'file-type';
import axios from 'axios'
/**
 * Memformat array tombol kustom menjadi format inline_keyboard Telegraf yang valid.
 * Fleksibel untuk menerima 'displayText' atau 'text', dan 'buttonId' atau 'id'.
 * @param {Array<Array<Object>>} [buttons=[]] - Array 2D yang merepresentasikan baris dan tombol.
 * @returns {Array<Array<Object>>} Tombol dalam format yang dikenali oleh Telegraf.
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
 * Memproses berbagai jenis input file (URL, path, Buffer, file_id, dll.) 
 * dan mengubahnya menjadi format sumber yang standar untuk Telegraf.
 * @param {string|Buffer|fs.ReadStream|Object} file - Sumber file yang akan diproses.
 * @returns {Promise<string|Object>} Objek sumber terstandardisasi atau string file_id.
 * @throws {Error} Jika format input tidak dikenali.
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
 * Middleware untuk menempelkan helper cerdas ke objek konteks (ctx) Telegraf,
 * menyederhanakan logika di dalam plugin.
 * @param {import('telegraf').Telegraf} conn - Instance utama Telegraf.
 * @returns {Function} Middleware Telegraf.
 */
export function attachHelpersToContext(conn) {
    return (ctx, next) => {
        ctx.conn = conn;
        Object.defineProperties(ctx, {
            sender: { get: () => ctx.from, configurable: true },
            chatId: { get: () => ctx.chat?.id, configurable: true },
            messageId: { get: () => ctx.message?.id || ctx.update.callback_query?.message?.id, configurable: true },
            isGroup: { get: () => ['group', 'supergroup'].includes(ctx.chat?.type), configurable: true },
            quoted: { get: () => ctx.message?.reply_to_message, configurable: true },
            target: {
                get() { // Target cerdas: pengguna yang dibalas, atau pengirim jika tidak ada.
                    return this.quoted?.from || this.from;
                },
                configurable: true
            },
            isAdmin: {
                async get() { // Cek apakah PENGGUNA adalah admin
                    if (!this.isGroup) return false;
                    if (this._isAdmin !== undefined) return this._isAdmin; // Ambil dari cache jika sudah dicek
                    const admins = await conn.getChatAdministrators(this.chatId);
                    this._isAdmin = admins.some(admin => admin.user.id === this.sender.id);
                    return this._isAdmin;
                },
                configurable: true
            },
            isBotAdmin: {
                async get() { // Cek apakah BOT adalah admin
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
 * Membungkus instance Telegraf dengan metode-metode kustom dan wrapper penuh
 * untuk menciptakan 'Client' yang canggih.
 * @param {import('telegraf').Telegraf} conn - Instance utama Telegraf.
 * @returns {import('telegraf').Telegraf} Instance Telegraf yang telah disempurnakan.
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
     * @param {string|number} chatId ID Chat tujuan.
     * @param {string|Object} content Konten pesan (teks atau objek media).
     * @param {Object} [options={}] Opsi tambahan.
     */
    conn.sendMessage = async (chatId, content, options = {}) => {
        let extra = { parse_mode: 'Markdown', ...options };
        if (options.quoted) extra.reply_parameters = { message_id: options.quoted.id };
        delete extra.quoted;

        if (typeof content === 'string') {
            return tg.sendMessage(chatId, content, extra);
        }
        if (typeof content !== 'object' || content === null) throw new Error('Konten tidak valid.');

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
            if (content[type]) return await typeHandlers[type](content);
        }
        
        return tg.sendMessage(chatId, content.text || extra.caption || '', extra);
    };

    /** Alias untuk sendMessage, agar lebih intuitif saat mengirim file. */
    conn.sendFile = (chatId, file, options) => conn.sendMessage(chatId, { document: file, ...options });
    
    /**
     * Metode canggih untuk mengedit pesan. Bisa edit teks, caption, dan bahkan mengganti media.
     * @param {string|number} chatId ID chat.
     * @param {number} messageId ID pesan yang akan diedit.
     * @param {string|Object} newContent Konten baru.
     * @param {Object} [options={}] Opsi tambahan.
     */
    conn.editMessage = async (chatId, messageId, newContent, options = {}) => {
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
                return tg.editMessageMedia(chatId, messageId, undefined, media, extra);
            }
        } else {
            text = String(newContent);
        }

        const originalMessage = options.quoted;
        if (originalMessage && (originalMessage.photo || originalMessage.video || originalMessage.document || originalMessage.animation)) {
            return tg.editMessageCaption(chatId, messageId, undefined, text, extra);
        }
        return tg.editMessageText(chatId, messageId, undefined, text, extra);
    };

    /**
     * Metode untuk memberikan reaksi ke sebuah pesan.
     * @param {string|number} chatId ID chat.
     * @param {number} messageId ID pesan.
     * @param {string} emoji Emoji reaksi.
     */
    conn.kickChatMember = async (chatId, userId, options) => {
    await tg.banChatMember(chatId, userId, options);
    return tg.unbanChatMember(chatId, userId); // optional kalau mau unban biar bisa join lagi
};
    conn.unbanChatMember = (chatId, userId, options) => tg.unbanChatMember(chatId, userId, options);
    conn.getChatAdministrators = (chatId) => tg.getChatAdministrators(chatId);
    conn.react = (chatId, messageId, emoji) => {
        try {
            const reaction = [{ type: 'emoji', emoji: emoji }];
            return tg.setMessageReaction(chatId, messageId, reaction);
        } catch (e) {
            console.error(`Failed to react: ${e.message}`);
            return Promise.resolve();
        }
    };
        conn.deleteMessage = (chatId, messageId) => {
        return tg.deleteMessage(chatId, messageId);
    };
    conn.sendAlbum = async (chatId, mediaArray, options = {}) => {
        if (!Array.isArray(mediaArray) || mediaArray.length === 0) {
            throw new Error('mediaArray harus berupa array yang tidak kosong.');
        }

        const caption = options.caption || '';
        
        const formattedMedia = await Promise.all(mediaArray.map(async (mediaItem, index) => {
            const mediaUrl = typeof mediaItem === 'string' ? mediaItem : mediaItem.media;
            const itemCaption = typeof mediaItem === 'object' ? mediaItem.caption : undefined;

            // Deteksi tipe file secara otomatis dari ekstensi URL
            let type = 'photo'; // Defaultnya
            if (/\.(mp4|mov|mkv)$/i.test(mediaUrl)) type = 'video';

            return {
                type: type,
                media: await resolveFileSource(mediaUrl),
                // Terapkan caption utama hanya pada item pertama jika tidak ada caption per item
                caption: itemCaption || (index === 0 ? caption : ''),
                parse_mode: 'Markdown'
            };
        }));

        // Gunakan metode sendMessage kita yang sudah ada
        return conn.sendMessage(chatId, {
            mediaGroup: formattedMedia
        }, options);
    };
    /**
     * Mengunduh file dari Telegram dan mengembalikannya sebagai Buffer.
     * @param {string} fileId ID file Telegram.
     * @returns {Promise<Buffer>}
     */
    conn.downloadFile = async (fileId) => {
        const fileLink = await tg.getFileLink(fileId);
        const response = await axios({ url: fileLink.href, responseType: 'arraybuffer' });
        return Buffer.from(response.data);
    };
    
    conn.getChat = (chatId) => {
        return tg.getChat(chatId);
    };

    /**
     * Metode untuk mengirim status chat (typing, sending photo, dll).
     * @param {string|number} chatId ID Chat.
     * @param {string} [action='typing'] Aksi yang akan ditampilkan.
     */
    conn.sendPresence = (chatId, action = 'typing') => {
        return tg.sendChatAction(chatId, action);
    };

    return conn;
}
