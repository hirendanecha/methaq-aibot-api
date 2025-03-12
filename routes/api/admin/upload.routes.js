const express = require("express");
const router = express.Router();
const { fileUpload } = require("../../../middleware/file-upload");
const uploadCtrl = require("../../../controllers/admin/upload.controller");
const fineTuneCtrl = require("../../../controllers/admin/finetune.controller");

/* APIs for Upload
  1. Get all Document
  2. Create Document
  3. Delete Document by id
*/

router.get("/", uploadCtrl.getAllDocument);
router.post(
  "/",
  fileUpload(
    "documents",
    ["pdf", "word", "text", "json"],
    [{ name: "file", maxCount: 10, optional: true }]
  ),
  uploadCtrl.addDocument
);
router.post(
  "/url",
  uploadCtrl.addUrl
);
router.post("/fine-tune", fineTuneCtrl.uploadAndFineTune);
router.get("/status/:jobId", fineTuneCtrl.getFineTuneJobStatus);
router.delete("/:id", uploadCtrl.deleteDocument);

module.exports = router;
