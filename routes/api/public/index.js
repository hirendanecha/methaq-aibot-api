var express = require('express');
var router = express.Router();
const motorRoutes = require("./motor-insurance/index");

router.use("/motor", motorRoutes);

module.exports = router;
