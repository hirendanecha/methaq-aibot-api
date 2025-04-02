const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SettingsModel = require("../../models/setting/settings.model");

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
      model: "gpt-4o-mini",
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
