var express = require('express');
var router = express.Router();
const userRoutes = require("./users");

router.use("/users", userRoutes);

module.exports = router;
