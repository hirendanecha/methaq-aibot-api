const OpenAIApi = require("openai");
const fs = require("fs");

const openai = new OpenAIApi({
  apiKey: process.env.OPENAI_API_KEY,
});

// Upload JSONL data directly
const uploadFile = async (filePath) => {
  try {
    console.log("Uploading file:", filePath);

    // Check if file exists before uploading
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Upload the file to OpenAI
    const response = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: "fine-tune",
    });

    console.log("File uploaded successfully:", response);
    return response.id;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

// Create a fine-tuning job
const createFineTune = async (fileId) => {
  try {
    console.log("Starting fine-tuning job...");

    const response = await openai.fineTuning.jobs.create({
      training_file: fileId,
      model: "gpt-4o-mini-2024-07-18",
    });

    console.log("Fine-tune job started:", response);
    return response;
  } catch (error) {
    console.error(
      "Error creating fine-tune job:",
      error.response?.data || error.message
    );
    throw new Error("Fine-tune job creation failed.");
  }
};

// Get fine-tuning job status
const getFineTuneStatus = async (jobId) => {
  try {
    console.log("Fetching fine-tune job status...");

    const response = await openai.fineTuning.jobs.retrieve(jobId);
    console.log("Fine-tune job status:", response);

    return response;
  } catch (error) {
    console.error(
      "Error getting fine-tune job status:",
      error.response?.data || error.message
    );
    throw new Error("Failed to get fine-tune job status.");
  }
};

module.exports = { uploadFile, createFineTune, getFineTuneStatus };
