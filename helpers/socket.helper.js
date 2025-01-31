let logger = console;
const socket = {};

socket.config = (server) => {
    const io = require("socket.io")(server, {
        transports: ["websocket", "polling"],
        cors: {
            origin: "*",
        },
    });
    socket.io = io;

    io.sockets.on("connection", (socket) => {
        let address = socket.request.connection.remoteAddress;

        logger.info(`New Connection`, {
            address,
            id: socket.id,
        });

        socket.on("leave", (params) => {
            logger.info("leaved", {
                ...params,
                address,
                id: socket.id,
                method: "leave",
            });
            socket.leave(params.room);
        });

        socket.on("join", async (params, cb) => {
            socket.join(params.room, {
                ...params,
            });

            logger.info("join", {
                ...params,
                address,
                id: socket.id,
                method: "join",
            });

            if (typeof cb === "function")
                cb({
                    room: params.room,
                });
        });

        socket.on("disconnect", () => {
            logger.info("disconnected", {
                id: socket.id,
                method: "disconnect",
            });
        });
    });
};

module.exports = socket;
