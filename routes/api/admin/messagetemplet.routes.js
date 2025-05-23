var express = require('express');
var router = express.Router();
const agentCtrl = require("../../../controllers/admin/agents.controller");
const { permissionAuthorization } = require('../../../middleware/authorization');
const { createTemplate, updateTemplate, deleteTemplate, incrementUsage, getAllTemplates, getTemplateById } = require('../../../controllers/message-templet/messageTemplate.controller');
const { getAllWhatsappTemplet, deleteWhatsappTemplet, createWhatsappTemplate, getWhatsappTempletNames, getTemplateByName, assignTemplatesToUser } = require('../../../controllers/whatassp-templet/whatasspTemplet.controller');
const pdfUpload = require("../../../middleware/file-upload");


/* APIs for agents
 1. Create message templet
 2. Get  message templet

*/
router.post("/cretemesstemplet", permissionAuthorization("commonPermission.templet", ["create"], ["Admin"]), createTemplate);
router.put('/updatetemestemplet/:id', permissionAuthorization("commonPermission.templet", ["update"], ["Admin"]), updateTemplate);
router.delete('/deletemestemplet/:id', permissionAuthorization("commonPermission.templet", ["delete"], ["Admin"]), deleteTemplate);
router.get("/gettemestemplets", getAllTemplates);
router.get("/gettemestempletById/:id", getTemplateById);

router.post('/:id/incrementtemestempletuse', incrementUsage);

//whatsapp templet
router.post("/create-whatsapp-templet", permissionAuthorization("commonPermission.whatsappTemplet", ["create"], ["Admin"]), pdfUpload.fileUpload(
    "templateDoc",
    ["pdf", "image", "video"],
    [
        {
            name: "doc",
            maxCount: 1,
        },
    ]
), createWhatsappTemplate);

router.get("/get-whatsapp-templet", permissionAuthorization("commonPermission.whatsappTemplet", ["read"], ["Admin"]), getAllWhatsappTemplet);
router.get("/getWhatsappTempletNames", permissionAuthorization("commonPermission.whatsappTemplet", ["read"], ["Admin"]), getWhatsappTempletNames);
router.get("/getTemplateByName", permissionAuthorization("commonPermission.whatsappTemplet", ["read"], ["Admin"]), getTemplateByName);
router.delete('/delete-whatsapp-templet', permissionAuthorization("commonPermission.whatsappTemplet", ["delete"], ["Admin"]), deleteWhatsappTemplet);
router.post('/assignTemplatesToUser', permissionAuthorization("commonPermission.whatsappTemplet", ["update"], ["Admin"]), assignTemplatesToUser);

// router.post("/crete-whatassp-messtemplet", permissionAuthorization("commonPermission.whatsappTemplet", ["create"],["Admin"]), createTemplate);


module.exports = router;