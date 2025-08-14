const handler = async (m, { conn, text, args }) => {
    let targets = new Set();
    let reason = [];

    if (m.quoted) {
        targets.add(m.quoted.from.id);
    }
    
    if (m.message.entities) {
        const mentions = m.message.entities.filter(e => e.type === 'text_mention' || e.type === 'mention');
        for (const entity of mentions) {
            if (entity.type === 'text_mention') {
                targets.add(entity.user.id);
            }
        }
    }

    for (const arg of args) {
        if (/^\d+$/.test(arg)) {
            targets.add(parseInt(arg));
        } else if (arg.startsWith('@')) {
        } else {
            reason.push(arg);
        }
    }
    
    if (targets.size === 0) {
        return m.reply('Target tidak ditemukan. Balas pesan, mention, atau berikan User ID pengguna yang ingin dikeluarkan.');
    }const members = await conn.getChatAdministrators(m.chatId);
    const adminIds = new Set(members.map(admin => admin.user.id));
    const groupOwner = members.find(admin => admin.status === 'creator');
    
    const successList = [];
    const failList = [];

    await m.reply(`Memproses pengeluaran *${targets.size}* target...`);

    for (const targetId of targets) {
        if (targetId === m.sender.id) {
            failList.push({ id: targetId, reason: 'Tidak bisa mengeluarkan diri sendiri' });
            continue;
        }
        if (targetId === m.botInfo.id) {
            failList.push({ id: targetId, reason: 'Tidak bisa mengeluarkan bot' });
            continue;
        }
        if (targetId === groupOwner?.user.id) {
            failList.push({ id: targetId, reason: 'Tidak bisa mengeluarkan pemilik grup' });
            continue;
        }
        if (adminIds.has(targetId)) {
            failList.push({ id: targetId, reason: 'Tidak bisa mengeluarkan sesama admin' });
            continue;
        }

        try {
            await conn.kickChatMember(m.chatId, targetId);
            successList.push(targetId);
        } catch (e) {
            failList.push({ id: targetId, reason: e.message });
        }
    }

    let report = `*Laporan Eksekusi Kick*\n\n`;
    if (successList.length > 0) {
        report += `*Berhasil Dikeluarkan (${successList.length}):*\n`;
        successList.forEach(id => report += `- \`${id}\`\n`);
    }
    if (failList.length > 0) {report += `\n*Gagal Dikeluarkan (${failList.length}):*\n`;
        failList.forEach(item => report += `- \`${item.id}\` (Alasan: ${item.reason})\n`);
    }
    if (reason.length > 0) {
        report += `\n*Alasan Umum:* ${reason.join(' ')}`;
    }

    await m.reply(report.trim());
};

handler.command = /^(kick|tendang)$/i;
handler.help = ['kick <@user|user_id>'];
handler.tags = ['group'];
handler.group = true;
handler.admin = true;
handler.botAdmin = true;

export default handler;
