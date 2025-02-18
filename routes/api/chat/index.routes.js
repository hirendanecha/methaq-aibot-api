var express = require('express');
var router = express.Router();

const chatRoutes = require("../chat/chats.routes");

router.use("/", chatRoutes);

module.exports = router;