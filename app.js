const { Client, LocalAuth, NoAuth, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const QRCode = require('qrcode');
const cors = require('cors');


//Server
const app = express();
app.use(cors());

app.use(express.json({ limit: '10mb' }));  // Configura el límite a 10 MB
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const server = http.createServer(app);
const port = 3000;

// ✅ Sirve la carpeta 'public' correctamente
app.use(express.static('public'));

// Motor de plantillas
app.set('view engine', 'ejs');


// Socket.io
const io = socketIo(server, {
    maxHttpBufferSize: 30 * 1024 * 1024 // 30 MB, ajusta según necesites
});


// Rutas
app.get('/', (req, res) => {
    res.render('index'); // Aquí pasas la variable status al renderizar
});


// WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});


//Funciones (Controllers)

let status = "Desconectado";
let isLoadingGroups = "Desconectado";


//get
let groups = [];
const getGroups = async () => {
    console.log("GetGroups en proceso.");
    console.time("Tiempo de ejecución getGroups");

    try {
        const chats = await client.getContacts();
        const mygroups = chats.filter(chat => chat.id.server === "g.us");

        const formatedGroups = await Promise.all(
            mygroups.map(async (group) => {
                try {
                    const profilePicUrl = await group.getProfilePicUrl().catch(() => null);
                    return {
                        name: group.name,
                        id: group.id._serialized,
                        profilePicUrl: profilePicUrl || null, // Si falla, asigna null
                    };
                } catch (error) {
                    console.error(`Error obteniendo datos del grupo ${group.id._serialized}:`, error);
                    return null;
                }
            })
        );
        // Filtrar los grupos que fueron procesados correctamente
        const filteredGroups = formatedGroups.filter(group => group !== null);

        isLoadingGroups = "Finalizado";
        io.emit("isLoadingGroups", isLoadingGroups);

        console.timeEnd("Tiempo de ejecución getGroups");
        return filteredGroups;
    } catch (error) {
        console.error("Error al obtener los grupos:", error);
        console.timeEnd("Tiempo de ejecución getGroups");
        return [];
    }
};



//Handle Message

const handleMessage = (messageObj) => {

    try {
        const message = messageObj.message;
        const recipients = messageObj.recipients;
        const files = messageObj.files;

        for (const groupID of recipients) {
            const group = groups.find(chat => chat.id === groupID);

            if (group) {
                // Enviar mensaje de texto
                console.log('Mensaje enviado al grupo:', group.name, "mensaje: ", message);
                client.sendMessage(groupID, message);

                // Procesar archivos si existen
                for (let key in files) {
                    let fileBuffer = files[key];  // Extraemos el buffer de la imagen

                    // Convertir el buffer a MessageMedia
                    const media = new MessageMedia('image/jpeg', fileBuffer.toString('base64'), key);

                    // Enviar la imagen como mensaje
                    client.sendMessage(groupID, media).then(response => {
                        console.log(`Archivo ${key} enviado con éxito:`);
                    }).catch(error => {
                        console.error(`Error al enviar el archivo ${key}:`, error);
                    });
                }
            } else {
                console.log(`Grupo con ID "${groupID}" no encontrado. Ocurrió un error al enviar el mensaje.`);
            }
            io.emit('messageState', true);

        }


    } catch {
        io.emit('messageState', false);

    }


    // console.log("title: ", message, "recipients: ", recipients, "files: ", files);



}




//Post






//programing

//delete






















//Conexiones:




client.on('change_state', (state) => {
    console.log('Estado cambiado:', state);
});





//Eventos de WhatsApp
client.on('qr', async (qr) => {
    console.log('QR recibido, enviando al frontend...');
    const qrImage = await QRCode.toDataURL(qr);
    io.emit('qr', qrImage);
});




client.on('ready', async () => {
    console.log('Cliente WhatsApp Conectado');
    status = "Conectado";
    io.emit('status', status);
    isLoadingGroups = "Cargando";
    io.emit('isLoadingGroups', isLoadingGroups);

    groups = await getGroups();
    // console.log('Grupos obtenidos:', groups);
    io.emit('groups-updated', groups);
});

client.on('disconnected', () => {
    console.log("Cliente Whatsapp Desconectado")
    isLoadingGroups = "Desconectado";
    io.emit('isLoadingGroups', isLoadingGroups);

});




//Eventos de socket.io
io.on('connection', async (socket) => {
    console.log('Cliente conectado a WebSocket');

    io.emit('groups-updated', groups);
    io.emit('status', status);
    io.emit('isLoadingGroups', isLoadingGroups);



    socket.on("handleMessage", (messageObj) => {
        console.log("handleMessage activado");
        handleMessage(messageObj);
    })





    socket.on('send-msj', (myMessage) => {
        console.log(myMessage)
        sendMessage(myMessage);
    });

    socket.on('cerrar', async () => {
        console.log("Cerrando cliente...");

        // Destruir la sesión de WhatsApp Web
        await client.destroy();

        // Esperar un poco (puedes agregar un pequeño retraso si lo necesitas)
        console.log("Cliente cerrado, reiniciando...");
        status = "Desconectado";

        io.emit('status', status);
        groups = [];
        // Inicializar nuevamente el cliente

        client.initialize();

        console.log("Cliente reiniciado");
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
