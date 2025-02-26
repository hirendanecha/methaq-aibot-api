const express = require("express");
const router = express.Router();
const { storeChat, getChatHistory, updateHandshakeStatus, updateIsHumanStatus, uploadDocument, deleteDocument } = require("../../../controllers/chat/chat.controller");
const { getAgentChats, getSingleUserChat } = require("../../../controllers/chat/agentChats.controller");
const { fileUpload } = require("../../../middleware/file-upload");
const { isTextMessage } = require("../../../core/guard/type-guard");
const { handleTextMessage } = require("../../../services/handleMsg.service");
const environment = require("../../../utils/environment");

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


router.get('/getwhatsappmessages', (req, res) => {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];
  
    const verificationToken = environment.whatsaap.whatVt
  
    if (!mode || !token) {
      return res.status(400).send('Error verifying token');
    }
  
    if (mode === 'subscribe' && token === verificationToken) {
      return res.send(challenge);
    }
  
    return res.status(400).send('Invalid verification request');
  })

router.post('/getwhatsappmessages',async (req, res) => {
    try {
      const body = req.body;
      console.log("Webhook_body:", JSON.stringify(body));
  
  
      if (!body.object) {
        throw new Error("Invalid payload structure.");
      }
  
      const entry = body.entry?.[0];
      if (!entry) throw new Error("No entry found in the payload.");
  
      const changes = entry?.changes?.[0];
      if (!changes) throw new Error("No changes found in the entry.");
  
      const value = changes?.value;
      if (!value) throw new Error("No value found in the changes.");
  
      const messages = value?.messages;
      const statuses = value?.statuses;
  
      if (messages && messages.length > 0) {
        for (const message of messages) {
          const from = message.from;
          const phoneNumberId = value.metadata?.phone_number_id;
  
          if (!phoneNumberId || !from) {
            throw new Error("Missing required data in the message.");
          }
  
          if (isTextMessage(message)) {
            await handleTextMessage(
              message,
              from,
              phoneNumberId,
            );
          } else {
            console.error(
              'Received message of unsupported type:',
              message.type,
            );
            console.log('Message details:', message);
          }
        }
      } else if (statuses && statuses.length > 0) {
        statuses.forEach((status) => {
          console.log("Status ID:", status.id);
          console.log("Status:", status.status);
          console.log("Recipient ID:", status.recipient_id);
        });
      } else {
        throw new Error("No messages or statuses found in the payload.");
      }
  
      res.sendStatus(200);
    } catch (error) {
      console.error("Error handling webhook:", error.message);
      res.status(400).json({ error: error.message });
    }
  })

module.exports = router;
