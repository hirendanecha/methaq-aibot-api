const express = require("express");
const { getChatReports, getUnReadChatCounts, getChatTrends } = require("../../../controllers/chat/chat.controller");
const router = express.Router();

//chat-reports
router.get("/reports", getChatReports);

router.get("/unread-chats", getUnReadChatCounts);

router.post("/chat-trends", getChatTrends);

module.exports = router;
