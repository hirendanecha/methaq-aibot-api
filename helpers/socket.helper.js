const { handleSocketEvents } = require("../controllers/socket.controller");

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
    // console.log("A user connected:", socket.id);
    let address = socket.request.connection.remoteAddress;

    socket.on("joinRoom", (data) => {
      console.log("Received joinRoom event:", data);
      socket.join(data.userId);
   
      handleSocketEvents(socket, io, data);
    });

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
      socket.leave(params.userId);
    });

    socket.on("joinChat", async (params, cb) => {
      // console.log("Received joinChat event:", params);

      socket.join(params.chatId, {
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
          room: params.chatId,
        });
    });

    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
      logger.info("disconnected", {
        id: socket.id,
        method: "disconnect",
      });
    });
  });
};

module.exports = socket;
