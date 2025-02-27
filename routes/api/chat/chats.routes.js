const express = require("express");
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
const { markMessageAsRead, sendWhatsAppMessage } = require("../../../services/whatsaap.service");

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
  const { messages, metadata } = req.body.entry?.[0]?.changes?.[0].value ?? {}; 
  const displayPhoneNumber = metadata?.phone_number_id; 
  // const phoneNumberId = value.metadata?.phone_number_id;
 
  if (!messages) return res.status(400).send("No messages found"); // Added response for no messages
  const message = messages[0];
  const messageSender = message.from;
  const messageID = message.id;

  // await markMessageAsRead(messageID);

  switch (message.type) {
    case "text":
      const text = message.text.body;
    

      await sendWhatsAppMessage( // Call sendWhatsAppMessage
        messageSender,
        text,
        messageID,
        displayPhoneNumber
      );
      break;
  }

  return res.status(200).send("Message processed"); // Added response for successful processing
});
module.exports = router;
