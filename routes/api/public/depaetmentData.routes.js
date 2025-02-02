const express = require("express");
const { getAllDepartment, getAllDepartmentData, getAllDepartmentWithPrompt } = require("../../../controllers/depaetmentData.controller");

const router = express.Router();

router.get("/departments-with-prompt", getAllDepartmentWithPrompt);
router.get("/", getAllDepartment);
router.get("/:id", getAllDepartmentData);


module.exports = router;
