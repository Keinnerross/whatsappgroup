

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




let Idgroups = [];

//Get Groups
const getGroups = async () => {
    let table;




    socket.on("groups-updated", (groups) => {

        if (groups.length > 0) {
            
            table = new DataTable("#groupTable", {
                searching: true,  // Activa el buscador
                paging: false,     // Activa la paginación
                info: false,       // Muestra información sobre la cantidad de registros
            });

            groups.forEach(group => {
                Idgroups.push(group.id);



                const profilePicUrl = group.profilePicUrl ? group.profilePicUrl : "/assets/group-profile.png";
                table.row.add([
                    `<div class="w-10 h-10 rounded-full overflow-hidden">
                    <img src="${profilePicUrl ? profilePicUrl : '/assets/group-profile.png'}" alt="${group.name ? group.name : ""} class="object-cover" />
                </div>`,
                    group.name ? group.name : "Grupo sin Nombre",
                    `<input type="checkbox" x-on:change="handleGroupsSelected('${group.id}')"/>`
                ]);
            });
        } else {
            table.row.add(["Cargando grupos...", "", ""]);
        }

        table.draw(); // Renderizar la tabla con los nuevos datos

    });


}

//Send Message
function sendMessage(myMessage, groupsSelected, files) {
    console.log("sendMessage activado");
    let formData = new FormData();
    formData.append("message", myMessage);

    console.log(files);

    const messageObj = {
        message: myMessage,
        files: files,
        recipients: groupsSelected
    }
    console.log(messageObj.files);

    socket.emit("handleMessage", messageObj);


}




let xShowTable = false


document.addEventListener('alpine:init', () => {
    Alpine.data('services', () => ({
        message: "",
        groupsSelected: [],
        files: [],
        isPicker: false,
        showTable: xShowTable,

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
            sendMessage(this.message, this.groupsSelected, this.files);
        },

        // Cerrar sesión
        cerrar() {
            console.log("Cerrando sesión");
            socket.emit("cerrar");
        }
    }));
});




//isLoading

socket.on('isLoadingGroups', (isLoadingGroups) => {
    const loadingElement = document.getElementById('isLoadingGroups');

    if (isLoadingGroups === 'Desconectado') {
        loadingElement.innerHTML = 'Esperando conexión...';
    } else if (isLoadingGroups === 'Cargando') {
        // Caso Cargando
        loadingElement.innerHTML = 'Cargando grupos...';
    } else if (isLoadingGroups === 'Finalizado') {
        // Caso Finalizado
        loadingElement.innerHTML = '';
        xShowTable = true;
    } else {
        // Caso por defecto
        loadingElement.innerHTML = 'Error al cargar grupos';
    }
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
    // Añadir el picker al cuerpo de la página

    // Obtener la posición del botón

    // Posicionar el picker cerca del botón
    picker.style.position = 'relative';


});
