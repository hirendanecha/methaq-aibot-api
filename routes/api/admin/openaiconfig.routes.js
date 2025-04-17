const express = require("express");
const router = express.Router();
const { addOrUpdateApiKey, getApiKeyDetails, validateApiKeyController } = require("../../../controllers/setting/openaiApiKey.controller");

//openai-config
router.post('/validate-api-key', validateApiKeyController);
router.post("/openai/add-key", addOrUpdateApiKey);
router.get("/openai/get-key", getApiKeyDetails); // Optional for admin debug

module.exports = router;