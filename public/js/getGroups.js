document.addEventListener("DOMContentLoaded", function () {

    const socket = io();

    const table = new DataTable("#groupTable", {
        searching: true,  // Activa el buscador
        paging: false,     // Activa la paginación
        info: false,       // Muestra información sobre la cantidad de registros
    });

    // Escuchar el evento 'groups-updated'
    socket.on("groups-updated", (groups) => {
        table.clear(); // Limpiar la tabla antes de actualizar

        if (groups.length > 0) {
            groups.forEach(group => {
                const profilePicUrl = group.profilePicUrl;

                table.row.add([
                    `<div class="w-10 h-10 rounded-full overflow-hidden">
                        <img src="${profilePicUrl}" alt="${group.name} class="object-cover" />
                    </div>`,  
                    group.name,
                    `<input type="radio"/>`
                ]);
            });
        } else {
            table.row.add(["Cargando grupos...", ""]);
        }

        table.draw(); // Renderizar la tabla con los nuevos datos
    });

    // Función para enviar mensaje
    const sendMessage = () => {
        socket.emit("send-msj");
        console.log('Evento "send-msj" enviado');
    };
});
