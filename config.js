// URL Thumbnail Global untuk Menu
global.thumb = 'https://cdn.ypnk.biz.id/yp/xzyy1549.jpg';
// url telegram owner nya
global.tme = 'https://t.me/skyvoidwalker';
// Token Bot dari @BotFather
// config.js
global.bottoken = process.env.BOT_TOKEN || '-';

// Nama Bot dll
global.botname = 'Columbina';
global.botVersion = '1.0.0';
global.botMode = 'public';
global.dfail = (type, m) => {
    const messages = {
        owner: '*Perintah Owner*\nFitur ini hanya dapat diakses oleh Owner Bot.',
        group: '*Khusus Grup*\nPerintah ini hanya dapat digunakan di dalam grup.',
        private: '*Khusus Private Chat*\nPerintah ini hanya dapat digunakan di private chat.',
        admin: '*Perintah Admin*\nFitur ini hanya dapat diakses oleh Admin Grup.',
        botAdmin: '*Bot Bukan Admin*\nJadikan bot sebagai admin untuk menggunakan perintah ini.',
        limit: '*Limit Habis*\nLimit harian Anda telah habis. Coba lagi besok.',
    };
    const message = messages[type];
    if (message) {
        m.reply(message);
    }
};

// Prefix Perintah
global.prefix = '/';

// Informasi Owner
global.owner = {
    name: 'SkyWalker',
    // nama dan ID Telegram owner
    id: 6861815787 
};
