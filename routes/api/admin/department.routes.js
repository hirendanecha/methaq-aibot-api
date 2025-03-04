const express = require("express");
const router = express.Router();
const { fileUpload } = require("../../../middleware/file-upload");
const departmentCtrl = require("../../../controllers/admin/department.controller");
const { permissionAuthorization } = require("../../../middleware/authorization");

/* APIs for Department
  1. Get all Department
  2. Create Department
  3. Update Department by id
  4. Delete Department by id
*/

router.get("/", permissionAuthorization("commonPermission.department", ["read"]), departmentCtrl.getAllDepartment);

router.get("/:id/getdepartmentdetails", permissionAuthorization("commonPermission.department", ["read"]), departmentCtrl.getParticularDepartment);

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
  permissionAuthorization("commonPermission.department", ["create"]),
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
  permissionAuthorization("commonPermission.department", ["update"]),
  departmentCtrl.updateDepartment
);

router.delete("/:id", permissionAuthorization("commonPermission.department", ["delete"]), departmentCtrl.deleteDepartment);

module.exports = router;
