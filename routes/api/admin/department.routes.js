const express = require("express");
const router = express.Router();
const { fileUpload } = require("../../../middleware/file-upload");
const departmentCtrl = require("../../../controllers/admin/department.controller");
const { permissionAuthorization } = require("../../../middleware/authorization");
const { updateComplaintStatus, getAllComplaints, getComplaintById, assignAgentToComplaint, updateComplaint, downloadComplaintPdf } = require("../../../controllers/complain/complain.controller");
const { assignAgentToMotorInquiry, updatedMotorInquiry, getMotorInquiryById, updatMotorInquiryStatus } = require("../../../controllers/motorInquiry/motor.controller");

/* APIs for Department
  1. Get all Department
  2. Create Department
  3. Update Department by id
  4. Delete Department by id
*/

router.get("/", permissionAuthorization("commonPermission.department", ["read"]), departmentCtrl.getAllDepartment);

router.get("/:id/getdepartmentdetails", permissionAuthorization("commonPermission.department", ["read"], ['Admin', 'Agent', 'Supervisor']), departmentCtrl.getParticularDepartment);

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

router.delete("/:id", permissionAuthorization("commonPermission.department", ["delete"], ['Admin']), departmentCtrl.deleteDepartment);

router.patch("/assign-agent-complaint/:id", permissionAuthorization("commonPermission.complain", ["update"], ['Admin']), assignAgentToComplaint);


router.patch("/assign-agent-motor-inquiry/:id", permissionAuthorization("commonPermission.motorInquiry", ["update"], ['Admin']), assignAgentToMotorInquiry);
router.put("/update-motor-inquiry/:id", permissionAuthorization("commonPermission.motorInquiry", ["update"], ['Admin']), updatedMotorInquiry);
router.patch("/update-status-motor-inquiry/:id", permissionAuthorization("commonPermission.motorInquiry", ["update"], ['Admin']), updatMotorInquiryStatus);
router.get("/getByIdMotorInquiry/:id", permissionAuthorization("commonPermission.motorInquiry", ["read"], ['Admin']), getMotorInquiryById);  //done

router.put("/update-complaint/:id", permissionAuthorization("commonPermission.complain", ["update"], ['Admin']), updateComplaint);

router.patch("/update-status-complaint/:id", permissionAuthorization("commonPermission.complain", ["update"], ['Admin']), updateComplaintStatus);

router.post("/get-complaints", permissionAuthorization("commonPermission.complain", ["read"], ['Admin']), getAllComplaints);

router.get("/getByIdComplain/:id", permissionAuthorization("commonPermission.complain", ["read"], ['Admin']), getComplaintById);

router.post("/update-department-working-hours", permissionAuthorization("commonPermission.department", ["update"], ['Admin']), departmentCtrl.updateDepartmentsWorkingHours);

router.get('/getSubDepartmentId/:departmentId', departmentCtrl.getSubDepartmentId);

router.get('/complaint/:id/pdf', permissionAuthorization("commonPermission.complain", ["read"], ['Admin']), downloadComplaintPdf);

router.post('/tranfer-department-bulk', departmentCtrl.transferDepartmentInBulk)

module.exports = router;
