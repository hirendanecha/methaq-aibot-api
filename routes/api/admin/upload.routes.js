const express = require("express");
const { fileUpload } = require("../../../middleware/file-upload");
const { addDocument, getAllDocument, deleteDocument, addUrl } = require("../../../controllers/admin/upload.controller");
const { uploadAndFineTune, getFineTuneJobStatus } = require("../../../controllers/admin/finetune.controller");

const router = express.Router();

router.get("/", getAllDocument);
router.post(
  "/",
  fileUpload(
    "documents",
    ["pdf","word","text"],
    [{ name: "file", maxCount: 1, optional: true }]
  ),
  addDocument
);
router.post(
  "/url",
  addUrl
);
router.post("/fine-tune", uploadAndFineTune);
router.get("/status/:jobId", getFineTuneJobStatus);
router.delete("/:id", deleteDocument);

module.exports = router;
