var express = require('express');
var router = express.Router();
const claimRoutes = require("./claim");

router.use("/claim", claimRoutes);

module.exports = router;
