const express = require("express");
const router = express.Router();
const qNaCtrl = require("../../../controllers/admin/qna.controller");

/* APIs for QnA
    1. Get all QnA
    2. Create QnA
    3. Update QnA by id
    4. Delete QnA by id
*/
router.get("/", qNaCtrl.getAllQnA);
router.post("/", qNaCtrl.addQnA);
router.put("/:id", qNaCtrl.updateQnA);
router.delete("/:id", qNaCtrl.deleteQnA);

module.exports = router;
