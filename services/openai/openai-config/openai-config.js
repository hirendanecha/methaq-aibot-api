const { OpenAI } = require("openai");
const OpenAIApiKeyModel = require("../../../models/setting/openai-configration/openaiApiKey.model");
const crypto = require("crypto");

const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET ||
  "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

// Function to decrypt the encrypted API key
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

// Function to fetch the API key from the database
const getApiKeyFromDB = async () => {
  try {
    const apiKeyRecord = await OpenAIApiKeyModel.findOne({ verified: true });

    if (!apiKeyRecord) {
      console.warn("No valid API key found in the database.");
      return null; // Return null if key not found in DB
    }

    const decryptedApiKey = decryptValue(
      apiKeyRecord.apiKey,
      ENCRYPTION_SECRET,
      apiKeyRecord.iv
    );

    return decryptedApiKey;
  } catch (error) {
    console.error("Error fetching API key:", error.message);
    throw error;
  }
};

// Dynamically set up OpenAI instance
exports.openai = (async () => {
  try {
    // Try to get API key from DB
    let apiKey = await getApiKeyFromDB();

    if (!apiKey) {
      // If no API key in DB, fallback to the environment variable
      if (process.env.OPENAI_API_KEY) {
        apiKey = process.env.OPENAI_API_KEY;
        console.warn("Using fallback API key from environment variable.");
      } else {
        throw new Error("No API key found in the database or environment variables.");
      }
    }

    // Initialize OpenAI with the found API key
    return new OpenAI({ apiKey });
  } catch (error) {
    console.error("Error initializing OpenAI:", error.message);
    throw error;
  }
})();

