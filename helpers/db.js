import fs from 'fs-extra';
import path from 'path';

const DB_PATH = path.resolve('./database.json');
let database = { users: {}, groups: {}, settings: {} };
const DEFAULT_LIMIT = 25;
let saveTimeout = null;

/**
 * Load database dari file ke memori.
 */
export function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            database = fs.readJsonSync(DB_PATH);
        }
        database.users ??= {};
        database.groups ??= {};
        database.settings ??= {};
    } catch (e) {
        console.error("Gagal memuat database:", e);
        database = { users: {}, groups: {}, settings: {} };
        saveDB();
    }
}

export function saveDB() {
    try {
        fs.writeJsonSync(DB_PATH, database, { spaces: 2 });
    } catch (e) {
        console.error("Gagal menyimpan database:", e);
    }
}

function saveDBDebounced(delay = 1000) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveDB, delay);
}

/**
 * Ambil atau buat data user.
 */
export function getUser(userId) {
    const id = String(userId);
    if (!database.users[id]) {
        database.users[id] = {
            id,
            limit: DEFAULT_LIMIT,
            premium: false,
            owner: false,
            createdAt: new Date().toISOString(),
            banned: false,
            afk: { time: -1, reason: '' },
            warnings: 0
        };
        saveDBDebounced();
    }
    return database.users[id];
}

/**
 * Ambil atau buat data group.
 */
export function getGroup(chatId) {
    const id = String(chatId);
    if (!database.groups[id]) {
        database.groups[id] = {
            id,
            banned: false,
            isWelcomeOn: false,
            welcome: 'Selamat datang @user di grup @group!',
            isGoodbyeOn: false,
            goodbye: 'Selamat tinggal @user!',
            antiLink: false
        };
        saveDBDebounced();
    }
    return database.groups[id];
}

/**
 * Ambil atau buat pengaturan bot.
 */
export function getSettings() {
    if (!database.settings) {
        database.settings = {
            maintenance: false,
            premiumMode: false
        };
        saveDBDebounced();
    }
    return database.settings;
}

/**
 * Update data user/group/settings.
 */
export function updateData(type, id, data) {
    let target;
    switch (type) {
        case 'user':
            target = getUser(id);
            break;
        case 'group':
            target = getGroup(id);
            break;
        case 'settings':
            target = getSettings();
            break;
        default:
            throw new Error('Tipe data tidak valid untuk pembaruan.');
    }
    Object.assign(target, data);
    saveDBDebounced();
}

/**
 * Kurangi limit user.
 */
export function useLimit(userId, amount = 1) {
    const user = getUser(userId);
    if (user.limit < amount) return false;
    user.limit -= amount;
    saveDBDebounced();
    return true;
}

/**
 * Ambil semua user.
 */
export function getAllUsers() {
    return Object.values(database.users);
}

/**
 * Ambil semua group.
 */
export function getAllGroups() {
    return Object.values(database.groups);
}

/**
 * Reset database.
 */
export function resetDatabase() {
    database = { users: {}, groups: {}, settings: {} };
    saveDB();
}
