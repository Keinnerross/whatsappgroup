const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const qrcode = require('qrcode-terminal');



//Server
const app = express();
const server = http.createServer(app);
const port = 3000;

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
        return chats.filter(chat => chat.id.server === 'g.us').map(group => ({
            name: group.name,
            id: group.id._serialized
        }));
    } catch (error) {
        console.error('Error al obtener los grupos:', error);
        return [];
    }
};

//Post
let selectedGroups = [
    "120363046353242256@g.us",
    "120363204191113377@g.us",
    "120363376835578475@g.us"];



const sendMessage = () => {

    const myMessage = "Hola, este mensaje viene de Node.JS";

    selectedGroups.map( async groupID => {
        const group = groups.find(chat => chat.id === groupID);
      
        if (group) {
            await client.sendMessage(group.id, myMessage);
            console.log('Mensaje enviado al grupo:', group.name);
        } else {
            console.log(`Grupo con nombre "${groupName}" Ocurrio un error al enviar el mensaje`);
        }

    });

}

//Conexiones:


//Eventos de WhatsApp
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Cliente WhatsApp Conectado');


    groups = await getGroups();
    console.log('Grupos obtenidos:', groups);

    io.emit('groups-updated', groups);
});


//Eventos de socket.io
io.on('connection', (socket) => {
    console.log('Cliente conectado a WebSocket');

    socket.emit('groups-updated', groups);


    socket.on('send-msj', () => {
        sendMessage();
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
