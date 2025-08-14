import fs from 'fs-extra';
import path from 'path';

const OWNER_FILE_PATH = path.resolve('./owner.json');


const handler = async (m, { conn, command, text, target }) => {
    const owners = fs.readJsonSync(OWNER_FILE_PATH).owners || [];

    switch (command) {
        case 'addowner': {
            if (!target) return m.reply('Balas pesan pengguna atau masukkan ID/username yang ingin dijadikan owner.');
            const targetId = target.id;

            if (owners.includes(targetId)) {
                return m.reply(`Pengguna dengan ID \`${targetId}\` sudah menjadi owner.`);
            }

            owners.push(targetId);
            fs.writeJsonSync(OWNER_FILE_PATH, { owners }, { spaces: 2 });
            
            await m.reply(`✅ Berhasil menambahkan \`${targetId}\` sebagai owner.\n\n*Penting:* Harap restart bot (\`/restart\`) untuk menerapkan perubahan hak akses sepenuhnya.`);
            break;
        }

        case 'delowner': {
            if (!target) return m.reply('Balas pesan pengguna atau masukkan ID/username yang ingin dihapus dari daftar owner.');
            const targetId = target.id;

            if (targetId === global.owner.id) {
                return m.reply('Anda tidak bisa menghapus owner utama yang ada di `config.js`.');
            }
            if (targetId === m.sender.id) {
                return m.reply('Anda tidak bisa menghapus diri sendiri.');
            }

            const index = owners.indexOf(targetId);
            if (index === -1) {
                return m.reply(`Pengguna dengan ID \`${targetId}\` tidak ditemukan di daftar owner.`);
            }

            owners.splice(index, 1);
            fs.writeJsonSync(OWNER_FILE_PATH, { owners }, { spaces: 2 });

            await m.reply(`🗑️ Berhasil menghapus \`${targetId}\` dari daftar owner.\n\n*Penting:* Harap restart bot (\`/restart\`) untuk menerapkan perubahan hak akses.`);
            break;
        }

        case 'listowners': {
            if (owners.length === 0) return m.reply('Tidak ada owner yang terdaftar di `owner.json`.');
            
            let responseText = '*Daftar Owner Bot*\n\n';
            for (const ownerId of owners) {
                try {
                    
                    const user = await conn.getChat(ownerId);
                    const isPrimary = ownerId === global.owner.id ? ' (Owner Utama)' : '';
                    responseText += `- *${user.first_name}* (\`${ownerId}\`)${isPrimary}\n`;
                } catch {
                    responseText += `- \`${ownerId}\` (Tidak dapat mengambil nama)\n`;
                }
            }
            await m.reply(responseText.trim());
            break;
        }
    }
};

handler.command = /^(addowner|delowner|listowners)$/i;
handler.help = ['addowner', 'delowner', 'listowners'];
handler.tags = ['owner'];
handler.owner = true;

export default handler;
