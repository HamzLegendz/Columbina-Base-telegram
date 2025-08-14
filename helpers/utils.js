import fs from 'fs-extra';
import path from 'path';
import axios from 'axios';
import os from 'os';
import { URL } from 'url';

/**
 * Memeriksa apakah sebuah string adalah URL yang valid.
 * @param {string} string
 * @returns {boolean}
 */
export function isUrl(string) {
    if (typeof string !== 'string') return false;
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

/**
 * Memeriksa apakah sebuah string adalah path file yang ada di sistem.
 * @param {string} filePath
 * @returns {boolean}
 */
export function isFilePath(filePath) {
    if (typeof filePath !== 'string') return false;
    if (isUrl(filePath)) return false;
    return fs.existsSync(filePath);
}

/**
 * Mengunduh file dari URL dan mengembalikannya sebagai Buffer.
 * @param {string} url
 * @returns {Promise<Buffer>}
 * @throws {Error} Jika URL tidak valid atau gagal diunduh
 */
export async function downloadMedia(url) {
    if (!isUrl(url)) throw new Error(`URL tidak valid: ${url}`);
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            },
            maxRedirects: 5
        });
        return Buffer.from(response.data);
    } catch (error) {
        throw new Error(`Gagal mengunduh media: ${error.message}`);
    }
}

/**
 * Mengunduh media dari sebuah pesan Telegraf.
 * @param {import('telegraf').Context} ctx
 * @returns {Promise<Buffer|null>}
 */
export async function downloadFromMessage(ctx) {
    try {
        const message = ctx.quoted || ctx.message;
        if (!message) return null;

        const mediaTypes = ['photo', 'video', 'audio', 'document', 'sticker', 'voice', 'animation'];
        let fileId = null;

        for (const type of mediaTypes) {
            if (message[type]) {
                fileId = type === 'photo'
                    ? message[type][message[type].length - 1].file_id
                    : message[type].file_id;
                break;
            }
        }

        if (!fileId) return null;
        return await ctx.conn.downloadFile(fileId);
    } catch {
        return null;
    }
}

/**
 * Memastikan direktori sementara ada.
 */
export function ensureTmp() {
    fs.ensureDirSync(global.tmpDir || './temp');
}
export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
/**
 * Mendapatkan path lengkap untuk file sementara.
 * @param {string} filename
 * @returns {string}
 */
export function tmpPath(filename) {
    ensureTmp();
    return path.join(global.tmpDir || './temp', filename);
}

/**
 * Mengubah detik menjadi format waktu yang mudah dibaca.
 * @param {number} seconds
 * @returns {string}
 */
export function formatUptime(seconds) {
    const pad = (s) => (s < 10 ? '0' : '') + s;
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

/**
 * Mengubah byte menjadi format yang mudah dibaca.
 * @param {number} bytes
 * @param {number} [decimals=2]
 * @returns {string}
 */

/**
 * Membersihkan teks dari karakter spesial MarkdownV2.
 * @param {string} text
 * @returns {string}
 */
export function escapeMarkdownV2(text) {
    if (typeof text !== 'string') return '';
    return text.replace(/([_*\[\]()~`>#\+\-=|{}.!])/g, '\\$1');
}

/**
 * Mengubah string durasi menjadi detik.
 * @param {string} timeStr Contoh: "10m", "1.5h", "2d"
 * @returns {number}
 */
export function parseTimeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const match = String(timeStr).match(/^(\d+(\.\d+)?)(s|m|h|d)$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[3];

    switch (unit) {
        case 's': return value;
        case 'm': return value * 60;
        case 'h': return value * 3600;
        case 'd': return value * 86400;
        default: return 0;
    }
}

/**
 * Menghasilkan ID acak alfanumerik.
 * @param {number} [length=8]
 * @returns {string}
 */
export function getRandomId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

/**
 * Mendapatkan informasi sistem dasar.
 * @returns {Record<string, string>}
 */
export function systemInfo() {
    const cpus = os.cpus();
    const cpuModel = cpus.length ? `${cpus[0].model} (${cpus.length} cores)` : 'Unknown CPU';
    return {
        platform: os.platform(),
        release: os.release(),
        arch: os.arch(),
        cpu: cpuModel,
        totalMem: formatBytes(os.totalmem()),
        freeMem: formatBytes(os.freemem())
    };
}

/**
 * Menjeda eksekusi selama beberapa milidetik.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
