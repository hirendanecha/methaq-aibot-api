const express = require("express");

const { fileUpload } = require("../../../middleware/file-upload");
const { addDepartment, getAllDepartment, deleteDepartment, updateDepartment } = require("../../../controllers/admin/department.controller");

const router = express.Router();

router.get("/", getAllDepartment);
router.post(
  "/",
  fileUpload(
    "department",
    ["image"],
    [{ name: "logo", maxCount: 1, optional: true }]
  ),
  addDepartment
);
router.put(
  "/:id",
  fileUpload(
    "department",
    ["image"],
    [{ name: "logo", maxCount: 1, optional: true }]
  ),
  updateDepartment
);
router.delete("/:id", deleteDepartment);

module.exports = router;
