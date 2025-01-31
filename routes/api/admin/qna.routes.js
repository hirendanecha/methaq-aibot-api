const express = require("express");
const { getAllQnA, addQnA, updateQnA, deleteQnA } = require("../../../controllers/admin/qna.controller");


const router = express.Router();

router.get("/", getAllQnA);
router.post("/", addQnA);
router.put("/:id", updateQnA);
router.delete("/:id", deleteQnA);

module.exports = router;
