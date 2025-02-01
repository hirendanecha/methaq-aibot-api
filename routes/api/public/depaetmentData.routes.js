const express = require("express");
const { getAllDepartment, getAllDepartmentData } = require("../../../controllers/depaetmentData.controller");

const router = express.Router();

router.get("/", getAllDepartment);
router.get("/:id", getAllDepartmentData);


module.exports = router;
