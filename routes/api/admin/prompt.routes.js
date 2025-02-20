const express = require("express");
const promptCtrl = require("../../../controllers/admin/prompt.controller");
const router = express.Router();

/* APIs for prompts
    1. Get all prompts
    2. Create prompt
    3. Update prompt by id
    4. Delete prompt by id
*/
router.get("/", promptCtrl.getAllPrompt);
router.post("/", promptCtrl.addPrompt);
router.put("/:id", promptCtrl.updatePrompt);
router.delete("/:id", promptCtrl.deletePrompt);

module.exports = router;
