const { Client, ClientInfo, LocalAuth, NoAuth, MessageMedia, WAState } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const QRCode = require('qrcode');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { profile } = require('console');
const db = require('./db/db.js');

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
    authStrategy: new LocalAuth(),
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



// Función para agregar un timeout a una promesa
function withTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error('Timeout: la operación tardó demasiado'));
        }, timeoutMs);

        promise
            .then((result) => {
                clearTimeout(timeout); // Cancelar el timeout si la promesa se resuelve
                resolve(result);
            })
            .catch((error) => {
                clearTimeout(timeout); // Cancelar el timeout si la promesa es rechazada
                reject(error);
            });
    });
}

// Función para obtener la URL de la imagen de perfil con timeout
async function getProfilePicUrlWithTimeout(group, timeoutMs = 5000) {
    try {
        const profilePicUrl = await withTimeout(group.getProfilePicUrl(), timeoutMs);
        return profilePicUrl;
    } catch (error) {
        console.error(`Error obteniendo la URL de perfil para el grupo ${group.id._serialized}:`, error.message);
        return null; // Devuelve null si hay un error o timeout
    }
}

//get
let groups = [];
const getGroups = async () => {
    console.log("GetGroups en proceso.");
    console.time("Tiempo de ejecución getGroups");

    try {
        const chats = await client.getContacts();
        const mygroups = chats
            .filter(chat => {
                const isGroup = chat.id.server === "g.us";

                const isPersonalContact = chat.id._serialized.endsWith("@c.us") && chat.isMyContact === true;

                return isGroup || isPersonalContact;
            })
            .sort((a, b) => {
                const nameA = a.name || a.pushname || "";
                const nameB = b.name || b.pushname || "";

                return nameA.localeCompare(nameB); // Ordenar de A a Z
            });

        console.log(mygroups)

        const formatedGroups = await Promise.all(
            mygroups.map(async (group) => {

                let profilePicUrl;
                try {

                    if (group.id.server === "g.us") {
                        profilePicUrl = await getProfilePicUrlWithTimeout(group);
                    } else if (group.id.server === "c.us") {
                        profilePicUrl = await getProfilePicUrlWithTimeout(group);
                    } else {
                        profilePicUrl = false;
                    }

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

const getProgrammedMessages = () => {
    try {
        // Consulta SQL para obtener los mensajes programados y sus grupos asociados
        const query = `
            SELECT 
                mp.id AS message_id,
                mp.date AS message_date,
                mp.message AS message_body,
                mp.images_count AS images_count,
                gmp.group_name AS group_name,
                gmp.status AS group_status
            FROM 
                messagesProgrammed mp
            LEFT JOIN 
                groupsMessagesProgrammed gmp
            ON 
                mp.id = gmp.messagesProgrammed_id
            ORDER BY 
                mp.date ASC;
        `;

        // Ejecutar la consulta
        const rows = db.prepare(query).all();

        // Construir el objeto de respuesta
        const result = {};

        rows.forEach((row) => {
            const messageId = row.message_id;

            // Si el mensaje no está en el resultado, lo agregamos
            if (!result[messageId]) {
                result[messageId] = {
                    id: messageId,
                    date: row.message_date,
                    message: row.message_body,
                    images_count: row.images_count,
                    groups: [],
                };
            }

            // Agregar el grupo y su estado al mensaje correspondiente
            if (row.group_name) {
                result[messageId].groups.push({
                    group_name: row.group_name,
                    status: row.group_status,
                });
            }
        });

        // Convertir el objeto a un array de mensajes
        const messages = Object.values(result);

        return messages;
    } catch (e) {
        console.error("Error al obtener los mensajes programados:", e);
        return []; // Retornar un array vacío en caso de error
    }
};


//Handle Message
const handleMessage = (messageObj) => {
    try {
        const message = messageObj.message;
        const recipients = messageObj.recipients.map((recipient)=> recipient.id);


        console.log(`recipientes reales:${recipients}` )
        const files = messageObj.files;

        for (const groupID of recipients) {
            const group = groups.find(chat => chat.id === groupID);

            if (group) {
                if (files.length >= 1) {
                    console.log("Si hay Files");

                    let isSendTextImg = false;

                    // Procesar archivos si existen
                    for (let key in files) {
                        let fileBuffer = files[key];  // Extraemos el buffer de la imagen

                        // Convertir el buffer a MessageMedia
                        const media = new MessageMedia('image/jpeg', fileBuffer.toString('base64'), key);

                        if (!isSendTextImg) {
                            // Enviar la primera imagen con el texto
                            console.log("Se envía imagen con texto");
                            client.sendMessage(groupID, media, { caption: message ? message : "" }).then(response => {
                                console.log(`Archivo ${key} enviado con éxito:`);
                            }).catch(error => {
                                console.error(`Error al enviar el archivo ${key}:`, error);
                            });

                            isSendTextImg = true;
                        } else {
                            // Enviar solo la imagen (sin texto) para las imágenes restantes
                            console.log("Se envía solo imagen sin texto");
                            client.sendMessage(groupID, media).then(response => {
                                console.log(`Archivo ${key} enviado con éxito:`);
                            }).catch(error => {
                                console.error(`Error al enviar el archivo ${key}:`, error);
                            });
                        }
                    }
                } else {
                    // Si no hay archivos, enviar solo el mensaje de texto
                    console.log('Mensaje enviado al grupo:', group.name, "mensaje: ", message);
                    client.sendMessage(groupID, message);
                }
            } else {
                // Lo que sucede si no hay un grupo seleccionado.
                console.log(`Grupo con ID "${groupID}" no encontrado. Ocurrió un error al enviar el mensaje.`);
            }
            io.emit('messageState', true);
        }
    } catch (error) {
        console.error("Error en handleMessage:", error);
        io.emit('messageState', false);
    }
};

const handleMessageProgramated = (messageObj) => {
    try {
        const { hora, fecha } = messageObj;

        console.log(messageObj);

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


        const insertMessage = db.prepare(`
            INSERT INTO messagesProgrammed (date, message, images_count)
            VALUES (?, ?, ?)
        `);
        const messageResult = insertMessage.run(
            targetDate.toISOString(), 
            message,
            files.length
        );
        const messageId = messageResult.lastInsertRowid; 

        // Guardar los grupos asociados en la tabla `groupsMessagesProgrammed`
        const insertGroup = db.prepare(`
            INSERT INTO groupsMessagesProgrammed (messagesProgrammed_id, group_name, status)
            VALUES (?, ?, ?)
        `);

            

        recipients.forEach((group) => {
            insertGroup.run(
                messageId, // ID del mensaje programado
                group.name,    // Nombre del grupo
                'Programado' // Estado inicial
            );
        });

        console.log(`✅ Mensaje programado guardado en la base de datos con ID: ${messageId}`);

        io.emit('messageProgramatedState', "Programado");


        const dataProgrammed = getProgrammedMessages();
        io.emit('get-programmed-messsages', dataProgrammed);


        setTimeout(() => {
            handleMessage(messageObj);
        }, delay);

    } catch (e) {
        console.log("Ocurrio un error en programar mensaje")
        io.emit('messageProgramatedState', "Error");

    }
};


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
            alreadyClientReady = true; 

            //Get Programmed Messages
            const dataProgrammed = getProgrammedMessages();
            io.emit('get-programmed-messsages', dataProgrammed);

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

        const dataProgrammed = getProgrammedMessages();
        io.emit('get-programmed-messsages', dataProgrammed);



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