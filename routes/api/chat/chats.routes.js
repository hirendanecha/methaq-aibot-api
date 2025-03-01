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
  sendImageByUrl,
  sendInteractiveMessage
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
const { generateAIResponse } = require("../../../services/openai/openai.service");
const { isHumanChatRequest } = require("../../../services/openai/tool/transferChat");
const { isDocumentRequest } = require("../../../services/openai/tool/docProcessing");
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

  // console.log(messages, message.image.id, "type");
  const finalMessage = {
    content: "",
    attachment: [],
  };

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
    sendInteractiveMessage(messageSender,messageID);

    // if (!newChat._id) {
    //   throw new Error("Error while creating new chat!");
    // }
    // const attachment = [];
    // let extractedTextMess = "";
    // if (message.type === "image" || message.type === "document") {
    //   const mediaID = message.image?.id || message.document?.id; // Get the media ID from the message
    //   const downloadResult = await downloadMedia(mediaID);
    //   // Call the downloadMedia function to handle the image download
    //   if (mediaID) {

    //     console.log(downloadResult, "downloadResult");
    //     attachment.push(downloadResult.data.url);
    //     await markMessageAsRead(messageID);

    //     if (downloadResult.status === "success") {
    //       console.log("Image downloaded successfully:", downloadResult.data);
    //     } else {
    //       console.error("Error downloading the image:", downloadResult.data);
    //     }
    //   }

    //   // if (message.type === "image") {
    //   // const mediaID = message.image.id; // Get the media ID from the message

    //   // Call the downloadMedia function to handle the image download
    //   // const downloadResult = await downloadMedia(mediaID);
    //   // console.log("downloadResult", downloadResult);
    //   const { url, extractedText } = downloadResult.data;

    //   // sendImageByUrl(messageSender,"hhsh",messageID,url);
    //   // sendDocByUrl(messageSender,"hhsh",messageID,url);
    //   console.log("Starting image analysis...", extractedText);
    //   const userInputmessage = await isDocumentRequest(extractedText);
    //   extractedTextMess = userInputmessage;
    //   await sendWhatsAppMessage(
    //     // Call sendWhatsAppMessage
    //     messageSender,
    //     undefined,
    //     messageID,
    //     displayPhoneNumber,
    //     userInputmessage
    //   );
    //   console.log("Image analysis completed.", userInputmessage);

    //   console.log("Marking message as read...");
    //   //await markMessageAsRead(messageID);
    //   console.log("Message marked as read.");
    //   if (downloadResult.status === "success") {
    //     console.log("Image downloaded successfully:");
    //   } else {
    //     console.error("Error downloading the image:");
    //   }
    //   // }
    //   //here call  url
    // }
    // console.log(message, "messagesdfsfd");
    // const mess = {
    //   chatId: newChat._id,
    //   sender: updatedCus?._id,
    //   sendType: "user",
    //   content: message.text?.body,
    //   attachments: attachment,
    //   timestamp: new Date(),
    //   receiver: null,
    //   receiverType: "admin",
    // };

    // const newMessage = new MessageModel(mess);
    // const final = await newMessage.save();
    // if (extractedTextMess) {
    //   const mess = {
    //     chatId: newChat._id,
    //     sender: null,
    //     sendType: "assistant",
    //     content: extractedTextMess,
    //     attachments: [],
    //     timestamp: new Date(),
    //     receiver: newChat?.customerId?.toString(),
    //     receiverType: "user",
    //   };
    //   const messss = new MessageModel(mess);
    //   extractedTextMess = await messss.save();
    // }
    // const updatedChat = await ChatModel.findOneAndUpdate(
    //   { _id: newChat._id },
    //   { latestMessage: extractedTextMess ? extractedTextMess?._id : final?._id },
    //   { new: true }
    // )
    //   .populate("customerId")
    //   .lean();
    // console.log(updatedChat, "updatedChatfgdgfgdhh");

    // const receivers = await UserModel.find({
    //   $or: [{ role: { $in: ["Admin", "Supervisor"] } }],
    // }).lean();
    // [...receivers].forEach((receiver) => {
    //   socketObj.io
    //     .to(receiver._id?.toString())
    //     .emit("message", { ...updatedChat, latestMessage: final });
    //   extractedTextMess && socketObj.io
    //     .to(receiver._id?.toString())
    //     .emit("message", { ...updatedChat, latestMessage: extractedTextMess });

    // });
  } else {
    let existingChat = await ChatModel.findOne({ customerId: user?._id }).lean();
    if (!existingChat) {
      return;
    }
    if(existingChat?.workingHours?.startTime){
      const currentTime = new Date();
      const chatStartTime = new Date(existingChat?.workingHours?.startTime);
      const chatEndTime = new Date(existingChat?.workingHours?.endTime);
      if (currentTime < chatStartTime || currentTime > chatEndTime) {
        return;
      }
    }
    const attachment = [];
    let extractedTextMess = "";
    
    
    if (message.type === "image" || message.type === "document") {
      console.log(message, "messagedsddfg");

      const mediaID = message.image?.id || message.document?.id; // Get the media ID from the message
      const downloadResult = await downloadMedia(mediaID);
      // Call the downloadMedia function to handle the image download
      if (mediaID) {

        console.log(downloadResult, "downloadResult");
        attachment.push(downloadResult.data.url);
        await markMessageAsRead(messageID);

        if (downloadResult.status === "success") {
          console.log("Image downloaded successfully:", downloadResult.data);
        } else {
          console.error("Error downloading the image:", downloadResult.data);
        }


      }

      //here

      // if (message.type === "image") {
      //const mediaID = message.image.id; // Get the media ID from the message

      // Call the downloadMedia function to handle the image download
      // const downloadResult = await downloadMedia(mediaID);
      // console.log("downloadResult", downloadResult);
      const { url, extractedText } = downloadResult.data;

      // sendImageByUrl(messageSender,"hhsh",messageID,url);
      // sendDocByUrl(messageSender,"hhsh",messageID,url);
     // console.log("Starting image analysis...", extractedText);
      const userInputmessage = await isDocumentRequest(extractedText);
      extractedTextMess = userInputmessage;
      await sendWhatsAppMessage(
        // Call sendWhatsAppMessage
        messageSender,
        undefined,
        messageID,
        displayPhoneNumber,
        userInputmessage
      );
      //console.log("Image analysis completed.", userInputmessage);

      //console.log("Marking message as read...");
      //await markMessageAsRead(messageID);
      //console.log("Message marked as read.");
      if (downloadResult.status === "success") {
        console.log("Image downloaded successfully:");
      } else {
        console.error("Error downloading the image:");
      }
      // }
    }
    if(message?.type === "interactive"){
      const department = message?.interactive?.list_reply?.id;
      const updateChat = await ChatModel.findOneAndUpdate(
        { _id: existingChat._id },
        { department },
        { new: true }
      )
      console.log(updateChat,"updateChatshubb");
      
    }

    const mess = {
      chatId: existingChat?._id,
      sender: user?._id,
      sendType: "user",
      content: message.text?.body,
      attachments: attachment,
      timestamp: new Date(),
      receiver: null,
      receiverType: "admin",
    };

    const newMessage = new MessageModel(mess);
    const final = await newMessage.save();
    if (extractedTextMess) {
      const mess = {
        chatId: existingChat._id,
        sender: null,
        sendType: "assistant",
        content: extractedTextMess,
        attachments: [],
        timestamp: new Date(),
        receiver: existingChat?.customerId?.toString(),
        receiverType: "user",
      };
      const messss = new MessageModel(mess);
      extractedTextMess = await messss.save();
    }
    let isHumantrasfer = existingChat?.isHuman;
    console.log(isHumantrasfer, "isHumantrasfer123");

    if (!existingChat?.isHuman && final?.content) {
      console.log(await isHumanChatRequest(final?.content), "Prayank1");

      isHumantrasfer = await isHumanChatRequest(final?.content);
    }
    console.log(isHumantrasfer, "isHumantrasfer456");
    console.log(isHumantrasfer, "isHumantrasferisHumantrasfer");

    const updatedChat = await ChatModel.findOneAndUpdate(
      { _id: existingChat._id },
      { latestMessage: final?._id, isHuman: isHumantrasfer },
      { new: true }
    )
      .populate("customerId")
      .lean();

    const receivers = await UserModel.find({
      $or: [
        { role: { $in: ["Admin", "Supervisor"] } },
        { _id: updatedChat?.adminId },
      ],
    }).lean();
    console.log(extractedTextMess, "extractedTextMess");

    [...receivers].forEach((receiver) => {
      socketObj.io
        .to(receiver._id?.toString())
        .emit("message", { ...updatedChat, latestMessage: final });
      extractedTextMess && socketObj.io
        .to(receiver._id?.toString())
        .emit("message", { ...updatedChat, latestMessage: extractedTextMess });
    });

    switch (message.type) {
      case "text":
  
        const user = await CustomerModel.findOne({ phone: messageSender });
        //console.log(user, "gdfgdfgfg");
      
  
        let chatDddd = user?._id
          ? await ChatModel.findOne({ customerId: user._id }).lean()
          : null;
        if (!chatDddd?.isHuman) {
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
          const response = await generateAIResponse(context, userInput,chatDddd);
          console.log(response, "messageSendermessageSender");
          const mess = {
            chatId: chatDddd._id,
            sender: chatDddd?.customerId?.toString(),
            sendType: "assistant",
            content: response,
            attachments: [],
            timestamp: new Date(),
            receiver: null,
            receiverType: "user",
          };
          const newMessage = new MessageModel(mess);
          const final = await newMessage.save();
          const updatedChat = await ChatModel.findOneAndUpdate(
            { _id: chatDddd._id },
            { latestMessage: final?._id },
            { new: true }
          )
            .populate("customerId")
            .lean();
          const receivers = await UserModel.find({
            $or: [
              { role: { $in: ["Admin", "Supervisor"] } },
              { _id: updatedChat?.adminId },
            ],
          }).lean();
          [...receivers].forEach((receiver) => {
            socketObj.io
              .to(receiver._id?.toString())
              .emit("message", { ...updatedChat, latestMessage: final });
          });
  
          // await sendImageByUrl(messageSender, "hhsh", messageID, response);
          await sendWhatsAppMessage(
            // Call sendWhatsAppMessage
            messageSender,
            context,
            messageID,
            displayPhoneNumber,
            response
          );
        }
        break;
  
      // case "image":
      //   const mediaID = message.image.id; // Get the media ID from the message
  
      //   // Call the downloadMedia function to handle the image download
      //   const downloadResult = await downloadMedia(mediaID);
      //   // console.log("downloadResult", downloadResult);
      //   const { url, extractedText } = downloadResult.data;
  
      //   // sendImageByUrl(messageSender,"hhsh",messageID,url);
      //   // sendDocByUrl(messageSender,"hhsh",messageID,url);
      //   console.log("Starting image analysis...", extractedText);
      //   const userInputmessage = await isDocumentRequest(extractedText);
      //   await sendWhatsAppMessage(
      //     // Call sendWhatsAppMessage
      //     messageSender,
      //     undefined,
      //     messageID,
      //     displayPhoneNumber,
      //     userInputmessage
      //   );
      //   console.log("Image analysis completed.", userInputmessage);
  
      //   console.log("Marking message as read...");
      //   //await markMessageAsRead(messageID);
      //   console.log("Message marked as read.");
      //   if (downloadResult.status === "success") {
      //     console.log("Image downloaded successfully:");
      //   } else {
      //     console.error("Error downloading the image:");
      //   }
  
      //   break;
  
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
  }
  

  return res.status(200).send("Message processed"); // Added response for successful processing
});
module.exports = router;
