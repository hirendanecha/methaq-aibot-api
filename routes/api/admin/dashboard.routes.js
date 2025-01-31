var express = require('express');
var router = express.Router();
const dashboardCtrl = require("../../../controllers/admin/dashboard.controller");

router.post("/dashboarddata", dashboardCtrl.getDashboardData);
router.post("/getclaimsbydate", dashboardCtrl.getClaimsByDate);

module.exports = router;