

// Sockets
const socket = io();

const delayLoading = 5000






// QR Code Settings
socket.on('qr', (qrImage) => {
    localStorage.setItem('whatsapp-qr', qrImage);
    document.getElementById('qrImage').src = qrImage;
});


// Status
socket.on('status', (status) => {
    Alpine.store("services").status = status;
});

// Status
socket.on('whatsapp-disconnected-forced', (res) => {
    setTimeout(() => {
        location.reload();
    }, 1500)
});




socket.on('messageProgramatedState', (state) => {
    if (state == "Programado") {
        Alpine.store("services").isSendProgramated = false;
        Alpine.store('services').modalSucesfulMsjProgramated = true;

        document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            checkbox.checked = false;
        });

        Alpine.store("services").message = ""
        Alpine.store("services").files = []
        Alpine.store("services").groupsSelected = []

    } else if (state == "FechaPasada") {
        alert("⚠️ La hora ya pasó, no se puede programar el mensaje.")
    } else {
        alert("⚠️Ocurrio un error a programar mensaje")
    }

});


let msjResponse;
socket.on('messageState', (state) => {
    if (state) {
        setTimeout(() => {
            Alpine.store('services').modalSucesfulMsj = true;
        }, 1500)
    } else {
        alert("Algo Salió Mal")
    }

    document.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
        checkbox.checked = false; // Desmarcar cada checkbox
    });

    Alpine.store("services").message = ""
    Alpine.store("services").files = []
    Alpine.store("services").groupsSelected = []



});


//Login Socket
socket.on('login-success', (data) => {
    const { token } = data;
    if (token) {
        localStorage.setItem('jwtToken', token);

        window.location.href = '/dashboard';
    } else {
        console.error("No se recibió un token válido.");
    }
});

socket.on('login-error', () => {
    alert('Credenciales incorrectas');
    localStorage.removeItem('jwtToken'); // Eliminar el token expirado
});


let Idgroups = [];
let table;
//Get Groups
socket.on("groups-updated", (groups) => {

    setTimeout(() => {

        if (table) {
            table.destroy();
            table = null;
        }

        if (groups.length > 0) {
            table = new DataTable("#groupTable", {
                searching: true,  // Activa el buscador
                paging: false,     // Activa la paginación
                info: false,  // Muestra información sobre la cantidad de registros
                language: {
                    searchPlaceholder: 'Busca tus grupos',
                    emptyTable: "Aun no hay grupos disponibles 😖",
                    infoEmpty: "No hay registros 🔍",
                    zeroRecords: "No se encontraron resultados 🔍"
                }

            });


            groups.forEach(group => {
                Idgroups.push(group.id);

                const profilePicUrl = group.profilePicUrl ? group.profilePicUrl : "/assets/group-profile.png";
                table.row.add([
                    `
                <label class="flex h-12 gap-2 w-full h-full cursor-pointer" for="group-${group.id}">
                    <div class="w-10 h-10 rounded-full overflow-hidden">
                        <img src="${profilePicUrl ? profilePicUrl : '/assets/group-profile.png'}" alt="${group.name ? group.name : ""}" class="object-cover" />
                    </div>

                    <div class="pt-2">
                        <span class="text-gray-700">${group.name ? group.name : "Grupo sin Nombre"}</span>
                    </div>
                </label>               
            `,
                    `<input  id="group-${group.id}" type="checkbox" x-on:change="$store.services.handleGroupsSelected('${group.id}')"/>`
                ]);
            });
        } else {
            table.row.add(["Cargando grupos...", "", ""]);
        }
        table.draw(); // Renderizar la tabla con los nuevos datos
    }, delayLoading)



});







//Send Message
function sendMessage() {

    const messageObj = {
        message: Alpine.store("services").message,
        files: Alpine.store("services").files,
        recipients: Alpine.store("services").groupsSelected,
    }



    Alpine.store("services").modalSendMsj = false;
    socket.emit("handleMessage", messageObj);
}


//Autentificacación
function isAuthenticated() {
    const token = localStorage.getItem('jwtToken');
    return !!token;
}

function checkAuth() {
    const publicRoutes = ['/', '/login'];

    if (isAuthenticated() && publicRoutes.includes(window.location.pathname)) {
        window.location.href = '/dashboard'; // Redirige al dashboard si está autenticado y en una ruta pública
    } else if (!isAuthenticated() && !publicRoutes.includes(window.location.pathname)) {
        window.location.href = '/login'; // Redirige al login si no está autenticado y no está en una ruta pública
    }
}




//isLoading

socket.on('isLoadingGroups', (isLoadingGroups) => {

    const loadingElement = document.getElementById('isLoadingGroups');
    const groupTable = document.getElementById('groupTable');

    if (isLoadingGroups === 'Cargando') {
        // console.log("estado Cargando")
        loadingElement.classList.remove('hidden');
        groupTable.classList.add('hidden');

        loadingElement.innerHTML = `
        <div class="w-full h-full flex justify-center items-center pt-10">
            <div class="flex flex-col items-center">
                <span class="loader"></span>
                <div class="w-[300px] pt-8 text-center text-gray-700">
                <swiper-container autoplay="true" loop="true">
                         <swiper-slide>🐱 Reuniendo stickers de gatitos... ¡Miau!</swiper-slide>
                        <swiper-slide>👀 Espiando los grupos de la familia... ¡Cuidado con los tíos!</swiper-slide>
                        <swiper-slide>🚀 Preparando el despegue de los gurpos...</swiper-slide>
                </swiper-container>

                </div>
            </div>
        </div>
        `;


    } else if (isLoadingGroups === 'Desconectado') {
        // Caso Cargando
        // // console.log("estado Desconectado")

        loadingElement.classList.remove('hidden');
        groupTable.classList.add('hidden');

        loadingElement.innerHTML = `<div class="flex h-full justify-center items-center">
        <div class="flex flex-col justify-center h-full items-center text-gray-400">
             <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="150px" width="150px" xmlns="http://www.w3.org/2000/svg">
             // <path d="M5 9.897c0 -1.714 1.46 -3.104 3.26 -3.104c.275 -1.22 1.255 -2.215 2.572 -2.611c1.317 -.397 2.77 -.134 3.811 .69c1.042 .822 1.514 2.08 1.239 3.3h.693a2.42 2.42 0 0 1 2.425 2.414a2.42 2.42 0 0 1 -2.425 2.414h-8.315c-1.8 0 -3.26 -1.39 -3.26 -3.103z"></path>
             // <path d="M12 13v3"></path><path d="M12 18m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
             // <path d="M14 18h7"></path>
             // <path d="M3 18h7"></path></svg>
             <h3 class="w-[80%] text-center text-sm font-medium">Escanee el Código QR para Comenzar</h3>
        </div>
    </div>`;

    } else if (isLoadingGroups === 'Finalizado') {

        // // console.log("Estado Finalizado")
        loadingElement.classList.remove('hidden');
        groupTable.classList.add('hidden');

        loadingElement.innerHTML = `
        <div class="w-full h-full flex justify-center items-center pt-10">
            <div class="flex flex-col items-center">
                <span class="loader"></span>
                <div class="w-[300px] pt-8 text-center text-gray-700">
                    <swiper-container autoplay="true" loop="true">
                        <swiper-slide>🐱 Reuniendo stickers de gatitos... ¡Miau!</swiper-slide>
                        <swiper-slide>👀 Espiando los grupos de la familia... ¡Cuidado con los tíos!</swiper-slide>
                        <swiper-slide>🚀 Preparando el despegue de los gurpos...</swiper-slide>
                    </swiper-container>
                </div>
            </div>
        </div>
        `;

        setTimeout(() => {
            loadingElement.classList.add('hidden');
            groupTable.classList.remove('hidden');

        }, delayLoading)


    } else {
        // Caso por defecto
        loadingElement.innerHTML = 'Error al cargar grupos';
    }
});






//////////////////////////////////////////
/////////////Varaibles AlpineJS /////////
////////////////////////////////////////
document.addEventListener('alpine:init', () => {
    Alpine.store('services', {
        message: "",
        groupsSelected: [],
        files: [],
        ifShowImages: false,
        isPicker: false,
        status: "Desconectado",
        modalSendMsj: false,
        modalSucesfulMsj: false,
        isMessageProgramated: false,
        modalSucesfulMsjProgramated: false,
        isSendProgramated: false,
        time: "",
        date: "",
        username: "",
        userPassword: "",

        handleLogin() {


            const userData = {
                username: Alpine.store("services").username,
                password: Alpine.store("services").userPassword
            }
            socket.emit('login-connection', userData);


            // // console.log(Alpine.store("services").username, Alpine.store("services").userPassword);
        },

        handleMessageProgramated() {

            const messageObj = {
                message: Alpine.store("services").message,
                files: Alpine.store("services").files,
                recipients: Alpine.store("services").groupsSelected,
                hora: Alpine.store("services").time,
                fecha: Alpine.store("services").date,
            }
            // console.log('handleMessageProgramated: ', messageObj)


            socket.emit('handleMessageProgramated', messageObj);

        },

        // Maneja la selección de grupos
        handleGroupsSelected(groupSelected) {
            let groups = Alpine.store("services").groupsSelected;

            if (groups.includes(groupSelected)) {
                // Modificamos el array original con splice (sin reasignar)
                groups.splice(groups.indexOf(groupSelected), 1);
            } else {
                groups.push(groupSelected);
            }

            // console.log(groups);
        },

        // Maneja la carga de archivos
        handleFileUpload(event) {
            const selectedFiles = Array.from(event.target.files);
            const totalSize = selectedFiles.reduce((total, file) => total + file.size, 0);

            // Validaciones
            if (selectedFiles.length > 5) {
                alert("Solo puedes seleccionar un máximo de 5 imágenes.");
                return;
            }
            if (totalSize > 20 * 1024 * 1024) { // 20MB
                alert("El tamaño total de las imágenes no puede exceder los 20 MB.");
                return;
            }

            // Filtrar archivos válidos (solo .jpg y .png)
            const validFiles = selectedFiles.filter(file => {
                const fileType = file.type;
                return fileType === "image/jpeg" || fileType === "image/png";
            });

            // Actualizar la lista de archivos seleccionados
            Alpine.store('services').files = validFiles;
            Alpine.store("services").files = validFiles;


            if (Alpine.store('services').files.length > 0) {
                // console.log("Archivos cargados correctamente:", Alpine.store('services').files);

            } else {
                // console.log("No se seleccionaron archivos válidos.");
            }
        },

        // Eliminar archivo de la lista
        removeFile(index) {
            Alpine.store('services').files.splice(index, 1);
        },


        // Enviar el mensaje
        sendMessage() {
            sendMessage();
        },

        // Cerrar sesión
        cerrar() {
            socket.emit("cerrar");

            setTimeout(() => {
                location.reload();

            }, 2000)
        },
        cerrarSessionUsuario() {
            localStorage.removeItem('jwtToken');
            window.location.href = '/login';


        },
    });



});






document.addEventListener("DOMContentLoaded", function () {




    checkAuth(); // Verifica la autenticación en las rutas protegidas




    const storedQr = localStorage.getItem('whatsapp-qr');
    if (storedQr) {
        document.getElementById('qrImage').src = storedQr;
    }


    //Emoji Picker
    const pickerOptions = {
        onEmojiSelect: emoji => {
            const inputMessage = document.getElementById('input-message');
            inputMessage.value += emoji.native;
        }
    };
    const picker = new EmojiMart.Picker(pickerOptions);
    document.getElementById('emoji-picker').appendChild(picker);
    picker.style.position = 'relative';


    //loader
    const swiperContainer = document.querySelector('swiper-container');
    if (swiperContainer) {
        Object.assign(swiperContainer, {
            autoplay: {
                delay: 0,
                disableOnInteraction: false, // No se detiene al interactuar
            },
            loop: true,
        });
        swiperContainer.initialize();
    }


});
