var express = require('express');
var router = express.Router();
const agentCtrl = require("../../../controllers/admin/agents.controller");
const { permissionAuthorization } = require('../../../middleware/authorization');

/* APIs for agents
 1. Create agent
 2. Get all agents
 3. Get agent by userId
 4. Update agent by userId
 5. Change password
 6. Delete agent by userId
*/
router.post("/createagent", permissionAuthorization("commonPermission.agent", ["create"]), agentCtrl.createAgent);
router.post("/updatepermissions", agentCtrl.updatePermissions);
router.post('/getchats', agentCtrl.getChatList);
router.get('/:chatId/getchatdetails', agentCtrl.getChatDetails);
router.post('/:chatId/updatechatnotes', agentCtrl.updateNotesToChat);
router.post("/getallagents", agentCtrl.getAllAgents);
router.get("/:userId/getagent", permissionAuthorization("commonPermission.agent", ["read"]), agentCtrl.getAgent);
router.put("/:userId/updateagent", permissionAuthorization("commonPermission.agent", ["update"]), agentCtrl.updateAgents);
router.post("/:userId/changepassword", permissionAuthorization("commonPermission.agent", ["update"]), agentCtrl.changePassword);
router.delete("/:userId/deleteagent", permissionAuthorization("commonPermission.agent", ["delete"]), agentCtrl.deleteAgent);
// router.get("/listallagent/:claimId", agentCtrl.listAllAgent)

module.exports = router;