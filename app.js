const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
});

client.on('ready', async () => {


    const chats = await client.getChats();

    try {
        const groups = chats.filter(chat => chat.id.server === 'g.us');
        console.log('Lista de grupos disponibles:');
        groups.forEach(group => {
            console.log(`- ${group.name} (ID: ${group.id._serialized})`);
        });

    } catch (error) {
        console.log('Error al obtener los grupos');
        console.error(error);
    }
});

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});



client.initialize();
