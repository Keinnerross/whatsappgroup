

// Sockets
const socket = io();








// QR Code Settings
socket.on('qr', (qrImage) => {
    localStorage.setItem('whatsapp-qr', qrImage);
    document.getElementById('qrImage').src = qrImage;
});


// Status
socket.on('status', (status) => {
    document.getElementById('status').innerHTML = status;
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




let Idgroups = [];
let table;

//Get Groups
const getGroups = async () => {


    socket.on("groups-updated", (groups) => {
        if (groups.length > 0) {

            table = new DataTable("#groupTable", {
                searching: true,  // Activa el buscador
                paging: false,     // Activa la paginación
                info: false,  // Muestra información sobre la cantidad de registros
                language: {
                    searchPlaceholder: 'Busca tus grupos'
                }

            });

            groups.forEach(group => {
                Idgroups.push(group.id);

                const profilePicUrl = group.profilePicUrl ? group.profilePicUrl : "/assets/group-profile.png";
                table.row.add([
                    `
                    <label class="flex h-12 gap-2 w-full h-full cursor-pointer" for="group-${group.id}">
                        <div class="w-12 rounded-full overflow-hidden">
                            <img src="${profilePicUrl ? profilePicUrl : '/assets/group-profile.png'}" alt="${group.name ? group.name : ""} class="object-cover" />
                        </div>

                        <div class="pt-2">
                            <span class="text-lg text-gray-700">${group.name ? group.name : "Grupo sin Nombre"}</span>
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

    });


}



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






//isLoading

socket.on('isLoadingGroups', (isLoadingGroups) => {
    const loadingElement = document.getElementById('isLoadingGroups');
    const groupTable = document.getElementById('groupTable');

    if (isLoadingGroups === 'Cargando') {
        loadingElement.classList.remove('hidden');
        groupTable.classList.add('hidden');

        loadingElement.innerHTML = `
        <div class="w-full h-full flex justify-center items-center pt-10">
            <div class="flex flex-col items-center">
                <span class="loader"></span>
                <div class="w-[300px] pt-8 text-center text-gray-700">
                    <swiper-container autoplay="true" loop="true">
                        <swiper-slide>🕵️‍♂️ Buscando grupos secretos... ¡Shhh!</swiper-slide>
                        <swiper-slide>📱 Revisando grupos archivados...</swiper-slide>
                        <swiper-slide>🐱 Reuniendo stickers de gatitos... ¡Miau!</swiper-slide>
                        <swiper-slide>🤔 Descifrando mensajes borrados...</swiper-slide>
                        <swiper-slide>👀 Espiando los grupos de la familia... ¡Cuidado con los tíos!</swiper-slide>
                        <swiper-slide>📅 Organizando grupo de eventos ...</swiper-slide>
                        <swiper-slide>🍿 Buscando los mejores memes...</swiper-slide>
                        <swiper-slide>🔍 Encontrando al admin fantasma...</swiper-slide>
                        <swiper-slide>🐶 Organizando stickers de perritos...!</swiper-slide>
                        <swiper-slide>📲 Sincronizando mensajes...</swiper-slide>
                        <swiper-slide>🎤 Preparando audios de karaoke... </swiper-slide>
                        <swiper-slide>🕶️ Revisando grupos de trabajo... ¡Modo serio activado!</swiper-slide>
                        <swiper-slide>📚 Organizando grupos de estudio...</swiper-slide>
                        <swiper-slide>🍕 Planificando la próxima reunión...</swiper-slide>
                        <swiper-slide>📸 Revisando fotos grupales...</swiper-slide>
                        <swiper-slide>🪙 Buscando grupos de ventas...</swiper-slide>
                        <swiper-slide>💬 Recopilando los mejores chismes... ¡Shhh, secreto!</swiper-slide>
                        <swiper-slide>📦 Desempolvando grupos olvidados...</swiper-slide>
                        <swiper-slide>🌍 Conectando con grupos internacionales...</swiper-slide>
                        <swiper-slide>🚀 Preparando el despegue de los gurpos...</swiper-slide>
                    </swiper-container>
                </div>
            </div>
        </div>
        `;


    } else if (isLoadingGroups === 'Desconectado') {
        // Caso Cargando
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
        loadingElement.classList.add('hidden');
        groupTable.classList.remove('hidden');

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
        modalSendMsj: false,
        modalSucesfulMsj: false,

        // Maneja la selección de grupos
        handleGroupsSelected(groupSelected) {
            if (this.groupsSelected.includes(groupSelected)) {
                this.groupsSelected = this.groupsSelected.filter((group) => group !== groupSelected);
                console.log(this.groupsSelected);
            } else {
                this.groupsSelected.push(groupSelected);
                console.log(this.groupsSelected);
            }
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
            this.files = validFiles;
            Alpine.store("services").files = validFiles;


            if (this.files.length > 0) {
                console.log("Archivos cargados correctamente:", this.files);

            } else {
                console.log("No se seleccionaron archivos válidos.");
            }
        },

        // Eliminar archivo de la lista
        removeFile(index) {
            this.files.splice(index, 1);
        },


        // Enviar el mensaje
        sendMessage() {
            sendMessage();
        },

        // Cerrar sesión
        cerrar() {
            console.log("Cerrando sesión");
            socket.emit("cerrar");
        }
    });



});






document.addEventListener("DOMContentLoaded", function () {


    const storedQr = localStorage.getItem('whatsapp-qr');
    if (storedQr) {
        document.getElementById('qrImage').src = storedQr;
    }

    getGroups();

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
                delay: 1500,
                disableOnInteraction: false, // No se detiene al interactuar
            },
            loop: true,
        });
        swiperContainer.initialize();
    }


});
