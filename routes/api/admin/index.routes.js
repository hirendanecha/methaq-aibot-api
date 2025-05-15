var express = require('express');
var router = express.Router();
const departmentRoutes = require("./department.routes")
const promptRoutes = require("./prompt.routes")
const qnaRoutes = require("./qna.routes")
const uploadRoutes = require("./upload.routes")
const agentRoutes = require("./agents.routes")
const customerRoutes = require("./customers.routes")
const chatRoutes = require("./chats.routes")
const messagetempletRoutes = require("./messagetemplet.routes")
const openaiRoutes = require("./openaiconfig.routes")

/*
    APIs for Admin
    1. User APIs
    2. Department APIs
    3. Prompt APIs
    4. QnA APIs
    5. Document Training APIs
    6. Customer APIs
*/

router.use("/user", agentRoutes);
router.use("/department", departmentRoutes);
router.use("/prompt", promptRoutes);
router.use("/qna", qnaRoutes);
router.use("/docTraining", uploadRoutes);
router.use("/customers", customerRoutes);
router.use("/chats", chatRoutes);
router.use("/message-templet", messagetempletRoutes);
router.use("/openai-config",openaiRoutes);
module.exports = router;