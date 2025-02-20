const { handleSocketEvents } = require("../controllers/socket.controller");
const CustomerModel = require("../models/customer.model");
const UserModel = require("../models/user.model");

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
  const agents = {};
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

    socket.on('activity', (params, cb) => {
      async function updateOnlineStatus(isOnline) {
        const updateIsOnline = await UserModel.findOneAndUpdate(
          {
            _id: params.room
          },
          {
            isOnline: isOnline
          },
          {
            new: true
          }
        );
      }

      if (agents[socket.id]) {
        clearTimeout(agents[socket.id].idleTimer);
        updateOnlineStatus(true)
      }

      // Reset idle timer
      agents[socket.id] = {
        idleTimer: setTimeout(() => {
          agents[socket.id].isIdle = true;
          updateOnlineStatus(false)
          socket.emit('idle', 'You are idle. Click here to be active again.');
        }, 10 * 60 * 1000), // 10 minutes
        isIdle: false
      };
    });

    socket.on('active', () => {
      if (agents[socket.id]) {
        clearTimeout(agents[socket.id].idleTimer);
        agents[socket.id].isIdle = false;

        // Reset idle timer
        agents[socket.id].idleTimer = setTimeout(() => {
          agents[socket.id].isIdle = true;
          socket.emit('idle', 'You are idle. Click here to be active again.');
        }, 10 * 60 * 1000); // 10 minutes
      }
    });

    socket.on("create-customer", async (params) => {
      logger.info("create-customer", {
        ...params,
        address,
        id: socket.id,
        method: "create-customer",
      });
      const customer = await CustomerModel.create({
        name: params.name,
        email: params.email,
        phone: params.phone,
        notes: params.notes,
      });
      const newCustomers = customer.save();
      socket.emit("customer-created", newCustomers);
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
