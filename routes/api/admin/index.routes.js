var express = require('express');
var router = express.Router();
const motorRoutes = require("./motor-insurance/index.routes");
const userRoutes = require("./users.routes")
const dashboardRoutes = require("./dashboard.routes")
const departmentRoutes = require("./department.routes")
const promptRoutes = require("./prompt.routes")
const qnaRoutes = require("./qna.routes")
const uploadRoutes = require("./upload.routes")


router.use("/user", userRoutes);
router.use("/motor", motorRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/department", departmentRoutes);
router.use("/prompt", promptRoutes);
router.use("/qna", qnaRoutes);
router.use("/docTraining",uploadRoutes);

module.exports = router;