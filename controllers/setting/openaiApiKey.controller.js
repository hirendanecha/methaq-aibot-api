const axios = require("axios");
const crypto = require("crypto");
const OpenAIApiKeyModel = require("../../models/setting/openai-configration/openaiApiKey.model");


const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET ||
  "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

// Encrypt
const encryptValue = (plainText, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key, "hex"),
    iv
  );
  let encrypted = cipher.update(plainText, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return { encrypted, iv: iv.toString("hex") };
};

// Decrypt
const decryptValue = (encryptedText, key, iv) => {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "hex"),
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encryptedText, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
};

// Validate OpenAI API Key
const validateApiKey = async (apiKey) => {
  try {
    console.log("ssjfjsfsjfjs");
    
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello" }],
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );
    return response.status === 200;
  } catch (err) {
    return false;
  }
};

// Add/Update API Key

const validateApiKeyController = async (req, res) => {
    try {
      const { apiKey } = req.body;
  
      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }
  
      // Validate the API key
      const isValid = await validateApiKey(apiKey);
  
      if (isValid) {
        return res.status(200).json({ success: true, message: "API key is valid" });
      } else {
        return res.status(400).json({ success: false, message: "Invalid API key" });
      }
    } catch (error) {
      console.error("Error validating API key:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };
const addOrUpdateApiKey = async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "API key is required" });
    }

    if (!ENCRYPTION_SECRET || ENCRYPTION_SECRET.length !== 64) {
      return res.status(500).json({ error: "Invalid encryption secret" });
    }

    const isValid = await validateApiKey(apiKey);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid OpenAI API key" });
    }

    const { encrypted, iv } = encryptValue(apiKey, ENCRYPTION_SECRET);

    const record = await OpenAIApiKeyModel.findOneAndUpdate(
      {},
      {
        apiKey: encrypted,
        iv,
        verified: true,
        lastUpdated: new Date(),
      },
      { new: true, upsert: true }
    );

    res
      .status(200)
      .json({
        success: true,
        message: "API key saved and verified",
        id: record._id,
      });
  } catch (error) {
    console.error("Error saving API key:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get API Key (Optional)
const getApiKeyDetails = async (req, res) => {
  try {
    const record = await OpenAIApiKeyModel.findOne();
    if (!record) return res.status(404).json({ error: "No API key found" });

    const apiKey = decryptValue(record.apiKey, ENCRYPTION_SECRET, record.iv);

    res.status(200).json({
      apiKey, // ⚠️ Don't return this in production, just for internal testing
      verified: record.verified,
      lastUpdated: record.lastUpdated,
    });
  } catch (error) {
    console.error("Error retrieving API key:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  addOrUpdateApiKey,
  getApiKeyDetails,
  validateApiKeyController
};
