const { Client, ClientInfo, LocalAuth, NoAuth, MessageMedia, WAState } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const QRCode = require('qrcode');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');


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
    res.render('pages/login', { title: "Login" });
});


app.get('/login', (req, res) => {
    res.render('pages/login', { title: 'Login' });
});


app.get('/dashboard', (req, res) => {
    res.render('pages/dashboard', { title: 'Dashboard' });
});

// WhatsApp Client
const client = new Client({
    authStrategy: new NoAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--unhandled-rejections=strict'],
    }
});


//Credenciales Admin
const STATIC_USERNAME = "admin";
const STATIC_PASSWORD = "123456";
const SECRET_KEY = 'admin123456';


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
        io.emit('isLoadingGroups', isLoadingGroups);

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

const handleMessageProgramated = (messageObj) => {
    try {
        const { hora, fecha } = messageObj;

        const [year, month, day,] = fecha.split('-').map(Number);
        const [hours, minutes] = hora.split(':').map(Number);


        const targetDate = new Date(year, month - 1, day, hours, minutes, 0); // Crear fecha objetivo
        const now = new Date();
        const delay = targetDate.getTime() - now.getTime();

        if (delay <= 0) {
            console.log("⚠️ La hora ya pasó, no se puede programar el mensaje.");
            console.log(`⚠️ X programado : ${targetDate}`);
            io.emit('messageProgramatedState', "FechaPasada");

            return;
        }

        const myID = client.info.wid._serialized;
        const { message, recipients, files } = messageObj;
        const dateFormated = `*${day}-${month}-${year}* a las *${hours}:${minutes}Hrs*`



        const notiTemplate = `🕐¡Mensaje programado para el día: ${dateFormated} *Cuerpo del mensaje:* "${message}", *Imagenes Enviadas:* ${files.length}, *Cantidad de Grupos:* ${recipients.length} grupos. `

        client.sendMessage(myID, notiTemplate);

        io.emit('messageProgramatedState', "Programado");


        setTimeout(() => {
            handleMessage(messageObj);
        }, delay);

    } catch (e) {
        console.log("Ocurrio un error en programar mensaje")
        io.emit('messageProgramatedState', "Error");

    }


}


let isProcessingEndSession = false;
let readyForEndSession = false;
let isProcessing = false;
let alreadyClientReady = false;





const forcedSessionEnd = async () => {

    if (!isProcessingEndSession && readyForEndSession) {

        isProcessingEndSession = true;

        console.log("Cerrando cliente...");
        await client.destroy();
        console.log("Cliente cerrado, reiniciando...");

        status = "Desconectado";
        groups = [];
        isLoadingGroups = "Desconectado";
        io.emit('status', status);
        io.emit('isLoadingGroups', isLoadingGroups);
        io.emit('groups-updated', groups);


        try {
            client.initialize();
            console.log("Cliente reiniciado");
        } catch (error) {
            console.error("Error al reiniciar el cliente:", error);
        }

        isProcessingEndSession = false;
        alreadyClientReady = false;

    }

    readyForEndSession = false;


};


const resetDisconnected = () => {
    status = "Desconectado";
    groups = [];
    isLoadingGroups = "Desconectado";
    io.emit('status', status);
    io.emit('isLoadingGroups', isLoadingGroups);
    io.emit('groups-updated', groups);
    io.emit('whatsapp-disconnected-forced', true);
}

//Eventos de WhatsApp



// Evento de conexión

//Cliente Whatsapp
client.on('qr', async (qr) => {

    if (!alreadyClientReady) {
        console.log('QR recibido, enviando al frontend...');
        const qrImage = await QRCode.toDataURL(qr);
        io.emit('qr', qrImage);
        readyForEndSession = true;
    }

});








// Evento de conexión
client.on('ready', async () => {
    if (!isProcessing && !alreadyClientReady) {
        isProcessing = true;
        try {
            console.log('Cliente WhatsApp Conectado');
            status = "Conectado";
            io.emit('status', status);
            isLoadingGroups = "Cargando";
            io.emit('isLoadingGroups', isLoadingGroups);
            groups = await getGroups();
            io.emit('groups-updated', groups);
            alreadyClientReady = true; // Marcamos que el cliente ya está listo
        } catch (error) {
            console.error("Error en client.on('ready'):", error);
        } finally {
            isProcessing = false; // Resetear siempre
        }
    }
});

// Evento de desconexión
client.on('disconnected', async () => {
    if (!isProcessing) {
        isProcessing = true;
        try {
            console.log("Cliente WhatsApp Desconectado");
            resetDisconnected();
            alreadyClientReady = false; // Permitir reiniciar el cliente
        } catch (error) {
            console.error("Error en client.on('disconnected'):", error);
        } finally {
            isProcessing = false;
        }
    }
});








//Eventos de socket.io
io.on('connection', (socket) => {
    console.log('Cliente conectado a WebSocket');
    setTimeout(() => {
        socket.emit('status', status);
        socket.emit('isLoadingGroups', isLoadingGroups);
        socket.emit('groups-updated', groups);


    }, 1000)



    socket.on("handleMessage", (messageObj) => {
        console.log("handleMessage activado");
        handleMessage(messageObj);
    })

    socket.on("handleMessageProgramated", (messageObj) => {
        console.log("handleMessageProgramated activado");
        handleMessageProgramated(messageObj);
    })




    socket.on('send-msj', (myMessage) => {
        console.log(myMessage)
        sendMessage(myMessage);
    });

    //Sockets cerrar
    socket.on('cerrar', async () => {
        await forcedSessionEnd()

    });





    socket.on('login-connection', (data) => {

        const { username, password } = data;

        if (username === STATIC_USERNAME && password === STATIC_PASSWORD) {
            // Generar un token JWT
            const token = jwt.sign({ username: username }, SECRET_KEY, { expiresIn: '1h' });

            socket.emit('login-success', {
                message: 'Login exitoso',
                token: token
            });
            console.log("usuario Logeado!")
        } else {
            socket.emit('login-error', { message: 'Usuario o contraseña incorrectos' });
        }
    });

    //Socket Disconnected
    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
    });
});


// Inicializar el cliente de WhatsApp (No signfica que esté el dispositivo conectado.)
client.initialize();

// Iniciar el servidor
server.listen(port, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
});