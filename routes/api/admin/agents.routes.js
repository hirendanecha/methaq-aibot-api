var express = require('express');
var router = express.Router();
const agentCtrl = require("../../../controllers/admin/agents.controller");

/* APIs for agents
 1. Create agent
 2. Get all agents
 3. Get agent by userId
 4. Update agent by userId
 5. Change password
 6. Delete agent by userId
*/
router.post("/createagent", agentCtrl.createAgent);
router.post("/updatepermissions", agentCtrl.updatePermissions);
router.get('/getchats', agentCtrl.getChatList);
router.get('/:chatId/getchatdetails', agentCtrl.getChatDetails);
router.post('/:chatId/updatechatnotes', agentCtrl.updateNotesToChat);
router.post("/getallagents", agentCtrl.getAllAgents);
router.get("/:userId/getagent", agentCtrl.getAgent);
router.put("/:userId/updateagent", agentCtrl.updateAgents);
router.post("/:userId/changepassword", agentCtrl.changePassword);
router.delete("/:userId/deleteagent", agentCtrl.deleteAgent);
// router.get("/listallagent/:claimId", agentCtrl.listAllAgent)

module.exports = router;