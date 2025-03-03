const { default: mongoose } = require("mongoose");
const DepartmentModel = require("../../models/department.model");
const PromptModel = require("../../models/prompt.model");
const { sendSuccessResponse, sendErrorResponse } = require("../../utils/response");


const getAllPrompt = async (req, res) => {
  const { department } = req.query;
  try {
    const promptList = await DepartmentModel.findById(new mongoose.Types.ObjectId(department));
    return sendSuccessResponse(res, { data: promptList });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const addPrompt = async (req, res) => {
  const { department, prompt } = req.body;
  try {
    const newPrompt = await DepartmentModel.findByIdAndUpdate(new mongoose.Types.ObjectId(department), { prompt }, { new: true });
    return sendSuccessResponse(res, { data: newPrompt }, 201);
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const updatePrompt = async (req, res) => {
  const { department, prompt } = req.body;
  try {
    const updatedPrompt = await DepartmentModel.findByIdAndUpdate(
      department,
      { prompt },
      { new: true }
    );
    return sendSuccessResponse(res, { data: updatedPrompt });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const deletePrompt = async (req, res) => {
  const { department } = req.params;
  try {
    await DepartmentModel.findByIdAndDelete(department, {
      prompt: ""
    }, {
      new: true
    });
    return sendSuccessResponse(res, "Prompt deleted successfully.");
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

module.exports = { getAllPrompt, addPrompt, updatePrompt, deletePrompt };
