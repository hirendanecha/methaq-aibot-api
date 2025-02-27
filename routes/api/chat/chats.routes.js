const express = require("express");
const { OpenAIEmbeddings } = require("@langchain/openai");
const router = express.Router();
const {
  storeChat,
  getChatHistory,
  updateHandshakeStatus,
  updateIsHumanStatus,
  uploadDocument,
  deleteDocument,
} = require("../../../controllers/chat/chat.controller");
const {
  getAgentChats,
  getSingleUserChat,
} = require("../../../controllers/chat/agentChats.controller");
const { fileUpload } = require("../../../middleware/file-upload");
const environment = require("../../../utils/environment");
const axios = require("axios");
const {
  markMessageAsRead,
  sendWhatsAppMessage,
  sendWhatsAppMessageFromalMessage,
  downloadMedia,
} = require("../../../services/whatsaap.service");

const { PineconeStore } = require("@langchain/pinecone");
const { Pinecone } = require("@pinecone-database/pinecone");
const CustomerModel = require("../../../models/customer.model");
const ChatModel = require("../../../models/chat.model");
const MessageModel = require("../../../models/message.model");
const socketObj = require("../../../helpers/socket.helper");
const UserModel = require("../../../models/user.model");
const path = require("path");
const { existsSync, mkdirSync, writeFileSync } = require("fs");
const s3 = require("../../../helpers/s3.helper");
const pinecone = new Pinecone({ apiKey: environment.pinecone.apiKey });
// Route to store chat
router.post("/store-chat", storeChat);

// Route to get chat history by userId
router.get("/history/:userId", getChatHistory);

// Route to update handshake
router.post("/update-handshake", updateHandshakeStatus);

// Route to update ishuman
router.post("/update-isHuman", updateIsHumanStatus);

// Route to get agent chats
router.post("/agentChats", getAgentChats);

// Get messages for a specific chat
router.post("/getmessages", getSingleUserChat);

router.post(
  "/uploadDocument",
  fileUpload(
    "file",
    ["pdf", "image"],
    [
      {
        name: "file",
        maxCount: 1,
      },
    ]
  ),
  uploadDocument
);

router.post("/deleteDocument", deleteDocument);

// router.post('/getwhatsappmessages', (req, res) => {
//   console.log(req, req.body, "details");

//   res.status(200).json({
//     message: "success",
//     data: "http://localhost:3000/api/public/whatsapp"
//   })
// })
router.get("/getwhatsappmessages", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const token = req.query["hub.verify_token"];

  const verificationToken = environment.whatsaap.whatVt;

  if (!mode || !token) {
    return res.status(400).send("Error verifying token");
  }

  if (mode === "subscribe" && token === verificationToken) {
    return res.send(challenge);
  }

  return res.status(400).send("Invalid verification request");
});

router.post("/getwhatsappmessages", async (req, res) => {
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
  const profileNumber = contacts?.[0]?.wa_id;

  const receivers = await UserModel.find({
    $or: [{ role: { $in: ["Admin", "Supervisor"] } }],
  }).lean();

  const user = await CustomerModel.findOne({ phone: profileNumber });

  if (!user) {
    const customer = new CustomerModel({
      name: profileName,
      phone: profileNumber,
    });

    const updatedCus = await customer.save();

    if (!updatedCus._id) {
      throw new Error("Error while adding new user!");
    }

    const chat = new ChatModel({
      customerId: updatedCus._id,
    });
    const newChat = await chat.save();

    if (!newChat._id) {
      throw new Error("Error while creating new chat!");
    }

    const mess = {
      chatId: newChat._id,
      sender: updatedCus?._id,
      sendType: "user",
      content: message.text?.body,
      attachments: [],
      timestamp: message.timestamp || new Date(),
      receiver: null,
      receiverType: "admin",
    };

    const newMessage = new MessageModel(mess);
    const final = await newMessage.save();

    const updatedChat = await ChatModel.findOneAndUpdate(
      { _id: newChat.chatId },
      { latestMessage: final?._id },
      { new: true }
    ).lean();
    [...receivers].forEach((receiver) => {
      socketObj.io
        .to(receiver._id?.toString())
        .emit("message", { ...updatedChat, latestMessage: final });
    });
  } else {
    let existingChat = await ChatModel.findOne({ customerId: user._id }).lean();

    if (!existingChat) {
      const chat = new ChatModel({
        customerId: user._id,
      });
      existingChat = await chat.save();

      if (!existingChat._id) {
        throw new Error(
          "Error while creating a new chat for the existing user!"
        );
      }
    }

    const mess = {
      chatId: existingChat._id,
      sender: user?._id,
      sendType: "user",
      content: message.text?.body,
      attachments: [],
      timestamp: message.timestamp || new Date(),
      receiver: null,
      receiverType: "admin",
    };

    const newMessage = new MessageModel(mess);
    const final = await newMessage.save();

    const updatedChat = await ChatModel.findOneAndUpdate(
      { _id: existingChat._id },
      { latestMessage: final?._id },
      { new: true }
    ).lean();

    [...receivers].forEach((receiver) => {
      socketObj.io
        .to(receiver._id?.toString())
        .emit("message", { ...updatedChat, latestMessage: final });
    });
  }

  // console.log(messages, message.image.id, "type");

  switch (message.type) {
    case "text":
      const userInput = message.text.body;

      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
      });
      const index = pinecone.Index(environment.pinecone.indexName);
      const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
        //@ts-ignore
        pineconeIndex: index,
      });

      const results = await vectorStore.similaritySearch(userInput, 5);
      let context = results.map((r) => r.pageContent).join("\n\n");
      // console.log("Similarity Search Context:", context); // Log the context for debugging

      await sendWhatsAppMessage(
        // Call sendWhatsAppMessage
        messageSender,
        context,
        messageID,
        displayPhoneNumber,
        userInput
      );
      break;

    case "image":
      const mediaID = message.image.id; // Get the media ID from the message

      // Call the downloadMedia function to handle the image download
      const downloadResult = await downloadMedia(mediaID);
      await markMessageAsRead(messageID);

      if (downloadResult.status === "success") {
        console.log("Image downloaded successfully:", downloadResult.data);
      } else {
        console.error("Error downloading the image:", downloadResult.data);
      }

      break;

    case "video":
    case "location":
    case "unsupported":
    case "contacts":
      const formalMessage =
        "We are sorry, but we cannot process this type of content.";
      await sendWhatsAppMessageFromalMessage(
        messageSender,
        messageID,
        formalMessage
      );
      break;
  }

  return res.status(200).send("Message processed"); // Added response for successful processing
});
module.exports = router;
