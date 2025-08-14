const handler = async (m, { text }) => {
    const modes = ['public', 'groupOnly', 'privateOnly', 'ownerOnly'];
    const mode = text.trim().toLowerCase();
    
    if (!mode) {
        return m.reply(`Mode saat ini: *${global.botMode.toUpperCase()}*.\n\nMode yang tersedia: \`${modes.join('`, `')}\`\nContoh: \`${global.prefix}botmode groupOnly\``);
    }
    
    if (!modes.includes(mode)) {
        return m.reply(`Mode tidak valid. Mode yang tersedia: \`${modes.join('`, `')}\``);
    }

    global.botMode = mode;
    await m.reply(`Mode bot berhasil diubah menjadi *${mode.toUpperCase()}*`);
};

handler.command = /^botmode$/i;
handler.help = ['botmode <mode>'];
handler.tags = ['owner'];
handler.owner = true;

export default handler;
