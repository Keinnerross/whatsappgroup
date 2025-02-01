const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
});

// Generar QR para iniciar sesión
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Cliente listo para enviar mensajes!');

    try {
        // Obtener todos los chats
        const chats = await client.getChats();

        // Filtrar solo los grupos basándonos en el servidor del ID
        const groups = chats.filter(chat => chat.id.server === 'g.us');

        // Mostrar los nombres de los grupos en consola
        console.log('Lista de grupos disponibles:');
        groups.forEach(group => {
            console.log(`- ${group.name} (ID: ${group.id._serialized})`);
        });

        const groupName = 'DarkWolf Team🐺'; 
        const group = groups.find(chat => chat.name === groupName);

        if (group) {
            await client.sendMessage(group.id._serialized, 'Test de Link: https://keinnerross.github.io/portfolioross/');
            console.log('Mensaje enviado al grupo:', group.name);
        } else {
            console.log(`Grupo con nombre "${groupName}" no encontrado.`);
        }
    } catch (error) {
        console.error('Error al enviar mensaje:', error);
    }
});

client.on('message', message => {
    console.log(`Mensaje recibido: ${message.body}`);
});

client.initialize();
