const express = require("express");
const { getChatReports, getUnReadChatCounts } = require("../../../controllers/chat/chat.controller");
const router = express.Router();

//chat-reports
router.get("/reports", getChatReports);

router.get("/unread-chats", getUnReadChatCounts);

module.exports = router;
