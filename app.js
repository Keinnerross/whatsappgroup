const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const qrcode = require('qrcode-terminal');



//Server
const app = express();
const server = http.createServer(app);
const port = 3000;

// ✅ Sirve la carpeta 'public' correctamente
app.use(express.static('public'));

// Motor de plantillas
app.set('view engine', 'ejs');


// Socket.io
const io = socketIo(server);


// Rutas
app.get('/', (req, res) => res.render('index'));


// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
});


//Funciones (Controllers)

//get
let groups = [];
const getGroups = async () => {
    const chats = await client.getChats();
    try {
        const mygroups = chats.filter(chat => chat.id.server === 'g.us')

        const formatedGroups = await Promise.all(
            mygroups.map(async (group) => {
                try {
                    const chat = await client.getChatById(group.id._serialized); // Obtener el chat
                    if (chat.isReadOnly == false) {
                        const contact = await chat.getContact(); // Obtener el contacto
                        const profilePicUrl = await contact.getProfilePicUrl(); // Obtener la foto de perfil

                        return {
                            name: group.name,
                            id: group.id._serialized,
                            profilePicUrl: profilePicUrl
                        };
                    }
                } catch (error) {
                    console.error(`Error procesando el grupo ${group.id._serialized}:`, error);
                    return null; // Devuelve null en caso de error
                }
            })
        );

        // Filtra los elementos que no son null o undefined
        const filteredGroups = formatedGroups.filter(group => group != null);

        return filteredGroups;






    } catch (error) {
        console.error('Error al obtener los grupos:', error);
        return [];
    }
};

//Post




const sendMessage = (message) => {

    const myMessage = message.body;
    const recipients = message.recipients;

    recipients.map(async groupID => {
        const group = groups.find(chat => chat.id === groupID);

        if (group) {
            await client.sendMessage(group.id, myMessage);
            console.log('Mensaje enviado al grupo:', group.name);
        } else {
            console.log(`Grupo con nombre "${groupName}" Ocurrio un error al enviar el mensaje`);
        }

    });

}


//programing

//delete

//handlemsj





















//Conexiones:


//Eventos de WhatsApp
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Cliente WhatsApp Conectado');


    groups = await getGroups();
    // console.log('Grupos obtenidos:', groups);

    io.emit('groups-updated', groups);
});


//Eventos de socket.io
io.on('connection', (socket) => {
    console.log('Cliente conectado a WebSocket');

    socket.emit('groups-updated', groups);


    socket.on('send-msj', (myMessage) => {
        sendMessage(myMessage);
    });




    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});





// Inicializar el cliente de WhatsApp
client.initialize();

// Iniciar el servidor
server.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});
