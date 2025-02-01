var express = require('express');
var router = express.Router();
const departmentRoutes = require("./depaetmentData.routes")


router.use("/department", departmentRoutes);

module.exports = router;