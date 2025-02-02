

// Sockets
const socket = io();

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
const sendMessage = (myMessage, groupsSelected) => {

    const message = {
        body: myMessage,
        recipients: groupsSelected
    };

    socket.emit("send-msj", message);
    console.log('event send-msj emited' + myMessage);
};






document.addEventListener('alpine:init', () => {
    Alpine.data('services', () => ({
        message: "",
        groupsSelected: [],
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
        sendMessage() {
            sendMessage(this.message, this.groupsSelected);
        }


    }))
})




document.addEventListener("DOMContentLoaded", function () {
    getGroups();

});
