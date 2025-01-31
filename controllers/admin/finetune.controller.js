const QnaModel = require("../../models/qna.model");
const path = require("path");
const fs = require("fs");
const {
  uploadFile,
  createFineTune,
  getFineTuneStatus,
} = require("../../services/openai.service");
const { generateJSONL } = require("../../utils/jsonlGenerator");
const DepartmentModel = require("../../models/department.model");
const {
  sendErrorResponse,
  sendSuccessResponse,
} = require("../../utils/response");
const dayjs = require("dayjs");

const uploadAndFineTune = async (req, res) => {
  try {
    // 1️⃣ Fetch QnA data from MongoDB department vise
    const { department } = req.body;
    const qnaList = await QnaModel.find({ department });

    if (!qnaList || qnaList.length === 0) {
      return sendErrorResponse(
        res,
        "No Q&A data available for fine-tuning.",
        400
      );
    }

    // 2️⃣ Convert to JSONL format
    const jsonlData = generateJSONL(qnaList);

    // 3️⃣ Ensure temp directory exists
    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true }); // Creates temp/ if it doesn't exist
    }

    // 3️⃣ Save JSONL data to a temporary file
    const filePath = path.join(__dirname, "../../temp/fine_tune_data.jsonl"); // Adjust path as needed
    fs.writeFileSync(filePath, jsonlData, "utf8");

    // 4️⃣ Upload the JSONL file to OpenAI
    const openAIFileId = await uploadFile(filePath);
    console.log("OpenAI File ID:", openAIFileId);

    // 5️⃣ Start fine-tuning job
    const fineTuneJob = await createFineTune(openAIFileId);
    console.log("Fine-Tune Job:", fineTuneJob);

    // 6️⃣ Clean up: Delete temp file after uploading
    fs.unlinkSync(filePath);

    await DepartmentModel.findByIdAndUpdate(department, {
      jobId: { id: fineTuneJob.id, lastUpdated: dayjs().format() },
    });

    return sendSuccessResponse(res, { data: { jobId: fineTuneJob.id } });
  } catch (error) {
    console.error("Fine-tuning failed:", error);
    return sendErrorResponse(res, error.message);
  }
};
const getFineTuneJobStatus = async (req, res) => {
  const { jobId } = req.params;
  console.log("jobId", jobId);

  try {
    const status = await getFineTuneStatus(jobId);
    console.log("status", status);
    res.status(200).json(status);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch fine-tune job status." });
  }
};

module.exports = { uploadAndFineTune, getFineTuneJobStatus };
