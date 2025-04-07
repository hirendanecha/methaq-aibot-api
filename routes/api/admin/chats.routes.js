const express = require("express");
const { getChatReports } = require("../../../controllers/chat/chat.controller");
const router = express.Router();

//chat-reports
router.get("/reports", getChatReports);

module.exports = router;
