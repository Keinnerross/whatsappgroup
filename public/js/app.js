

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

    const table = new DataTable("#groupTable", {
        searching: true,  // Activa el buscador
        paging: false,     // Activa la paginación
        info: false,       // Muestra información sobre la cantidad de registros
    });

    socket.on("groups-updated", (groups) => {
        table.clear(); // Limpiar la tabla antes de actualizar

        if (groups.length > 0) {
            groups.forEach(group => {
                Idgroups.push(group.id);



                const profilePicUrl = group.profilePicUrl ? group.profilePicUrl : "/assets/group-profile.png";
                table.row.add([
                    `<div class="w-10 h-10 rounded-full overflow-hidden">
                    <img src="${profilePicUrl}" alt="${group.name} class="object-cover" />
                </div>`,
                    group.name,
                    `<input type="checkbox" x-on:change="handleGroupsSelected('${group.id}')"/>`
                ]);
            });
        } else {
            table.row.add(["Cargando grupos...", ""]);
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

    // if (files) {
    // let fileArray = [];

    // for (let i = 0; i < files.length; i++) {
    //     let reader = new FileReader();
    //     reader.readAsDataURL(files[i]); // Convertimos a Base64

    //     reader.onload = function () {
    //         fileArray.push({
    //             name: files[i].name,
    //             type: files[i].type,
    //             data: reader.result // Base64
    //         });




    //     };
    // }





    // }
}




document.addEventListener('alpine:init', () => {
    Alpine.data('services', () => ({
        message: "",
        groupsSelected: [],
        files: [],


        handleGroupsSelected(groupSelected) {
            if (this.groupsSelected.includes(groupSelected)) {
                const newGroupsSelected = this.groupsSelected.filter((group) => group !== groupSelected);
                this.groupsSelected = newGroupsSelected;
                console.log(this.groupsSelected);
            } else {
                console.log('No existe y lo agrego');
                this.groupsSelected.push(groupSelected);
                console.log(this.groupsSelected);


            }
        },

        handleFileUpload(event) {
            this.files = event.target.files; // Guardamos los archivos tal cual en Alpine
            if (this.files.length > 0) {
                console.log("Archivos cargados correctamente:", this.files);
            } else {
                console.log("No se seleccionaron archivos.");
            }
        },


        sendMessage() {
            sendMessage(this.message, this.groupsSelected, this.files);
        },
        cerrar() {
            console.log("Cerrando session")
            socket.emit("cerrar");

        }

    }))
})




document.addEventListener("DOMContentLoaded", function () {

    const storedQr = localStorage.getItem('whatsapp-qr');
    if (storedQr) {
        document.getElementById('qrImage').src = storedQr;
    }

    getGroups();

});
