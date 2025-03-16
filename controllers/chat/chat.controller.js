const dayjs = require("dayjs");
const s3 = require("../../helpers/s3.helper");
const Chat = require("../../models/chat.model");
const User = require("../../models/user.model");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../../utils/response");
const {
  sendWhatsAppMessage,
  sendInteractiveMessage,
  downloadMedia,
  markMessageAsRead,
  sendListMessage,
  sendWhatsAppMessageFromalMessage,
} = require("../../services/whatsaap.service");
const CustomerModel = require("../../models/customer.model");
const ChatModel = require("../../models/chat.model");
const {
  isDocumentRequest,
} = require("../../services/openai/tool/docProcessing");
const MessageModel = require("../../models/message.model");
const {
  isHumanChatRequest,
} = require("../../services/openai/tool/transferChat");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { PineconeStore } = require("@langchain/pinecone");
const { generateAIResponse } = require("../../services/openai/openai.service");
const UserModel = require("../../models/user.model");
const { Pinecone } = require("@pinecone-database/pinecone");
const environment = require("../../utils/environment");
const {
  sendMessageToAdmins,
  checkDepartmentAvailability,
  getAssigneeAgent,
  sendInterectiveMessageConfirmation,
} = require("../../utils/fn");
const pinecone = new Pinecone({ apiKey: environment.pinecone.apiKey });
const socketObj = require("../../helpers/socket.helper");
const DepartmentModel = require("../../models/department.model");
const {
  createThread,
  handleUserMessage,
} = require("../../services/openai/controller/threadsController");
const {
  isDeparmentChange,
} = require("../../services/openai/tool/deparmentChange");
const { unlinkSync } = require("fs");
const { deleteFileByPath } = require("../../helpers/files.helper");
const { startChat, continueChat } = require("../typebot/typeBot.controller");

const fetchDepartmentsAndPrompts = async () => {
  try {
    const departments = await DepartmentModel.find().lean();
    return departments;
  } catch (error) {
    console.error("Error fetching departments and prompts:", error.message);
    throw error;
  }
};
// Store chat message
const storeChat = async (req, res) => {
  try {
    const { userId, sender, content, department, messageType } = req.body;

    console.log(req.body);

    if (!userId || !sender || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let chat = await Chat.findOne({ userId });

    // Store the User reply in the database
    if (chat) {
      await Chat.updateOne(
        { _id: chat._id },
        {
          $push: {
            messages: {
              sender: sender,
              content: content,
              messageType: messageType,
            },
          },
        }
      );
    } else {
      const newChat = new Chat({
        userId: userId,
        department: department || "AI",
        isHandshakeRequested: false,
        isHuman: false,
      });
      await newChat.save();
    }

    res.status(200).json({ message: "Chat stored successfully", chat });
  } catch (error) {
    console.error("Error storing chat:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get chat history
const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const chat = await Chat.findOne({ userId });

    if (!chat) {
      return res.status(404).json({ error: "No chat history found" });
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error("Error fetching chat history:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateHandshakeStatus = async (req, res) => {
  try {
    const { userId, isHandshakeRequested } = req.body;
    const agentId = "67a4548fa0abc6f3aa736ae7"; // Fixed agent assignment

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Find chat by userId
    let chat = await Chat.findOne({ userId });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Update handshake status and assign agent
    chat.isHandshakeRequested = isHandshakeRequested;
    chat.agentId = agentId;

    // Log the transfer
    chat.transferLog.push({
      transferredBy: "system", // Can be admin or system
      transferredTo: agentId,
      transferFromDepartment: chat.department,
    });

    await chat.save();

    // Add chat ID to the assigned agent's `assignChats`
    await User.findByIdAndUpdate(
      agentId,
      { $addToSet: { assignChats: chat._id } }, // Avoid duplicate chat IDs
      { new: true }
    );

    // await Chat.updateOne({ userId }, { $set: { isHandshakeRequested } });
    // await Chat.findOneAndUpdate(
    //   { userId },
    //   { isHandshakeRequested },
    //   { new: true }
    // );

    res.json({ success: true, message: "Handshake status updated" });
  } catch (error) {
    console.error("Error updating handshake:", error.message);
    res.status(500).json({ error: "Failed to update handshake" });
  }
};

const updateIsHumanStatus = async (req, res) => {
  try {
    const { userId, isHuman } = req.body;
    console.log(req.body);

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    await Chat.findOneAndUpdate({ userId }, { isHuman }, { new: true });

    res.json({ success: true, message: "isHuman status updated" });
  } catch (error) {
    console.error("Error updating isHuman:", error.message);
    res.status(500).json({ error: "Failed to update isHuman" });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const file = req.files;
    console.log(req.files, "fileeee");
    // const finalURLs = []
    const finalURLS = await Promise.all(
      req.files.file.map(async (file) => {
        const uploadFile = file;
        const path = uploadFile.path;
        const npath = path.replaceAll("\\", "/");
        const month = `${dayjs().year()}-${dayjs().month() + 1}`;

        const url = s3.uploadPublic(
          npath,
          uploadFile?.mimetype,
          `${uploadFile?.filename}`,
          `ChatDocuments/${month}`
        );
        // console.log(npath, "npath");

        // unlinkSync("D:/Projects/MethaqChatbotBackend/methaq-aibot-api/public/images/file/2025-03/1741693745271-Diagram_1.pdf");
        return url;
      })
    );

    console.log(finalURLS); // This will contain an array of URLs

    res
      .status(200)
      .json({ url: finalURLS, message: "Document uploaded successfully" });
  } catch (error) {
    console.log(error.message);

    return res.status(500).json({ error: "Failed to upload document" });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { filePathToDelete } = req.body;
    const deletedDoc = await s3.deleteFiles([filePathToDelete]);
    console.log(deletedDoc, "deletedDoc");
    return res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete document" });
  }
};
const images = {};
const whatsappMessages = async (req, res) => {
  try {
    // Added async
    const { messages, metadata, contacts } =
      req.body.entry?.[0]?.changes?.[0].value ?? {};
    const displayPhoneNumber = metadata?.phone_number_id;
    const phoneNumberId = metadata?.display_phone_number;

    if (!messages) return res.status(400).send("No messages found"); // Added response for no messages

    const message = messages[0];
    const messInDB = await MessageModel.findOne({ wpId: message.id });
    if (messInDB) {
      return res.status(200).send("Message already processed");
    }
    const messageSender = message.from;
    const messageID = message.id;
    const messaging_product = "whatsaap";
    const profileName = contacts?.[0]?.profile?.name;

    const user = await CustomerModel.findOne({ phone: messageSender });

    if (!user) {
      const customer = new CustomerModel({
        name: profileName,
        phone: messageSender,
      });

      const updatedCus = await customer.save();

      if (!updatedCus._id) {
        throw new Error("Error while adding new user!");
      }
      // const threadId = await createThread();

      const startChatResponse = await startChat(
        "open-ai-assistant-chat-y5laof1",
        {
          text: message.text?.body,
        }
      );
      console.log("startChatResponse", startChatResponse.data);
      const sessionId = startChatResponse?.data?.sessionId; // Adjust based on actual response structure

      const chat = new ChatModel({
        customerId: updatedCus._id,
        sessionId: sessionId,
        // threadId: threadId,
        source: "whatsapp",
      });
      const newChat = await chat.save();
      console.log(chat, "new chatu");

      const mess2 = {
        chatId: newChat?._id?.toString(),
        wpId: message?.id,
        sender: newChat?.customerId?.toString(),
        receiver: null,
        sendType: "user",
        receiverType: "admin",
        content: message.text?.body,
      };
      sendMessageToAdmins(socketObj, mess2, newChat?.department);

      const departments = await fetchDepartmentsAndPrompts();
      //console.log(departments, "departments");

      // const interectiveMessageDetails = {
      //   options: departments,
      //   headerText: "Insurance Options",
      //   bodyText:
      //     "Hello! 👋 How can I assist you today with your insurance needs? Please select a department:",
      //   actionButtonText: "Select Department",
      //   actionSectionTitle: "Departments",
      // };
      const intmessage = {
        chatId: newChat._id,
        sender: null,
        receiver: updatedCus._id,
        sendType: "assistant",
        receiverType: "user",
        content:
          "Hello! 👋 How can I assist you today with your insurance needs? Please select a department:",
        messageType: "interective",
        messageOptions: departments?.map((department) => ({
          label: department.name,
          value: department._id,
        })),
      };

      // sendInteractiveMessage(
      //   messageSender,
      //   messageID,
      //   interectiveMessageDetails
      // );

      sendMessageToAdmins(socketObj, intmessage, null);
    } else {
      //console.log(message, "message for checking");

      let existingChat = await ChatModel.findOne({
        customerId: user?._id,
      }).populate("department");

      // let departmentThread =
      //   existingChat.threads[existingChat?.department?._id?.toString()];
      // console.log(
      //   departmentThread,
      //   existingChat?.department,
      //   "departmentThread"
      // );

      if (!existingChat) {
        return res.status(200).send("Message processed");
      }
      //console.log(existingChat, "existingChatexistingChat");

      if (message.type === "image" || message.type === "document") {
        const mediaID = message.image?.id || message.document?.id;
        console.log(mediaID, "mediaID123456");

        const downloadResult = await downloadMedia(mediaID, existingChat);

        const { url, filePath, fileType, file } = downloadResult?.data || {};

        // Send acknowledgment for each image received
        const acknowledgmentMess = {
          chatId: existingChat._id,
          sender: null,
          receiver: existingChat?.customerId?.toString(),
          sendType: "assistant",
          receiverType: "user",
          content:
            "Image received. We'll process it with any other images you've sent recently.",
        };
        sendMessageToAdmins(
          socketObj,
          acknowledgmentMess,
          existingChat?.department?._id
        );
        await sendWhatsAppMessage(
          messageSender,
          undefined,
          messageID,
          displayPhoneNumber,
          "Image received. We'll process it with any other images you've sent recently."
        );

        const mess1 = {
          chatId: existingChat._id,
          wpId: message?.id,
          sender: existingChat?.customerId?.toString(),
          receiver: existingChat?.adminId?.toString() || null,
          sendType: "user",
          receiverType: "admin",
          content: "",
          attachments: [url],
        };
        sendMessageToAdmins(socketObj, mess1, existingChat?.department?._id);

        // const isDepartmentSelected = await sendInterectiveMessageConfirmation(
        //   socketObj,
        //   existingChat,
        //   messageSender,
        //   messageID
        // );
        // if (!isDepartmentSelected) {
        //   return res.status(200).send("Message processed");
        // }

        const isAvailable = await checkDepartmentAvailability(
          socketObj,
          existingChat,
          messageSender
        );
        if (!isAvailable) {
          return res.status(200).send("Message processed");
        }

        // if (!images[departmentThread]) {
        //   images[departmentThread] = [];
        // }
        // images[departmentThread].push({
        //   mediaID,
        //   url,
        //   filePath,
        //   fileType,
        //   file,
        // });
        if (!images[existingChat._id]) {
          images[existingChat._id] = [];
        }
        images[existingChat._id].push({
          mediaID,
          url,
          filePath,
          fileType,
          file,
        });


        if (images[existingChat._id].length === 1) {
          // Set timer only when the first image is added
          setTimeout(async () => {

            const numImages = images[existingChat._id].length;
          
           // const numImages = images[departmentThread].length;
            // Send processing start notification
            const processingMess = {
              chatId: existingChat._id,
              sender: null,
              receiver: existingChat?.customerId?.toString(),
              sendType: "assistant",
              receiverType: "user",
              content: `Processing your ${numImages} image${
                numImages > 1 ? "s" : ""
              }.`,
            };
            sendMessageToAdmins(
              socketObj,
              processingMess,
              existingChat?.department?._id
            );
            await sendWhatsAppMessage(
              messageSender,
              undefined,
              messageID,
              displayPhoneNumber,
              `Processing your ${numImages} image${numImages > 1 ? "s" : ""}.`
            );
            const imageUrls = images[existingChat._id].map((imageObj) => imageObj.url);

            // const aiResponse = await handleUserMessage(
            //   departmentThread,
            //   null,
            //   existingChat?.department?.assistantDetails?.id,
            //   images[departmentThread],
            //   images[departmentThread]?.map((imageObj) => imageObj?.url),
            //   existingChat?.department?.prompt
            // );
            // images[departmentThread] = [];
            // console.log(aiResponse, "aiResponseaiResponse");
            // if (mediaID) {
            //   await markMessageAsRead(messageID);
            // }
            const aiResponse=await continueChat(existingChat.sessionId,"",imageUrls);
            const userInputmessage = aiResponse || "";
            const mess2 = {
              chatId: existingChat._id,
              sender: null,
              receiver: existingChat?.customerId?.toString(),
              sendType: "assistant",
              receiverType: "user",
              content: userInputmessage,
            };
            sendMessageToAdmins(
              socketObj,
              mess2,
              existingChat?.department?._id
            );
            await sendWhatsAppMessage(
              messageSender,
              undefined,
              messageID,
              displayPhoneNumber,
              userInputmessage
            );
          }, 5000);
        }
      } else if (message.type == "text") {
        const mess = {
          chatId: existingChat?._id,
          wpId: message?.id,
          sender: existingChat?.customerId?.toString(),
          receiver: null,
          sendType: "user",
          receiverType: "admin",
          content: message.text?.body,
        };
        console.log(mess, "message from userside");

        sendMessageToAdmins(socketObj, mess, existingChat?.department?._id);
        // const isDepartmentSelected = await sendInterectiveMessageConfirmation(
        //   socketObj,
        //   existingChat,
        //   messageSender,
        //   messageID
        // );
        // if (!isDepartmentSelected) {
        //   return res.status(200).send("Message processed");
        // }
        // const isDeparmentChangeVal = await isDeparmentChange(
        //   message.text?.body
        // );
        // console.log(isDeparmentChangeVal, "isDeparmentChangeVal");

        // if (isDeparmentChangeVal) {
        //   const message = {
        //     chatId: existingChat?._id?.toString(),
        //     sender: null,
        //     receiver: existingChat?.customerId?.toString(),
        //     sendType: "assistant",
        //     receiverType: "user",
        //     content: "Please select one of the options below:",
        //     messageType: "interective",
        //     messageOptions: [
        //       {
        //         label: "Yes",
        //         value: "yes_option",
        //       },
        //       {
        //         label: "No",
        //         value: "no_option",
        //       },
        //       {
        //         label: "Main-Menu", // New button title
        //         value: "main_menu_option",
        //       },
        //     ],
        //   };
        //   sendMessageToAdmins(socketObj, message, null);
        //   sendListMessage(messageSender, messageID);
        //   return res.status(200).send("Message processed");
        // }
        // const isAvailable = await checkDepartmentAvailability(
        //   socketObj,
        //   existingChat,
        //   messageSender
        // );
        // if (!isAvailable) {
        //   return res.status(200).send("Message processed");
        // }
        // const isHumantrasfer =
        //   existingChat?.isHuman === false
        //     ? await isHumanChatRequest(message.text?.body)
        //     : true;

        // const hhh = await isHumanChatRequest(message.text?.body);
        // console.log(hhh, "isHumantrasfer in function");
        // if (isHumantrasfer != existingChat?.isHuman) {
        //   const assigneeAgent = await getAssigneeAgent(
        //     existingChat?.department?._id,
        //     true
        //   );
        //   if (assigneeAgent) {
        //     console.log(assigneeAgent, "assigneeAgent");
        //     existingChat = await ChatModel.findOneAndUpdate(
        //       { _id: existingChat._id },
        //       { isHuman: isHumantrasfer, adminId: assigneeAgent?._id },
        //       { new: true }
        //     ).populate("department");
        //     const mess = {
        //       chatId: existingChat?._id,
        //       sender: null,
        //       receiver: existingChat?.customerId?.toString(),
        //       sendType: "assistant",
        //       receiverType: "user",
        //       messageType: "tooltip",
        //       content: `Chat is transferred to ${assigneeAgent?.fullName}`,
        //     };
        //     sendMessageToAdmins(socketObj, mess, existingChat?.department?._id);
        //     await sendWhatsAppMessage(
        //       messageSender,
        //       undefined,
        //       messageID,
        //       displayPhoneNumber,
        //       `We have transferred your chat to ${assigneeAgent?.fullName}`
        //     );

        //     return res.status(200).send("Message processed");
        //   } else {
        //     const mess = {
        //       chatId: existingChat?._id,
        //       sender: null,
        //       receiver: existingChat?.customerId?.toString(),
        //       sendType: "assistant",
        //       receiverType: "user",
        //       messageType: "text",
        //       content:
        //         existingChat?.department?.messages?.allAgentsOfflineResponse,
        //     };
        //     sendMessageToAdmins(socketObj, mess, existingChat?.department?._id);
        //     await sendWhatsAppMessage(
        //       messageSender,
        //       undefined,
        //       messageID,
        //       displayPhoneNumber,
        //       existingChat?.department?.messages?.allAgentsOfflineResponse
        //     );

        //     return res.status(200).send("Message processed");
        //   }
        // }
        if (!existingChat?.isHuman) {
          const userInput = message.text.body;
          const sessionId = existingChat?.sessionId; // Ensure sessionId is available
          const messageObj = {
            text: userInput,
            attachedFileUrls: [], // Add any file URLs if applicable
          };
          console.log(sessionId, "response typebot");
         const response = await continueChat(sessionId, userInput);
         // console.log(response, "response typebot");
         // const assistantMessage = response.data.messages[0]?.content?.richText[0]?.children[0]?.children[0]?.text;


          // const results = await vectorStore.similaritySearch(userInput, 5);

          //console.log(results, "resilrrfsgd");

          // const response = await handleUserMessage(
          //   departmentThread,
          //   userInput,
          //   existingChat?.department?.assistantDetails?.id,
          //   null,
          //   null,
          //   existingChat?.department?.prompt
          // );
          //console.log(assistantMessage, "messageSendermessageSender");
          const mess = {
            chatId: existingChat?._id,
            sender: null,
            sendType: "assistant",
            content: response,
            receiver: existingChat?.customerId?.toString(),
            receiverType: "user",
          };
          sendMessageToAdmins(socketObj, mess, existingChat?.department?._id);

          await sendWhatsAppMessage(
            messageSender,
            undefined,
            messageID,
            displayPhoneNumber,
            response
          );
        }
      } else if (message?.type === "interactive") {
        console.log(message, "message in interactive");
        const messageReplayType = message?.interactive?.type;

        if (messageReplayType === "button_reply") {
          const answer = message?.interactive?.button_reply?.id;
          console.log(answer, "answeransweransweransweranswer");

          if (["yes_option", "main_menu_option"].includes(answer)) {
            const isDepartmentSelected =
              await sendInterectiveMessageConfirmation(
                socketObj,
                existingChat,
                messageSender,
                messageID,
                true
              );
          }
          return res.status(200).send("Message processed");
        } else {
          const oldThreads = existingChat?.threads || {};
          if (!oldThreads[message?.interactive?.list_reply?.id]) {
            const threadId = await createThread();
            oldThreads[message?.interactive?.list_reply?.id] = threadId;
          }
          const answer = message?.interactive?.list_reply?.id;
          departmentThread = oldThreads[message?.interactive?.list_reply?.id];
          existingChat = await ChatModel.findOneAndUpdate(
            { _id: existingChat._id },
            { department: answer, threads: oldThreads },
            { new: true }
          ).populate("department");
          const mess1 = {
            chatId: existingChat?._id,
            wpId: message?.id,
            sender: existingChat?.customerId?.toString(),
            receiver: null,
            sendType: "user",
            receiverType: "assistant",
            messageType: "text",
            content: `${message?.interactive?.list_reply?.title}\n${
              message?.interactive?.list_reply?.description || ""
            }`,
          };
          sendMessageToAdmins(socketObj, mess1, existingChat?.department?._id);
          const mess2 = {
            chatId: existingChat?._id,
            sender: null,
            receiver: null,
            sendType: "assistant",
            receiverType: "admin",
            messageType: "tooltip",
            content: `Chat is transferred to ${message?.interactive?.list_reply?.title} department`,
          };
          sendMessageToAdmins(socketObj, mess2, existingChat?.department?._id);
          const isAvailable = await checkDepartmentAvailability(
            socketObj,
            existingChat,
            messageSender
          );
          console.log(isAvailable, "isAvailable in interactive");

          if (!isAvailable) {
            return res.status(200).send("Message processed");
          }

          if (!existingChat?.isHuman) {
            // const userInput = message?.interactive?.list_reply?.title;
            const userInput = "Hi, how you can help me today ?";

            const embeddings = new OpenAIEmbeddings({
              openAIApiKey: process.env.OPENAI_API_KEY,
            });
            const index = pinecone.Index(environment.pinecone.indexName);
            const vectorStore = await PineconeStore.fromExistingIndex(
              embeddings,
              {
                //@ts-ignore
                pineconeIndex: index,
              }
            );

            // const results = await vectorStore.similaritySearch(userInput, 5);
            const results = await vectorStore.similaritySearch(
              (query = userInput),
              (k = 5),
              (filter = {
                departmentName: { $eq: existingChat?.department?.name },
              }),
              (include_metadata = true)
            );
            //console.log(results, "resilrrfsgd");

            let context = results.map((r) => r.pageContent).join("\n\n");
            // const response = await generateAIResponse(
            //   context,
            //   userInput,
            //   existingChat
            // );
            const response = await handleUserMessage(
              departmentThread,
              userInput,
              existingChat?.department?.assistantDetails?.id,
              null,
              null,
              existingChat?.department?.prompt
            );
            console.log(response, "messageSendermessageSender");
            const mess = {
              chatId: existingChat?._id,
              sender: null,
              sendType: "assistant",
              content: response,
              receiver: existingChat?.customerId?.toString(),
              receiverType: "user",
            };
            sendMessageToAdmins(socketObj, mess, existingChat?.department?._id);
            await sendWhatsAppMessage(
              messageSender,
              undefined,
              messageID,
              displayPhoneNumber,
              response
            );
          }
        }
      } else if (
        message?.type === "video" ||
        message?.type === "location" ||
        message?.type === "contacts" ||
        message?.type === "unsupported"
      ) {
        const formalMessage =
          "We are sorry, but we cannot process this type of content.";
        await sendWhatsAppMessageFromalMessage(
          messageSender,
          messageID,
          formalMessage
        );
      }
    }

    return res.status(200).send("Message processed"); // Added response for successful processing
  } catch (error) {
    console.log(error.message);
    return res.status(500).send("Error processing message");
  }
};

module.exports = {
  storeChat,
  getChatHistory,
  updateHandshakeStatus,
  updateIsHumanStatus,
  uploadDocument,
  deleteDocument,
  whatsappMessages,
};
