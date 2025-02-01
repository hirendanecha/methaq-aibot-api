var express = require('express');
var router = express.Router();
const userCtrl = require("../../../controllers/admin/user.controller");

router.post("/createagent", userCtrl.createAgent);
router.post("/getallagents", userCtrl.getAllAgents);
router.get("/:userId/getagent", userCtrl.getAgent);
router.put("/:userId/updateagent", userCtrl.updateAgents);
router.post("/:userId/changepassword", userCtrl.changePassword);
router.delete("/:userId/deleteagent", userCtrl.deleteAgent);
// router.get("/listallagent/:claimId", userCtrl.listAllAgent)

module.exports = router;