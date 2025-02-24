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
      try {
        params = typeof params === "string" ? JSON.parse(params) : params;
        const mess = {
          chatId: params.chatId,
          sender: params.sender,
          sendType: params.sendType,
          content: params.content,
          attachments: params.attachments,
          timestamp: params?.timestamp || new Date(),
          receiver: params.receiver || null,
          receiverType: params.receiverType
        }
        console.log(mess, "sadsdfsdffd");

        const receivers = await UserModel.find({ $or: [{ role: { $in: ["Admin", "Supervisor"] } }, params.receiver ? { _id: params.receiver } : {}] });
        const newMessage = new MessageModel(mess)
        const final = await newMessage.save();
        const updatedChat = await ChatModel.findOneAndUpdate({ _id: params.chatId }, { latestMessage: final?._id }, { new: true }).lean();
        console.log(updatedChat, params.chatId, "updatedChatupdatedChat");

        receivers.forEach(receiver => {
          socketObj.io.to(receiver._id?.toString()).emit("message", { ...updatedChat, latestMessage: final });
        })
        if (typeof cb === "function")
          cb({
            success: true,
            message: final,
          });
      } catch (error) {
        console.log(error, "errorerrorerror");

        if (typeof cb === "function")
          cb({
            success: false,
            message: error?.message,
          });
      }
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
        attachments: params.attachments,
        timestamp: params?.timestamp || new Date(),
        receiver: params.receiver || null,
        receiverType: "user"
      }
      const receivers = await UserModel.find({ $or: [{ role: { $in: ["Admin", "Supervisor"] } }, { _id: { $in: [params.receiver, params.sender] } }] }).lean();
      const customers = await CustomerModel.find({ _id: { $in: [params.receiver, params.sender] } }).lean();
      console.log(receivers, "receivers")
      const newMessage = new MessageModel(mess)
      const final = await newMessage.save();
      console.log(final, "finalfinal");
      const updatedChat = await ChatModel.findOneAndUpdate({ _id: params.chatId }, { latestMessage: final?._id }, { new: true }).lean();
      console.log(params.chatId, { ...updatedChat, latestMessage: final }, "updatedChatupdatedChat");
      console.log(updatedChat, "updatedChat");
      [...receivers, ...customers].forEach(receiver => {
        socketObj.io.to(receiver._id?.toString()).emit("message", { ...updatedChat, latestMessage: final });
      })
      if (typeof cb === "function")
        cb({
          chat: { ...updatedChat, latestMessage: final },
        });
    })

    socket.on("transfer-chat", async (params, cb) => {
      const { chatId, department, adminId } = typeof params === "string" ? JSON.parse(params) : params;
      const chat = await ChatModel.findById(chatId);
      const oldAssignee = chat.adminId;
      if (adminId) {
        chat.adminId = adminId;
        chat.isHuman = true;
        const updatedChat = await chat.save();
        const receivers = await UserModel.find({ $or: [{ role: { $in: ["Admin", "Supervisor"] } }, { _id: { $in: [adminId, oldAssignee] } }] });
        receivers.forEach(receiver => {
          socketObj.io.to(receiver._id?.toString()).emit("update-chat", updatedChat);
        })
      }
      else {
        chat.adminId = null;
        const agents = await UserModel.find({ role: "Agent", department, isOnline: true });
        const chatDetails = await ChatModel.findOne({ _id: chatId }).lean();
        console.log(chatDetails, agents, "chatDetailschatDetails");

        if (!(agents.length > 0)) {
          const mess = {
            chatId: chatId,
            sender: null,
            sendType: "admin",
            content: "No Agent is now available",
            attachments: [],
            timestamp: new Date(),
            receiver: chatDetails?.customerId?.toString(),
            receiverType: "user"
          }
          const newMessage = new MessageModel(mess)
          const final = await newMessage.save();
          const updatedChat = await ChatModel.findOneAndUpdate({ _id: chatId }, { latestMessage: final?._id }, { new: true }).lean();
          const receivers = await UserModel.find({ $or: [{ role: { $in: ["Admin", "Supervisor"] } }] }).lean();
          console.log(chatDetails?.customerId, "finalfinalfinalfinal");
          [...receivers, chatDetails?.customerId].forEach(receiver => {
            socketObj.io.to(receiver._id?.toString()).emit("message", { ...updatedChat, latestMessage: final });
          })
          if (typeof cb === "function") {
            return cb({
              success: false,
              message: "No Agent is now available"
            });
          }
        }
        else {
          const assignedChats = await ChatModel?.find({ adminId: { $in: agents?.map((agent) => agent?._id) } })
          const assignedChatCounts = {};
          assignedChats?.map((chat) => {
            assignedChatCounts[chat?.adminId?.toString()] = (assignedChatCounts[chat?.adminId?.toString()] || 0) + 1;
          })
          console.log(assignedChats, assignedChatCounts, "dgfdgfdg");

          let finalAgent = "";
          Object.keys(assignedChatCounts)?.map((chat) => {
            if (!finalAgent) {
              finalAgent = chat;
            }
            if (finalAgent === chat) {
              if (assignedChatCounts[chat] > assignedChatCounts[finalAgent]) {
                finalAgent = chat
              }
            }
          })
          console.log(finalAgent, "finalAgent");

          chat.adminId = finalAgent || "";
          chat.isHuman = true;
          const updatedChat = await chat.save();
          const receivers = await UserModel.find({ $or: [{ role: { $in: ["Admin", "Supervisor"] } }, { _id: { $in: [adminId, oldAssignee] } }] });
          receivers.forEach(receiver => {
            socketObj.io.to(receiver._id?.toString()).emit("update-chat", updatedChat);
          })
          if (typeof cb === "function")
            cb({
              success: true,
              message: "Agent is now assigned",
              agentId: agents[0]?._id
            });
        }
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

    socket.on("seen-messages", async (params) => {
      const { chatId } = typeof params === "string" ? JSON.parse(params) : params;
      const updateMessages = await MessageModel.updateMany({ chatId: chatId }, { isSeen: true })
      if (typeof cb === "function")
        cb({
          message: "Chat messages seen"
        });
    })



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
