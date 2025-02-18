var express = require('express');
var router = express.Router();
const agentCtrl = require("../../../controllers/admin/agents.controller");

router.post("/createagent", agentCtrl.createAgent);
router.post("/getallagents", agentCtrl.getAllAgents);
router.get("/:userId/getagent", agentCtrl.getAgent);
router.put("/:userId/updateagent", agentCtrl.updateAgents);
router.post("/:userId/changepassword", agentCtrl.changePassword);
router.delete("/:userId/deleteagent", agentCtrl.deleteAgent);
// router.get("/listallagent/:claimId", agentCtrl.listAllAgent)

module.exports = router;