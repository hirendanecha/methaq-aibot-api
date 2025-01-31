const express = require("express");
const { getAllPrompt, addPrompt, updatePrompt, deletePrompt } = require("../../../controllers/admin/prompt.controller");


const router = express.Router();

router.get("/", getAllPrompt);
router.post("/", addPrompt);
router.put("/:id", updatePrompt);
router.delete("/:id", deletePrompt);

module.exports = router;
