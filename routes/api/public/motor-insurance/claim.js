var express = require('express');
var router = express.Router();
const claimCtrl = require("../../../../controllers/motor-insurance/claim.controller");
const fileUpload = require("../../../../middleware/file-upload");

router.post("/createclaim",
    fileUpload.fileUpload(
        "claimdocuments",
        ["pdf", "image"],
        [
            {
                name: "tradeLicenses",
                maxCount: 10
            },
            {
                name: "registrationCardImages",
                maxCount: 2,
            },
            {
                name: "drivingLicenseImages",
                maxCount: 2
            },
            {
                name: "emiratesIdImages",
                maxCount: 2,
            },
            {
                name: "reportFiles",
                maxCount: 10
            },
            {
                name: "imagesOfDamages",
                maxCount: 10,
            },
        ]
    ),
    claimCtrl.createClaim);

router.get("/:claimId/getclaim", claimCtrl.getClaim);

router.post("/verifycarregistrationcard",
    fileUpload.fileUpload(
        "claimdocuments",
        ["pdf", "image"],
        [
            {
                name: "files",
                maxCount: 2
            }
        ]
    ),
    claimCtrl.verifyCarRegistrationCard);


router.post("/verifydrivinglicense",
    fileUpload.fileUpload(
        "claimdocuments",
        ["pdf", "image"],
        [
            {
                name: "files",
                maxCount: 2
            }
        ]
    ),
    claimCtrl.verifyDrivingLicense);

router.post("/verifyemiratesid",
    fileUpload.fileUpload(
        "claimdocuments",
        ["pdf", "image"],
        [
            {
                name: "files",
                maxCount: 2
            }
        ]
    ),
    claimCtrl.verifyEmiratesId);

module.exports = router;