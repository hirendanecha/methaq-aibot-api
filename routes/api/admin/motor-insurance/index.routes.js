var express = require('express');
var router = express.Router();
const claimRoutes = require("./claim.routes")

router.use("/claim", claimRoutes)

module.exports = router;