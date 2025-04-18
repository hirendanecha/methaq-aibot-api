const { handleSocketEvents } = require("../controllers/socket.controller");
const ChatModel = require("../models/chat.model");
const CustomerModel = require("../models/customer.model");
const MessageModel = require("../models/message.model");
const UserModel = require("../models/user.model");
const {
  sendWhatsAppMessage,
  sendImageByUrl,
  sendDocumentByUrl,
  markMessageAsRead,
  sendTypingIndicator,
} = require("../services/whatsaap.service");
const environment = require("../utils/environment");
const jwt = require("jsonwebtoken");
const {
  getAssigneeAgent,
  sendMessageToAdmins,
  isImageType,
  sendMessageToUser,
} = require("../utils/fn");
const { default: mongoose } = require("mongoose");
const {
  startChat,
  continueChat,
} = require("../controllers/typebot/typeBot.controller");
const DepartmentModel = require("../models/department.model");
const dayjs = require("dayjs");

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

  // io.use((socket, next) => {
  //   try {
  //     const authHeader = socket.handshake.headers.authorization || '';
  //     const token = (authHeader && authHeader.split(' ')[1]);
  //     // console.log("auth token ==>> ", token, socket.handshake);
  //     if (!token) {
  //       console.log("Unauthorized Access via socket");
  //       const err = new Error("Unauthorized Access");
  //       return next(err);
  //     } else {
  //       let decoded = jwt.decode(token);
  //       jwt.verify(token, environment.jwt.secret, async (err, user) => {
  //         if (err) {
  //           console.log("Invalid or Expired Token in socket");
  //           const err = new Error("Invalid or Expired Token");
  //           return next(err);
  //         }
  //         socket.user = decoded;
  //         next();
  //       })
  //     }
  //   } catch (error) {
  //     console.log("Socket Conn Error ==> ", error?.message);
  //     const err = new Error("Invalid or Expired Token");
  //     return next(err);
  //   }
  // });

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

    socket.on("joinRoom", (params, cb) => {
      params = typeof params === "string" ? JSON.parse(params) : params;
      socket.join(params.cust_id);
      socket.join("allUsers");
      if (typeof cb === "function")
        cb({
          room: params.cust_id,
          message: "Room joined successfully",
        });
      logger.info("joinroom", {
        ...params,
      });
    });

    socket.on("joinChat", async (params, cb) => {
      const customer = new CustomerModel({
        isGuestUser: true,
      });
      const updatedCus = await customer.save();
      console.log("joinchat", updatedCus);
      // const chat = new ChatModel({
      //   customerId: updatedCus._id,
      // })

      const startChatResponse = await startChat("");

      const sessionId = startChatResponse?.response?.data?.sessionId;

      console.log(sessionId, "pp88");
      const secMess = await continueChat(sessionId, sessionId);
      const chat = new ChatModel({
        customerId: updatedCus._id,
        currentSessionId: sessionId,
        tags: ["pending"],
        // sessionId: sessionId,
        // threadId: threadId,
        source: "bot",
      });
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
          cust_id: updatedCus._id,
        });
    });
    socket.on("getchatdetails", async (params, cb) => {
      try {
        const { chatId } =
          typeof params === "string" ? JSON.parse(params) : params;
        const chat = await ChatModel.findById(chatId)
          .populate("adminId customerId")
          .lean();
        if (typeof cb === "function")
          cb({
            success: true,
            chat,
          });
      } catch (error) {
        console.log(error);
        if (typeof cb === "function")
          cb({
            success: false,
            message: error?.message,
          });
      }
    });
    socket.on("save-message", async (params) => {
      try {
        params = typeof params === "string" ? JSON.parse(params) : params;
        let chatDetails = await ChatModel.findById(params?.chatId);
        let sessionId = chatDetails?.currentSessionId;
        if (!sessionId) {
          const startChatResponse = await startChat("");
          sessionId = startChatResponse?.response?.data?.sessionId;
          const secMess = await continueChat(sessionId, sessionId);
          const updatedChat = await ChatModel.findOneAndUpdate(
            { _id: params?.chatId },
            { currentSessionId: sessionId },
            { new: true }
          );
        }
        const attachments =
          params?.attachments?.reduce((acc, curr) => acc.concat(curr), []) ||
          [];
        const mess = {
          chatId: params.chatId,
          sender: params.sender,
          sendType: params.sendType,
          content: params.content,
          attachments: attachments || [],
          receiver: params?.receiver || null,
          receiverType: params.receiverType,
        };

        await sendMessageToAdmins(socketObj, mess, chatDetails?.department);
        const userInput = params.content;
        if (params?.isInteractiveAnswer) {
          const answer = userInput?.split("-")[0];
          if (["1", "2", "3", "4", "5"].includes(answer)) {
            const departmentDetails = await DepartmentModel.findOne({
              depId: answer,
            });

            // departmentSession = existingChat?.currentSessionId;
            chatDetails = await ChatModel.findOneAndUpdate(
              { _id: chatDetails._id },
              {
                department: departmentDetails?._id,
                depId: departmentDetails?.depId,
              },
              { new: true }
            ).populate("department");
            // const mess1 = {
            //   chatId: chatDetails?._id,
            //   // wpId: message?.id,
            //   sender: chatDetails?.customerId?.toString(),
            //   receiver: null,
            //   sendType: "user",
            //   receiverType: "assistant",
            //   messageType: "text",
            //   content: `${userInput}`,
            // };
            // sendMessageToAdmins(socketObj, mess1, chatDetails?.department);
            const mess2 = {
              chatId: chatDetails?._id,
              sender: null,
              receiver: null,
              sendType: "assistant",
              receiverType: "admin",
              messageType: "tooltip",
              content: `Chat is transferred to ${userInput?.split("-")[1]
                } department`,
            };
            sendMessageToAdmins(socketObj, mess2, chatDetails?.department);
          }
        }

        //console.log(attachments, "params?.attachments");

        console.log(attachments, "attachments646364634");
        if (!chatDetails?.isHuman) {
          if (attachments && attachments.length > 0) {
            const response = await continueChat(sessionId, " ", attachments);
            if (response.interactiveMsg && response.interactivePayload) {
              if (response?.finaloutput) {
                const mess2 = {
                  chatId: chatDetails._id,
                  sender: null,
                  sendType: "assistant",
                  content: response.finaloutput,
                  attachments: [],
                  receiver: chatDetails?.customerId || null,
                  receiverType: "user",
                };
                // await sendMessageToUser(socketObj, mess2);
                // await sendMessageToAdmins(
                //   socketObj,
                //   mess2,
                //   chatDetails?.department
                // );

                const message = await sendMessageToAdmins(
                  socketObj,
                  mess2,
                  chatDetails?.department
                );
                await sendMessageToUser(socketObj, message);
              }

              const intmessage = {
                chatId: chatDetails._id,
                sender: null,
                receiver: chatDetails.customerId,
                sendType: "assistant",
                receiverType: "user",
                content: "Please select one of the following options:",
                messageType: "interective",
                messageOptions: response.interactivePayload?.options?.map(
                  (department) => ({
                    label: department.name,
                    value: department.depId,
                  })
                ),
              };
              // await sendMessageToUser(socketObj, intmessage);
              // await sendMessageToAdmins(
              //   socketObj,
              //   intmessage,
              //   chatDetails?.department
              // );

              const message = await sendMessageToAdmins(
                socketObj,
                intmessage,
                chatDetails?.department
              );
              await sendMessageToUser(socketObj, message);
            } else if (
              response?.interactiveListButton &&
              response?.interactiveListPayload
            ) {
              if (response?.finaloutput) {
                const mess2 = {
                  chatId: chatDetails._id,
                  sender: null,
                  sendType: "assistant",
                  content: response.finaloutput,
                  attachments: [],
                  receiver: chatDetails?.customerId || null,
                  receiverType: "user",
                };
                // await sendMessageToUser(socketObj, mess2);
                // await sendMessageToAdmins(
                //   socketObj,
                //   mess2,
                //   chatDetails?.department
                // );

                const message = await sendMessageToAdmins(
                  socketObj,
                  mess2,
                  chatDetails?.department
                );
                await sendMessageToUser(socketObj, message);
              }
              const intmessage = {
                chatId: chatDetails._id,
                sender: null,
                receiver: chatDetails.customerId?.toString(),
                sendType: "assistant",
                receiverType: "user",
                content: "Please select one of the following options:",
                messageType: "interective",
                messageOptions:
                  response?.interactiveListPayload?.action?.buttons?.map(
                    (btn) => ({
                      label: btn.reply.title,
                      value: btn.reply.id,
                    })
                  ),
              };
              // await sendMessageToUser(socketObj, intmessage);
              // await sendMessageToAdmins(
              //   socketObj,
              //   intmessage,
              //   chatDetails?.department
              // );

              const message = await sendMessageToAdmins(
                socketObj,
                intmessage,
                chatDetails?.department
              );
              await sendMessageToUser(socketObj, message);
            } else {
              const mess2 = {
                chatId: chatDetails._id,
                sender: null,
                sendType: "assistant",
                content: response?.finaloutput,
                attachments: [],
                receiver: chatDetails?.customerId || null,
                receiverType: "user",
              };
              // await sendMessageToUser(socketObj, mess2);
              // await sendMessageToAdmins(
              //   socketObj,
              //   mess2,
              //   chatDetails?.department
              // );

              const message = await sendMessageToAdmins(
                socketObj,
                mess2,
                chatDetails?.department
              );
              await sendMessageToUser(socketObj, message);
            }
          } else {
            const response = await continueChat(sessionId, userInput);

            if (response.interactiveMsg && response.interactivePayload) {
              if (response?.finaloutput) {
                const mess2 = {
                  chatId: chatDetails._id,
                  sender: null,
                  sendType: "assistant",
                  content: response.finaloutput,
                  attachments: [],
                  receiver: chatDetails?.customerId || null,
                  receiverType: "user",
                };
                // await sendMessageToAdmins(
                //   socketObj,
                //   mess2,
                //   chatDetails?.department
                // );
                // await sendMessageToUser(socketObj, mess2);

                const message = await sendMessageToAdmins(
                  socketObj,
                  mess2,
                  chatDetails?.department
                );
                await sendMessageToUser(socketObj, message);
              }

              const intmessage = {
                chatId: chatDetails._id,
                sender: null,
                receiver: chatDetails.customerId,
                sendType: "assistant",
                receiverType: "user",
                content: "Please select one of the following options:",
                messageType: "interective",
                messageOptions: response.interactivePayload?.options?.map(
                  (department) => ({
                    label: department.name,
                    value: department.depId,
                  })
                ),
              };
              // await sendMessageToAdmins(
              //   socketObj,
              //   intmessage,
              //   chatDetails?.department
              // );
              // await sendMessageToUser(socketObj, intmessage);

              const message = await sendMessageToAdmins(
                socketObj,
                intmessage,
                chatDetails?.department
              );
              await sendMessageToUser(socketObj, message);
            } else if (
              response?.interactiveListButton &&
              response?.interactiveListPayload
            ) {
              if (response?.finaloutput) {
                const mess2 = {
                  chatId: chatDetails._id,
                  sender: null,
                  sendType: "assistant",
                  content: response.finaloutput,
                  attachments: [],
                  receiver: chatDetails?.customerId || null,
                  receiverType: "user",
                };
                // await sendMessageToAdmins(
                //   socketObj,
                //   mess2,
                //   chatDetails?.department
                // );
                // await sendMessageToUser(socketObj, mess2);

                const message = await sendMessageToAdmins(
                  socketObj,
                  mess2,
                  chatDetails?.department
                );
                await sendMessageToUser(socketObj, message);
              }

              const intmessage = {
                chatId: chatDetails._id,
                sender: null,
                receiver: chatDetails.customerId?.toString(),
                sendType: "assistant",
                receiverType: "user",
                content: "Please select one of the following options:",
                messageType: "interective",
                messageOptions:
                  response?.interactiveListPayload?.action?.buttons?.map(
                    (btn) => ({
                      label: btn.reply.title,
                      value: btn.reply.id,
                    })
                  ),
              };
              // await sendMessageToAdmins(socketObj, intmessage, chatDetails?.department);
              // await sendMessageToUser(socketObj, intmessage);

              const message = await sendMessageToAdmins(
                socketObj,
                intmessage,
                chatDetails?.department
              );
              await sendMessageToUser(socketObj, message);
            } else {
              const mess2 = {
                chatId: chatDetails._id,
                sender: null,
                sendType: "assistant",
                content: response?.finaloutput,
                attachments: [],
                receiver: chatDetails?.customerId || null,
                receiverType: "user",
              };
              const message = await sendMessageToAdmins(
                socketObj,
                mess2,
                chatDetails?.department
              );
              await sendMessageToUser(socketObj, message);
            }
          }
        }

        // console.log(response.finaloutput, "finaloutput");
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

    socket.on("transfer-bot", async (params, cb) => {
      params = typeof params === "string" ? JSON.parse(params) : params;
      const chatDetails = await ChatModel.findById(params.chatId)
        .populate("customerId")
        .lean();
      console.log(chatDetails?.customerId, "chatDetails?.customerId");
      const mess = {
        chatId: chatDetails?._id,
        sender: null,
        sendType: "admin",
        content: "Chat is transferred to BOT",
        attachments: [],
        timestamp: new Date(),
        receiver: chatDetails?.customerId?._id?.toString(),
        receiverType: "user",
        messageType: "tooltip",
      };
      const newMessage = new MessageModel(mess);
      const final = await newMessage.save();
      const startChatResponse = await startChat("");
      const sessionId = startChatResponse?.response?.data?.sessionId;
      const firstMess = await continueChat(sessionId, sessionId);
      // const secMess = await continueChat(sessionId, message.text?.body);
      const updatedChat = await ChatModel.findOneAndUpdate(
        { _id: chatDetails?._id },
        {
          latestMessage: final?._id,
          isHuman: false,
          adminId: null,
          currentSessionId: sessionId,
          department: null,
        },
        { new: true }
      )
        .populate("adminId customerId")
        .lean();
      const receivers = await UserModel.find({
        $or: [
          { role: { $in: ["Admin", "Supervisor"] } },
          {
            _id: {
              $in: [
                chatDetails?.customerId?._id?.toString(),
                chatDetails?.adminId?.toString(),
              ],
            },
          },
          { department: chatDetails?.department?.toString() },
        ],
      });
      receivers.forEach((receiver) => {
        socketObj.io
          .to(receiver._id?.toString())
          .emit("update-chat", updatedChat);
        socketObj.io
          .to(receiver._id?.toString())
          .emit("message", { ...updatedChat, latestMessage: final });
      });
      if (typeof cb === "function")
        cb({
          success: true,
          message: "Chat transfered to bot",
        });
    });

    //ay transfer to main-menu
    socket.on("transfer-to-main-menu", async (params, cb) => {
      params = typeof params === "string" ? JSON.parse(params) : params;
      const chatDetails = await ChatModel.findById(params.chatId)
        .populate("customerId")
        .lean();
      console.log(chatDetails?.customerId, "chatDetails?.customerId");
      const mess = {
        chatId: chatDetails?._id,
        sender: null,
        sendType: "admin",
        content: "Chat is transferred to Main Menu",
        attachments: [],
        timestamp: new Date(),
        receiver: chatDetails?.customerId?._id?.toString(),
        receiverType: "user",
        messageType: "tooltip",
      };
      const newMessage = new MessageModel(mess);
      const final = await newMessage.save();
      const startChatResponse = await startChat("");
      const sessionId = startChatResponse?.response?.data?.sessionId;
      const firstMess = await continueChat(sessionId, sessionId);
      // const secMess = await continueChat(sessionId, message.text?.body);
      const updatedChat = await ChatModel.findOneAndUpdate(
        { _id: chatDetails?._id },
        {
          latestMessage: final?._id,
          isHuman: false,
          adminId: null,
          currentSessionId: sessionId,
          department: null,
        },
        { new: true }
      )
        .populate("adminId customerId")
        .lean();
      const receivers = await UserModel.find({
        $or: [
          { role: { $in: ["Admin", "Supervisor"] } },
          {
            _id: {
              $in: [
                chatDetails?.customerId?._id?.toString(),
                chatDetails?.adminId?.toString(),
              ],
            },
          },
          { department: chatDetails?.department?.toString() },
        ],
      });
      receivers.forEach((receiver) => {
        socketObj.io
          .to(receiver._id?.toString())
          .emit("update-chat", updatedChat);
        socketObj.io
          .to(receiver._id?.toString())
          .emit("message", { ...updatedChat, latestMessage: final });
      });
      if (typeof cb === "function")
        cb({
          success: true,
          message: "Chat transfered to Main Menu",
        });
    });

    //
    socket.on("get-messages", async (params, cb) => {
      params = typeof params === "string" ? JSON.parse(params) : params;
      const messages = await MessageModel.find({ chatId: params.chatId })
        .sort({ timestamp: -1 })
        .skip(params.offset)
        .limit(params.limit)
        .lean();
      console.log(messages, "messages");

      if (typeof cb === "function")
        cb({
          messages: messages,
        });
    });

    socket.on("send-message", async (params, cb) => {
      console.log(params, typeof params, socket.user, "params");

      params = typeof params === "string" ? JSON.parse(params) : params;
      const mess = {
        chatId: params.chatId,
        sender: params.sender,
        sendType: "admin",
        content: params.content,
        attachments: params.attachments,
        timestamp: params?.timestamp || new Date(),
        receiver: params.receiver || null,
        receiverType: "user",
      };

      const chatDetails = await ChatModel.findById(params.chatId)
        .populate("customerId")
        .lean();
      const receivers = await UserModel.find({
        $or: [
          { role: { $in: ["Admin", "Supervisor"] } },
          { _id: { $in: [params.receiver, params.sender] } },
        ],
      }).lean();
      const customers = await CustomerModel.find({
        _id: { $in: [params.receiver, params.sender] },
      }).lean();
      console.log(receivers, "receivers");
      const newMessage = new MessageModel(mess);
      const final = await newMessage.save();
      console.log(chatDetails?.adminId, "chatDetails?.adminId");
      if (!chatDetails?.adminId) {
        const authHeader = socket.handshake.headers.authorization || "";
        const token = authHeader && authHeader.split(" ")[1];
        let decoded = jwt.decode(token);
        console.log(authHeader, "authHeaderauthHeader");

        const adminDetails = await UserModel.findById(decoded?._id).lean();
        console.log(decoded, "decodeddecoded");
        const mess = {
          chatId: params.chatId,
          sender: null,
          sendType: "admin",
          content: `Chat is now assigned to ${adminDetails?.fullName}`,
          attachments: [],
          timestamp: new Date(),
          receiver: chatDetails?.customerId?._id?.toString(),
          receiverType: "user",
          messageType: "tooltip",
        };
        const newMessage = new MessageModel(mess);
        const tooltipMess = await newMessage.save();
        console.log(
          +chatDetails?.initialHandlingTime ||
          dayjs().diff(chatDetails?.agentTransferedAt, "minute"),
          chatDetails?.agentTransferedAt,
          "chatDetails?.initialHandlingTime"
        );
        const updatedChat = await ChatModel.findOneAndUpdate(
          { _id: params.chatId },
          {
            latestMessage: tooltipMess?._id,
            adminId: decoded?._id,
            isHuman: true,
            agentTransferedAt: chatDetails?.agentTransferedAt || dayjs(),
            agentHandledAt: chatDetails?.agentHandledAt || dayjs(),
            initialHandlingTime:
              +chatDetails?.initialHandlingTime ||
              dayjs().diff(chatDetails?.agentTransferedAt || dayjs(), "minute"),
          },
          { new: true }
        )
          .populate("adminId customerId")
          .lean();
        console.log(updatedChat, "updatedChatupdatedChat");

        [...receivers, ...customers].forEach((receiver) => {
          socketObj.io
            .to(receiver._id?.toString())
            .emit("message", { ...updatedChat, latestMessage: final });
          socketObj.io
            .to(receiver._id?.toString())
            .emit("message", { ...updatedChat, latestMessage: tooltipMess });
        });

        if (chatDetails?.source === "whatsapp") {
          if (final?.attachments?.length > 0) {
            final?.attachments?.map(async (attachment) => {
              if (isImageType(attachment)) {
                await sendImageByUrl(
                  updatedChat?.customerId?.phone,
                  undefined,
                  undefined,
                  attachment
                );
              } else {
                await sendDocumentByUrl(
                  updatedChat?.customerId?.phone,
                  undefined,
                  undefined,
                  attachment
                );
              }
            });
          } else {
            sendWhatsAppMessage(
              updatedChat?.customerId?.phone,
              undefined,
              undefined,
              undefined,
              final?.content,
              updatedChat?.isHuman
            );
          }
        }
      } else {
        const updatedChat = await ChatModel.findOneAndUpdate(
          { _id: params.chatId },
          { latestMessage: final?._id },
          { new: true }
        )
          .populate("adminId customerId")
          .lean();

        [...receivers, ...customers].forEach((receiver) => {
          socketObj.io
            .to(receiver._id?.toString())
            .emit("message", { ...updatedChat, latestMessage: final });
        });

        if (updatedChat?.source === "whatsapp") {
          console.log(
            "zvdgsdfsdf",
            final?.content,
            chatDetails?.customerId?.phone
          );
          if (final?.attachments?.length > 0) {
            final?.attachments?.map(async (attachment) => {
              if (isImageType(attachment)) {
                await sendImageByUrl(
                  updatedChat?.customerId?.phone,
                  undefined,
                  undefined,
                  attachment
                );
              } else {
                await sendDocumentByUrl(
                  updatedChat?.customerId?.phone,
                  undefined,
                  undefined,
                  attachment
                );
              }
            });
          } else {
            console.log(final?.content, "final?.content12232");
            sendWhatsAppMessage(
              updatedChat?.customerId?.phone,
              undefined,
              undefined,
              undefined,
              final?.content,
              updatedChat?.isHuman
            );
          }
        }
      }

      if (typeof cb === "function")
        cb({
          chat: { ...updatedChat, latestMessage: final },
        });
    });

    socket.on("transfer-chat", async (params, cb) => {
      const { chatId, department, adminId } =
        typeof params === "string" ? JSON.parse(params) : params;
      const chat = await ChatModel.findById(chatId);
      console.log(chat);
      if (!chat) {
        cb({
          success: false,
          message: "Entr Valid chat",
        });
        return;
      }
      const oldAssignee = chat.adminId;
      const oldDepartment = chat.department;
      if (adminId) {
        const adminDetails = await UserModel.findById(adminId).lean();
        const chatDetails = await ChatModel.findOne({ _id: chatId }).lean();
        const mess = {
          chatId: chatId,
          sender: null,
          sendType: "admin",
          content: `Chat is now assigned to ${adminDetails?.fullName}`,
          attachments: [],
          timestamp: new Date(),
          receiver: chatDetails?.customerId?.toString(),
          receiverType: "user",
          messageType: "tooltip",
        };
        const newMessage = new MessageModel(mess);
        const final = await newMessage.save();
        const updatedChat = await ChatModel.findOneAndUpdate(
          { _id: chatId },
          {
            adminId: adminId,
            department: department,
            isHuman: true,
            latestMessage: final?._id,
          },
          { new: true }
        )
          .populate("adminId customerId")
          .lean();
        const users = [adminId];
        const departments = [updatedChat?.department?.toString()];
        if (oldAssignee) users.push(oldAssignee?.toString());
        if (oldDepartment) departments.push(oldDepartment?.toString());
        const receivers = await UserModel.find({
          $or: [
            { role: { $in: ["Admin", "Supervisor"] } },
            { _id: { $in: users } },
            { department: { $in: departments } },
          ],
        });
        receivers.forEach((receiver) => {
          socketObj.io
            .to(receiver._id?.toString())
            .emit("update-chat", updatedChat);
          receiver?.department?.toString() === updatedChat?.department?.toString() && socketObj.io
            .to(receiver._id?.toString())
            .emit("message", { ...updatedChat, latestMessage: final });
        });
      } else {
        chat.adminId = null;
        const agents = await UserModel.find({ role: "Agent", department });
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
            receiverType: "user",
          };
          const newMessage = new MessageModel(mess);
          const final = await newMessage.save();
          const updatedChat = await ChatModel.findOneAndUpdate(
            { _id: chatId },
            { latestMessage: final?._id },
            { new: true }
          )
            .populate("adminId customerId")
            .lean();
          const receivers = await UserModel.find({
            $or: [
              { role: { $in: ["Admin", "Supervisor"] } },
              { department: chatDetails?.department?.toString() },
            ],
          }).lean();
          console.log(chatDetails?.customerId, "finalfinalfinalfinal");
          [...receivers, chatDetails?.customerId].forEach((receiver) => {
            socketObj.io
              .to(receiver._id?.toString())
              .emit("message", { ...updatedChat, latestMessage: final });
          });
          if (typeof cb === "function") {
            return cb({
              success: false,
              message: "No Agent is now available",
            });
          }
        } else {
          const assigneeAgent = await getAssigneeAgent(
            new mongoose.Types.ObjectId(department)
          );
          console.log(assigneeAgent, department, "assigneeAgentsdfsdfsdfg");

          const updatedChat = await ChatModel.findByIdAndUpdate(
            chatId,
            {
              adminId: assigneeAgent?._id,
              department: department,
              agentTransferedAt: assigneeAgent ? new Date() : null,
              isHuman: true,
            },
            { new: true }
          )
            ?.populate("adminId customerId")
            .lean();
          // console.log(updatedChat, "updatedChatupdatedChat");

          const mess = {
            chatId: chatId,
            sender: null,
            sendType: "assistant",
            content: `Chat is now assigned to ${updatedChat?.adminId?.fullName}`,
            receiver: chatDetails?.customerId?._id?.toString(),
            receiverType: "user",
            messageType: "tooltip",
          };
          await sendMessageToAdmins(
            socketObj,
            mess,
            updatedChat?.department,
            [{ _id: { $in: [oldAssignee] } }],
            true,
            false
          );
          if (typeof cb === "function")
            cb({
              success: true,
              message: "Agent is now assigned",
              agentId: assigneeAgent?._id,
            });
        }
      }
    });

    socket.on("activity", (params, cb) => {
      async function updateOnlineStatus(isOnline) {
        const updateIsOnline = await UserModel.findOneAndUpdate(
          {
            _id: params.room,
          },
          {
            isOnline: isOnline,
          },
          {
            new: true,
          }
        );
      }
      console.log(agents, "agentsss");

      if (agents[socket.id]) {
        clearTimeout(agents[socket.id].idleTimer);
        updateOnlineStatus(true);
      }

      // Reset idle timer
      agents[socket.id] = {
        idleTimer: setTimeout(() => {
          agents[socket.id].isIdle = true;
          updateOnlineStatus(false);
          socket.emit("idle", "You are idle. Click here to be active again.");
        }, 10 * 60 * 1000), // 10 minutes
        isIdle: false,
      };
      console.log(agents, "ahenenehj");
    });

    socket.on("active", () => {
      if (agents[socket.id]) {
        clearTimeout(agents[socket.id].idleTimer);
        agents[socket.id].isIdle = false;

        // Reset idle timer
        agents[socket.id].idleTimer = setTimeout(() => {
          agents[socket.id].isIdle = true;
          socket.emit("idle", "You are idle. Click here to be active again.");
        }, 10 * 60 * 1000); // 10 minutes
      }
    });

    socket.on("seen-messages", async (params) => {
      const { chatId } =
        typeof params === "string" ? JSON.parse(params) : params;

      const chatDetails = await ChatModel.findOne({ _id: chatId })
        .populate("latestMessage")
        .lean();
      console.log(
        chatDetails?.latestMessage?.wpId,
        "chatDetails?.latestMessage"
      );

      if (chatDetails?.latestMessage?.wpId) {
        await markMessageAsRead(chatDetails?.latestMessage?.wpId);
      }
      const updateMessages = await MessageModel.updateMany(
        { chatId: chatId },
        { isSeen: true }
      );
      const UnReadCounts = await ChatModel.aggregate([
        {
          $lookup: {
            from: "messages",
            localField: "latestMessage",
            foreignField: "_id",
            as: "latestMessage",
          },
        },
        {
          $match: {
            "latestMessage.isSeen": false,
          },
        },
        {
          $group: {
            _id: null,
            totalUnread: { $sum: 1 },
          },
        },
      ]);
      const receivers = await UserModel.find({
        $or: [
          { role: { $in: ["Admin", "Supervisor"] } },
          { department: chatDetails?.department?.toString() },
        ],
      }).lean();
      [...receivers, chatDetails?.customerId].forEach((receiver) => {
        socketObj.io
          .to(receiver._id?.toString())
          .emit("unread-count", { counts: UnReadCounts[0]?.totalUnread || 0, chatId: chatId, isSeen: true });
      });

      if (typeof cb === "function")
        cb({
          message: "Chat messages seen",
        });
    });

    socket.on("archive-chat", async (params, cb) => {
      try {
        const authHeader = socket.handshake.headers.authorization || "";
        const token = authHeader && authHeader.split(" ")[1];
        let decoded = jwt.decode(token);
        const adminDetails = await UserModel.findById(decoded?._id).lean();
        const { chatId } =
          typeof params === "string" ? JSON.parse(params) : params;
        const chat = await ChatModel.findById(chatId)
          .populate("adminId department")
          .lean();
        console.log(chatId, chat, "desdgsfdg");

        if (!chat) {
          if (typeof cb === "function")
            return cb({
              success: false,
              message: "Chat not found",
            });
        }

        const mess = {
          chatId: chatId,
          sender: null,
          sendType: "admin",
          content:
            chat?.department?.messages?.chatClosingMessage ||
            `This conversation has ended, thank you for contacting Methaq Takaful Insuance ${chat?.department?.name ? chat?.department?.name : ""
            }. We hope we were able to serve you`,
          attachments: [],
          timestamp: new Date(),
          receiver: chat?.customerId?.toString(),
          receiverType: "user",
          messageType: "tooltip",
        };
        const newMessage = new MessageModel(mess);
        const final = await newMessage.save();
        const updatedChat = await ChatModel.findOneAndUpdate(
          { _id: chatId },
          {
            latestMessage: final?._id,
            adminId: null,
            isHuman: false,
            status: "archived",
            department: null,
            currentSessionId: null,
            depId: "",
            sessionIds: {},
          },
          { new: true }
        )
          ?.populate("adminId customerId")
          .lean();
        const receivers = await UserModel.find({
          $or: [
            { role: { $in: ["Admin", "Supervisor"] } },
            { department: chat?.department?._id?.toString() },
            { _id: { $in: [chat?.customerId?.toString()] } },
          ],
        });
        receivers.forEach((receiver) => {
          socketObj.io
            .to(receiver._id?.toString())
            .emit("delete-chat", updatedChat);
          socketObj.io
            .to(receiver._id?.toString())
            .emit("message", { ...updatedChat, latestMessage: final });
        });
        if (updatedChat?.source === "whatsapp") {
          console.log("zvdgsdfsdf", final?.content, chat?.customerId?.phone);
          sendWhatsAppMessage(
            updatedChat?.customerId?.phone,
            undefined,
            undefined,
            undefined,
            chat?.department?.messages?.chatClosingMessage ||
            `This conversation has ended, thank you for contacting Methaq Takaful Insuance ${chat?.department?.name ? chat?.department?.name : ""
            }. We hope we were able to serve you`,
            updatedChat?.isHuman
          );
        }
        if (typeof cb === "function")
          cb({
            message: "Chat archived successfully.",
          });
      } catch (error) {
        console.error("Error archiving chat:", error);
        if (typeof cb === "function")
          cb({
            message: error.message,
          });
      }
    });

    socket.on("unarchive-chat", async (params, cb) => {
      try {
        const { chatId } =
          typeof params === "string" ? JSON.parse(params) : params;
        const chat = await ChatModel.findById(chatId);
        console.log(chat, "chatchatchatchat");

        if (!chat) {
          if (typeof cb === "function")
            return cb({
              success: false,
              message: "Chat not found",
            });
        }
        const authHeader = socket.handshake.headers.authorization || "";
        const token = authHeader && authHeader.split(" ")[1];
        let decoded = jwt.decode(token);
        const adminDetails = await UserModel.findById(decoded?._id).lean();
        chat.status = "active";
        const updatedChat = await chat.save();
        const mess = {
          chatId: chatId,
          sender: null,
          sendType: "admin",
          content: `Chat unarchived by ${adminDetails?.fullName || ""}`,
          receiver: chat?.customerId?.toString(),
          receiverType: "user",
          messageType: "tooltip",
        };
        await sendMessageToAdmins(socketObj, mess, chat?.department);

        if (typeof cb === "function")
          cb({
            message: "Chat is successfully unarchived",
          });
      } catch (error) {
        console.error("Error archiving chat:", error);
        if (typeof cb === "function")
          cb({
            message: error.message,
          });
      }
    });

    socket.on("open-chat", async (params, cb) => {
      try {
        const authHeader = socket.handshake.headers.authorization || "";
        const token = authHeader && authHeader.split(" ")[1];
        let decoded = jwt.decode(token);
        const { chatId } =
          typeof params === "string" ? JSON.parse(params) : params;

        socketObj.io.to("allUsers").emit("status", {
          chatId: chatId,
          userId: decoded?._id,
          status: "open"
        })
      } catch (error) {
        console.error("Error archiving chat:", error);
        if (typeof cb === "function")
          cb({
            message: error.message,
          })
      }
    })

    socket.on("close-chat", async (params, cb) => {
      try {
        const authHeader = socket.handshake.headers.authorization || "";
        const token = authHeader && authHeader.split(" ")[1];
        let decoded = jwt.decode(token);
        const { chatId } =
          typeof params === "string" ? JSON.parse(params) : params;

        socketObj.io.to("allUsers").emit("status", {
          chatId: chatId,
          userId: decoded?._id,
          status: "close"
        })
      } catch (error) {
        console.error("Error archiving chat:", error);
        if (typeof cb === "function")
          cb({
            message: error.message,
          })
      }
    })

    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
      logger.info("disconnected", {
        id: socket.id,
        method: "disconnect",
      });
    });
    socket.on("typeing-whatsapp", async (params, cb) => {
      try {
        const { wpId } =
          typeof params === "string" ? JSON.parse(params) : params;

        if (!wpId) {
          throw new Error(
            "Missing required parameters: messageId"
          );
        }

        // Call the sendTypingIndicator function
        await sendTypingIndicator(" ", wpId);

        if (typeof cb === "function") {
          cb({
            success: true,
            message: "Typing indicator sent successfully",
          });
        }
      } catch (error) {
        console.error(
          "Error in sendTypingIndicator socket event:",
          error.message
        );
        if (typeof cb === "function") {
          cb({
            success: false,
            message: error.message,
          });
        }
      }
    });
  });
};

module.exports = socketObj;
