const express = require("express");
const { getChatReports, getUnReadChatCounts, getChatTrends, getUserStatistics, getAllReports, archiveOlderChat } = require("../../../controllers/chat/chat.controller");
const router = express.Router();

//chat-reports
router.post("/reports", getChatReports);

router.get("/unread-chats", getUnReadChatCounts);

router.post("/chat-trends", getChatTrends);

router.post("/chat-user-statistics", getUserStatistics);

router.post("/all-reports", getAllReports);

router.get("/archiveChats", archiveOlderChat);

module.exports = router;
