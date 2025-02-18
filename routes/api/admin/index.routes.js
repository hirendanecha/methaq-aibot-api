var express = require('express');
var router = express.Router();
const departmentRoutes = require("./department.routes")
const promptRoutes = require("./prompt.routes")
const qnaRoutes = require("./qna.routes")
const uploadRoutes = require("./upload.routes")
const agentRoutes = require("./agents.routes")

router.use("/user", agentRoutes);
router.use("/department", departmentRoutes);
router.use("/prompt", promptRoutes);
router.use("/qna", qnaRoutes);
router.use("/docTraining",uploadRoutes);

module.exports = router;