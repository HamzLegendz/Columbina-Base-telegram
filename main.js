import { Telegraf, session } from 'telegraf';
import LocalSession from 'telegraf-session-local';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as acorn from 'acorn';
import './config.js';
import { createClient } from './helpers/client.js';
import { registerHandler } from './handler.js';
import { logInfo, logError, logSuccess } from './helpers/logger.js';
import * as DB from './helpers/db.js';

// __dirname & __filename versi ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const plugins = [];

// Statistik perintah
global.statistic = {};
let today = new Date().getDate();
setInterval(() => {
    const newDate = new Date().getDate();
    if (newDate !== today) {
        logInfo('Resetting command statistics for the new day...');
        global.statistic = {};
        today = newDate;
    }
}, 60 * 1000);

setInterval(() => {
    DB.saveDB();
}, 2 * 60 * 1000); // setiap 2 menit

/**
 * Memuat atau memuat ulang semua plugin dari direktori /plugins.
 * Sekarang dengan validasi syntax menggunakan acorn sebelum import.
 */
async function loadPlugins() {
    plugins.length = 0;
    const pluginsDir = path.resolve(__dirname, 'plugins');

    const readDirRecursive = async (dir) => {
        const dirents = await fs.readdir(dir, { withFileTypes: true });
        for (const dirent of dirents) {
            const fullPath = path.join(dir, dirent.name);

            if (dirent.isDirectory()) {
                await readDirRecursive(fullPath);
                continue;
            }

            if (dirent.name.endsWith('.js')) {
                try {
                    // Validasi syntax dengan acorn
                    const code = await fs.readFile(fullPath, 'utf8');
                    acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });


                    const filePathUrl = pathToFileURL(fullPath).href + `?t=${Date.now()}`;
                    const mod = await import(filePathUrl);

                    if (typeof mod.default === 'function' && mod.default.command) {
                        plugins.push(mod.default);
                    }
                } catch (err) {
                    logError(`Plugin load error in ${dirent.name}: ${err.message}`);
                }
            }
        }
    };

    await readDirRecursive(pluginsDir);
    logInfo(`Successfully loaded ${plugins.length} plugins.`);
}

async function shutdown(bot, signal) {
    logInfo(`Menerima ${signal}. Mematikan bot secara normal...`);
    DB.saveDB();
    bot.stop(signal);
    process.exit(0);
}

async function main() {
    try {
        DB.loadDB();
        await loadPlugins();
        
        let conn = new Telegraf(global.bottoken);
        const sessionDb = new LocalSession({ database: 'sessions.json' });
        conn.use(sessionDb.middleware());
       
        conn.plugins = plugins;
        conn.loadPlugins = loadPlugins;

        conn = createClient(conn);
        registerHandler(conn, plugins);

        conn.catch((err, ctx) => {
            logError(`Telegraf error: ${err.stack}`);
            if (ctx) ctx.reply(`Terjadi error internal.`).catch(e => logError(e));
        });

        await conn.launch({ dropPendingUpdates: true });
        logSuccess(`${global.botname} is now online!`);
        
        process.once('SIGINT', () => shutdown(conn, 'SIGINT'));
        process.once('SIGTERM', () => shutdown(conn, 'SIGTERM'));
    } catch (err) {
        logError(`Fatal error during startup: ${err.stack}`);
        process.exit(1);
    }
}

main();