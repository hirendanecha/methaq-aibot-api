var express = require('express');
var router = express.Router();
const departmentRoutes = require("./depaetmentData.routes");
const chatRoutes = require("../chat/index.routes");

router.use("/department", departmentRoutes);
router.use("/chat", chatRoutes);

// // Route to store chat
// router.post("/store-chat", storeChat);

// // Route to get chat history by userId
// router.get("/history/:userId", getChatHistory);

module.exports = router;