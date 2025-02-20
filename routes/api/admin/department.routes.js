const express = require("express");
const router = express.Router();
const { fileUpload } = require("../../../middleware/file-upload");
const departmentCtrl = require("../../../controllers/admin/department.controller");

/* APIs for Department
  1. Get all Department
  2. Create Department
  3. Update Department by id
  4. Delete Department by id
*/

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
