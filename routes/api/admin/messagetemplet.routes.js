var express = require('express');
var router = express.Router();
const agentCtrl = require("../../../controllers/admin/agents.controller");
const { permissionAuthorization } = require('../../../middleware/authorization');
const { createTemplate, updateTemplate, deleteTemplate, incrementUsage, getAllTemplates } = require('../../../controllers/message-templet/messageTemplate.controller');

/* APIs for agents
 1. Create message templet
 2. Get  message templet

*/
router.post("/cretemesstemplet", permissionAuthorization("commonPermission.templet", ["create"],["Admin"]), createTemplate);
router.put('/updatetemestemplet/:id', permissionAuthorization("commonPermission.templet", ["update"],["Admin"]),updateTemplate);
router.delete('/deletemestemplet/:id', permissionAuthorization("commonPermission.templet", ["delete"],["Admin"]),deleteTemplate);
router.get("/gettemestemplets",getAllTemplates);

router.post('/:id/incrementtemestempletuse',incrementUsage);


module.exports = router;