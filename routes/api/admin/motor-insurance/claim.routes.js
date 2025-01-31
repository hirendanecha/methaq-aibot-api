var express = require('express');
var router = express.Router();
const claimCtrl = require("../../../../controllers/motor-insurance/admin/claim.controller");
const fileUpload = require("../../../../middleware/file-upload")

router.post("/getallclaims", claimCtrl.getAllClaims);
router.get("/:claimId/getclaim", claimCtrl.getClaim);
router.put("/:claimId/updateclaim",
    fileUpload.fileUpload(
        "claimdocuments",
        ["pdf", "image"],
        [
            {
                name: "tradeLicense",
                maxCount: 1
            },
            {
                name: "carRegCardFile",
                maxCount: 1,
            },
            {
                name: "drivingLicenseFile",
                maxCount: 1
            },
            {
                name: "emiratesIdFile",
                maxCount: 1,
            },
            {
                name: "reportFile",
                maxCount: 1
            },
            {
                name: "imagesOfDamages",
                maxCount: 10,
            },
        ]
    ),
    claimCtrl.updateClaim);
router.delete("/:claimId/deleteclaim", claimCtrl.deleteClaim);
router.get("/claimsstatuswisecounts", claimCtrl.claimsStatusWiseCounts)

module.exports = router;