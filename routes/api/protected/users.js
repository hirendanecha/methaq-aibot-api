var express = require('express');
var router = express.Router();
const userCtrl = require("../../../controllers/user.controller");

router.get("/me", userCtrl.me);

module.exports = router;
