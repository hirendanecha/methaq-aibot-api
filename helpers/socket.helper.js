const { handleSocketEvents } = require("../controllers/socket.controller");
const ChatModel = require("../models/chat.model");
const CustomerModel = require("../models/customer.model");
const MessageModel = require("../models/message.model");
const UserModel = require("../models/user.model");

let logger = console;
const socketObj = {};

socketObj.config = (server) => {
  const io = require("socket.io")(server, {
    transports: ["websocket", "polling"],
    cors: {
      origin: "*",
    },
  });
  socketObj.io = io;

  const agents = {};
  io.sockets.on("connection", (socket) => {
    // console.log("A user connected:", socket.id);
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
      socket.leave(params.userId);
    });

    socket.on("joinRoom", (params) => {
      params = typeof params === "string" ? JSON.parse(params) : params;
      socket.join(params.cust_id);
      logger.info("joinroom", {
        ...params,
      })
    })

    socket.on("joinChat", async (params, cb) => {
      const customer = new CustomerModel({
        isGuestUser: true
      });
      const updatedCus = await customer.save();
      const chat = new ChatModel({
        customerId: updatedCus._id,
      })
      const updatedChat = await chat.save();

      socket.join(updatedChat._id);

      logger.info("join", {
        ...params,
        address,
        id: socket.id,
        method: "join",
      });

      if (typeof cb === "function")
        cb({
          room: updatedChat._id,
          cust_id: updatedCus._id
        });
    });

    socket.on("save-message", async (params) => {
      params = typeof params === "string" ? JSON.parse(params) : params;
      const mess = {
        chatId: params.chatId,
        sender: params.sender,
        sendType: params.sendType,
        content: params.content,
        attachment: params.attachment,
        timestamp: params?.timestamp || new Date(),
        receiver: params.receiver,
        receiverType: params.receiverType
      }
      console.log(mess, "sadsdfsdffd");

      const receivers = await UserModel.find({ $or: [{ role: {$in:["Admin","Supervisor"]} },...params.receiver?{ _id: params.receiver }:{}] });
      receivers.forEach(receiver => {
        socketObj.io.to(receiver._id).emit("message", mess);
      })
      const newMessage = new MessageModel(mess)
      const final = await newMessage.save();
      const updatedChat = await ChatModel.findOneAndUpdate({ _id: params.chatId }, { latestMessages: final?._id }, { new: true });
      if (typeof cb === "function")
        cb({
          message: final,
        });
    });

    socket.on("get-messages", async (params, cb) => {
      params = typeof params === "string" ? JSON.parse(params) : params;
      const messages = await MessageModel.find({ chatId: params.chatId }).sort({ timestamp: 1 });
      console.log(messages, "messages");

      if (typeof cb === "function")
        cb({
          messages: messages,
        });
    })

    socket.on("send-message", async (params, cb) => {
      console.log(params, typeof params, "params");
      params = typeof params === "string" ? JSON.parse(params) : params;
      const mess = {
        chatId: params.chatId,
        sender: params.sender,
        sendType: "admin",
        content: params.content,
        attachment: params.attachment,
        timestamp: params?.timestamp || new Date(),
        receiver: params.receiver,
        receiverType: "user"
      }
      const receivers = await UserModel.find({ $or: [{ role: {$in:["Admin","Supervisor"]} },{ _id: {$in:[params.receiver,params.sender]} }] });
      console.log(receivers,"receivers")
      receivers.forEach(receiver => {
        socketObj.io.to(receiver._id?.toString()).emit("message", mess);
      })
      const newMessage = new MessageModel(mess)
      const final = await newMessage.save();
      const updatedChat = await ChatModel.findOneAndUpdate({ _id: params.chatId }, { latestMessages: final?._id }, { new: true });
      if (typeof cb === "function")
        cb({
          message: final,
        });
    })

    socket.on("transfer-chat", async (params, cb) => {
      const { chatId, department, adminId } = params;
      const chat = await ChatModel.findById(chatId);
      const oldAssignee = chat.adminId;
      if(adminId){
        chat.adminId = adminId;
        chat.isHuman = true;
        chat.save();
      }
      else{
        chat.adminId = null;
        const agents = await UserModel.find({ role: "Agent", department });
        chat.adminId = agents[0]?._id||"";
        chat.isHuman = true;
        chat.save();
      }
    })

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
      const newCustomers = await CustomerModel.create({
        name: params.name,
        email: params.email,
        phone: params.phone,
        notes: params.notes,
      });
      // const newCustomers = await customer.save();
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

module.exports = socketObj;
