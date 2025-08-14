const handler = async (m) => {
    await m.reply('✅ Merestart bot...');
    setTimeout(() => { process.exit(0); }, 2000);
};
handler.command = /^restart$/i;
handler.help = ['restart'];
handler.tags = ['owner'];
handler.owner = true;
export default handler;
