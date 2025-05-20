const { OpenAI } = require("openai");
const SettingsModel = require("../../models/setting/settings.model");
const crypto = require("crypto");
const OpenAIApiKeyModel = require("../../models/setting/openai-configration/openaiApiKey.model");

const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_SECRET ||
  "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";

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
const getApiKey = async () => {
  try {
    // Attempt to fetch the API key from the database
    const apiKeyRecord = await OpenAIApiKeyModel.findOne({ verified: true });

    const apiKey = decryptValue(
      apiKeyRecord.apiKey,
      ENCRYPTION_SECRET,
      apiKeyRecord.iv
    );
    console.log(apiKey, "ahahaha");
    if (apiKey) {
      return apiKey;
    } else {
      console.warn(
        "No valid API key found in the database. Falling back to environment variable."
      );
      // Fallback to environment variable
      if (process.env.OPENAI_API_KEY) {
        return process.env.OPENAI_API_KEY;
      } else {
        throw new Error(
          "No API key found in the database or environment variables."
        );
      }
    }
  } catch (error) {
    console.error("Error fetching API key:", error.message);
    throw error;
  }
};

const initializeOpenAI = async () => {
  try {
    const apiKey = await getApiKey();
    return new OpenAI({
      apiKey: apiKey,
    });
  } catch (error) {
    console.error("Failed to initialize OpenAI:", error.message);
    throw error;
  }
};

// Get settings
const createSettings = async (req, res) => {
  try {
    const { rewritePrompt } = req.body;
    console.log("rewritePrompt", rewritePrompt);

    // Check if settings already exist
    const existingSettings = await SettingsModel.findOne();
    if (existingSettings) {
      return res.status(400).json({ error: "Settings already exist" });
    }

    // Create new settings
    const newSettings = new SettingsModel({ rewritePrompt });
    await newSettings.save();

    res.status(201).json(newSettings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const settings = await SettingsModel.findOne();
    if (!settings) {
      return res.status(404).json({ error: "Settings not found" });
    }
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update settings
// const updateSettings = async (req, res) => {
//   try {
//     const { rewritePrompt } = req.body;
//     const settings = await SettingsModel.findOneAndUpdate(
//       {},
//       { rewritePrompt },
//       { new: true, upsert: true }
//     );
//     res.status(200).json(settings);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

const updateSettings = async (req, res) => {
  try {
    console.log("req.params", req.params);

    const { id } = req.params; // Get the settings ID from the URL parameters
    const { rewritePrompt } = req.body;

    // Find and update the settings using the provided ID
    const settings = await SettingsModel.findByIdAndUpdate(
      id,
      { rewritePrompt },
      { new: true } // Return the updated document
    );

    if (!settings) {
      return res.status(404).json({ error: "Settings not found" });
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const rewriteMessage = async (req, res) => {
  try {
    const { userMessage } = req.body;
    const openai = await initializeOpenAI();
    // Get the rewrite prompt from settings
    const settings = await SettingsModel.findOne();
    if (!settings || !settings.rewritePrompt) {
      return res
        .status(500)
        .json({ error: "Rewrite prompt not found in settings" });
    }
    const prompt = settings.rewritePrompt;

    // Construct the prompt for OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userMessage },
      ],
    });

    // Extract the rewritten message from the response
    const rewrittenMessage = response.choices[0].message.content;

    // Return the original and rewritten messages
    return res
      .status(200)
      .json({ originalMessage: userMessage, rewrittenMessage });
  } catch (error) {
    console.error("Error rewriting message:", error.message); // Log the error for debugging
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createSettings,
  getSettings,
  rewriteMessage,
  updateSettings,
};
