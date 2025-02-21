const express = require("express");
const router = express.Router();
const { storeChat, getChatHistory, updateHandshakeStatus, updateIsHumanStatus } = require("../../../controllers/chat/chat.controller");
const { getAgentChats, getSingleUserChat } = require("../../../controllers/chat/agentChats.controller");

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

module.exports = router;