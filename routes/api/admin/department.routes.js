const express = require("express");

const { fileUpload } = require("../../../middleware/file-upload");
const departmentCtrl = require("../../../controllers/admin/department.controller");

const router = express.Router();

router.get("/", departmentCtrl.getAllDepartment);
// router.get("/:id", getAllDepartmentData);

router.post(
  "/",
  fileUpload(
    "department",
    ["pdf", "image"],
    [
      {
        name: "logo",
        maxCount: 1,
        optional: true
      }
    ]
  ),
  departmentCtrl.addDepartment
);

router.put(
  "/:id",
  fileUpload(
    "department",
    ["pdf", "image"],
    [
      {
        name: "logo",
        maxCount: 1,
        optional: true
      }
    ]),
  departmentCtrl.updateDepartment
);

router.delete("/:id", departmentCtrl.deleteDepartment);

module.exports = router;
