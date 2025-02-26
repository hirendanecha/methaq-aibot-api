const express = require("express");
const router = express.Router();
const { storeChat, getChatHistory, updateHandshakeStatus, updateIsHumanStatus, uploadDocument, deleteDocument } = require("../../../controllers/chat/chat.controller");
const { getAgentChats, getSingleUserChat } = require("../../../controllers/chat/agentChats.controller");
const { fileUpload } = require("../../../middleware/file-upload");

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

  const verificationToken = process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN;

  if (!mode || !token) {
    return res.status(400).send('Error verifying token');
  }

  if (mode === 'subscribe' && token === verificationToken) {
    return res.send(challenge);
  }

  return res.status(400).send('Invalid verification request');
})

module.exports = router;