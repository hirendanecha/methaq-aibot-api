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
  fetchDepartmentsAndPrompts,
  sendMessageToAdmins,
  checkDepartmentAvailability,
  getAssigneeAgent,
} = require("../../utils/fn");
const pinecone = new Pinecone({ apiKey: environment.pinecone.apiKey });
const socketObj = require("../../helpers/socket.helper");
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
    console.error("Error storing chat:", error);
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
    console.error("Error fetching chat history:", error);
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
    const uploadFile = req.files.file[0];
    const path = uploadFile.path;
    const npath = path.replaceAll("\\", "/");
    const month = `${dayjs().year()}-${dayjs().month() + 1}`;
    const url = await s3.uploadPublic(
      npath,
      `${uploadFile?.filename}`,
      `ChatDocuments/${month}`
    );
    res
      .status(200)
      .json({ url: url, message: "Document uploaded successfully" });
  } catch (error) {
    console.log(error);

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

const whatsappMessages = async (req, res) => {
  try {
    // Added async
    const { messages, metadata, contacts } =
      req.body.entry?.[0]?.changes?.[0].value ?? {};
    const displayPhoneNumber = metadata?.phone_number_id;
    const phoneNumberId = metadata?.display_phone_number;

    if (!messages) return res.status(400).send("No messages found"); // Added response for no messages

    const message = messages[0];
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

      const chat = new ChatModel({
        customerId: updatedCus._id,
        source: "whatsapp",
      });
      const newChat = await chat.save();
      console.log(chat, "new chatu");

      const departments = await fetchDepartmentsAndPrompts();
      console.log(departments, "departments");

      const interectiveMessageDetails = {
        options: departments,
        headerText: "Insurance Options",
        bodyText:
          "Hello! 👋 How can I assist you today with your insurance needs? Please select a department:",
        actionButtonText: "Select Department",
        actionSectionTitle: "Departments",
      };
      const message = {
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

      sendInteractiveMessage(
        messageSender,
        messageID,
        interectiveMessageDetails
      );

      sendMessageToAdmins(message, null);
    } else {
      console.log(message,"message for checking");
      
      let existingChat = await ChatModel.findOne({
        customerId: user?._id,
      }).populate("department");
      if (!existingChat) {
        return;
      }

      console.log(
        existingChat?.department?.workingHours?.startTime,
        "existingChatexistingChat"
      );

      if (message.type === "image" || message.type === "document") {
        const mediaID = message.image?.id || message.document?.id; // Get the media ID from the message
        const downloadResult = await downloadMedia(mediaID);
        const { url, extractedText } = downloadResult.data;
        const mess1 = {
          chatId: existingChat._id,
          sender: existingChat?.customerId?.toString(),
          receiver: existingChat?.adminId?.toString() || null,
          sendType: "user",
          receiverType: "admin",
          content: "",
          attachments: [url],
        };
        sendMessageToAdmins(mess1, existingChat?.department?._id);
        const isAvailable = await checkDepartmentAvailability(
          existingChat,messageSender
        );
        if (!isAvailable) {
          return;
        }
        if (mediaID) {
          await markMessageAsRead(messageID);
        }
        const userInputmessage = await isDocumentRequest(extractedText);
        const mess2 = {
          chatId: existingChat._id,
          sender: null,
          receiver: existingChat?.customerId?.toString(),
          sendType: "assistant",
          receiverType: "user",
          content: userInputmessage,
        };
        sendMessageToAdmins(mess2, existingChat?.department?._id);
        await sendWhatsAppMessage(
          messageSender,
          undefined,
          messageID,
          displayPhoneNumber,
          userInputmessage
        );
      } else if (message.type == "text") {
        const mess = {
          chatId: existingChat?._id,
          sender: existingChat?.customerId?.toString(),
          receiver: null,
          sendType: "user",
          receiverType: "admin",
          content: message.text?.body,
        };
        console.log(mess,"message from userside");
        
        sendMessageToAdmins(mess, existingChat?.department?._id);
        const isAvailable = await checkDepartmentAvailability(
          existingChat,messageSender
        );
        if (!isAvailable) {
          return;
        }
        const isHumantrasfer =
          existingChat?.isHuman === false
            ? await isHumanChatRequest(message.text?.body)
            : true;
        console.log(isHumantrasfer, "isHumantrasfer in function");
        if (isHumantrasfer != existingChat?.isHuman) {
          const assigneeAgent = await getAssigneeAgent(
            existingChat?.department?._id
          );
          console.log(assigneeAgent, "assigneeAgent");
          existingChat = await ChatModel.findOneAndUpdate(
            { _id: existingChat._id },
            { isHuman: isHumantrasfer, adminId: assigneeAgent?._id },
            { new: true }
          ).populate("department");
          const mess = {
            chatId: existingChat?._id,
            sender: null,
            receiver: existingChat?.customerId?.toString(),
            sendType: "assistant",
            receiverType: "user",
            messageType: "tooltip",
            content: `Chat is transferred to ${assigneeAgent?.fullName}`,
          };
          sendMessageToAdmins(mess, existingChat?.department?._id);
        }
        if (!existingChat?.isHuman) {
          const userInput = message.text.body;

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

          const results = await vectorStore.similaritySearch(userInput, 5);
          let context = results.map((r) => r.pageContent).join("\n\n");
          const response = await generateAIResponse(
            context,
            userInput,
            existingChat
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
          sendMessageToAdmins(mess, existingChat?.department?._id);
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
        
        const department = message?.interactive?.list_reply?.id;
        existingChat = await ChatModel.findOneAndUpdate(
          { _id: existingChat._id },
          { department },
          { new: true }
        ).populate("department");
        const mess1 = {
          chatId: existingChat?._id,
          sender: existingChat?.customerId?.toString(),
          receiver: null,
          sendType: "user",
          receiverType: "assistant",
          messageType: "text",
          content: `${message?.interactive?.list_reply?.title}\n${message?.interactive?.list_reply?.description}`,
        };
        sendMessageToAdmins(mess1, existingChat?.department?._id);
        const mess2 = {
          chatId: existingChat?._id,
          sender: null,
          receiver: null,
          sendType: "assistant",
          receiverType: "admin",
          messageType: "tooltip",
          content: `Chat is transferred to ${message?.interactive?.list_reply?.title} department`,
        };
        sendMessageToAdmins(mess2, existingChat?.department?._id);
        const isAvailable = await checkDepartmentAvailability(
          existingChat,messageSender
        );
        console.log(isAvailable,"isAvailable in interactive");
        
        if (!isAvailable) {
          return;
        }
        const mess3 = {
          chatId: existingChat?._id,
          sender: null,
          sendType: "assistant",
          content: `How can I help you about ${message?.interactive?.list_reply?.title}`,
          receiver: existingChat?.customerId?.toString(),
          receiverType: "user",
        };
        sendMessageToAdmins(mess3, existingChat?.department?._id);
        await sendWhatsAppMessage(
          // Call sendWhatsAppMessage
          messageSender,
          undefined,
          undefined,
          undefined,
          `How can I help you about ${message?.interactive?.list_reply?.title}`
        );
      }

      // switch (message.type) {
      //   case "text":
      //     const user = await CustomerModel.findOne({ phone: messageSender });
      //     //console.log(user, "gdfgdfgfg");

      //     let chatDddd = user?._id
      //       ? await ChatModel.findOne({ customerId: user._id }).lean()
      //       : null;
      //     if (!chatDddd?.isHuman) {
      //       const userInput = message.text.body;

      //       const embeddings = new OpenAIEmbeddings({
      //         openAIApiKey: process.env.OPENAI_API_KEY,
      //       });
      //       const index = pinecone.Index(environment.pinecone.indexName);
      //       const vectorStore = await PineconeStore.fromExistingIndex(
      //         embeddings,
      //         {
      //           //@ts-ignore
      //           pineconeIndex: index,
      //         }
      //       );

      //       const results = await vectorStore.similaritySearch(userInput, 5);
      //       let context = results.map((r) => r.pageContent).join("\n\n");
      //       const response = await generateAIResponse(
      //         context,
      //         userInput,
      //         chatDddd
      //       );
      //       console.log(response, "messageSendermessageSender");
      //       const mess = {
      //         chatId: chatDddd._id,
      //         sender: chatDddd?.customerId?.toString(),
      //         sendType: "assistant",
      //         content: response,
      //         attachments: [],
      //         timestamp: new Date(),
      //         receiver: null,
      //         receiverType: "user",
      //       };
      //       const newMessage = new MessageModel(mess);
      //       const final = await newMessage.save();
      //       const updatedChat = await ChatModel.findOneAndUpdate(
      //         { _id: chatDddd._id },
      //         { latestMessage: final?._id },
      //         { new: true }
      //       )
      //         .populate("customerId")
      //         .lean();
      //       const receivers = await UserModel.find({
      //         $or: [
      //           { role: { $in: ["Admin", "Supervisor"] } },
      //           { _id: updatedChat?.adminId },
      //         ],
      //       }).lean();
      //       [...receivers].forEach((receiver) => {
      //         socketObj.io
      //           .to(receiver._id?.toString())
      //           .emit("message", { ...updatedChat, latestMessage: final });
      //       });

      //       // await sendImageByUrl(messageSender, "hhsh", messageID, response);
      //       await sendWhatsAppMessage(
      //         // Call sendWhatsAppMessage
      //         messageSender,
      //         context,
      //         messageID,
      //         displayPhoneNumber,
      //         response
      //       );
      //     }
      //     break;

      //   // case "image":
      //   //   const mediaID = message.image.id; // Get the media ID from the message

      //   //   // Call the downloadMedia function to handle the image download
      //   //   const downloadResult = await downloadMedia(mediaID);
      //   //   // console.log("downloadResult", downloadResult);
      //   //   const { url, extractedText } = downloadResult.data;

      //   //   // sendImageByUrl(messageSender,"hhsh",messageID,url);
      //   //   // sendDocByUrl(messageSender,"hhsh",messageID,url);
      //   //   console.log("Starting image analysis...", extractedText);
      //   //   const userInputmessage = await isDocumentRequest(extractedText);
      //   //   await sendWhatsAppMessage(
      //   //     // Call sendWhatsAppMessage
      //   //     messageSender,
      //   //     undefined,
      //   //     messageID,
      //   //     displayPhoneNumber,
      //   //     userInputmessage
      //   //   );
      //   //   console.log("Image analysis completed.", userInputmessage);

      //   //   console.log("Marking message as read...");
      //   //   //await markMessageAsRead(messageID);
      //   //   console.log("Message marked as read.");
      //   //   if (downloadResult.status === "success") {
      //   //     console.log("Image downloaded successfully:");
      //   //   } else {
      //   //     console.error("Error downloading the image:");
      //   //   }

      //   //   break;

      //   case "video":
      //   case "location":
      //   case "unsupported":
      //   case "contacts":
      //     const formalMessage =
      //       "We are sorry, but we cannot process this type of content.";
      //     await sendWhatsAppMessageFromalMessage(
      //       messageSender,
      //       messageID,
      //       formalMessage
      //     );
      //     break;
      // }
    }

    return res.status(200).send("Message processed"); // Added response for successful processing
  } catch (error) {
    console.log(error);
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
