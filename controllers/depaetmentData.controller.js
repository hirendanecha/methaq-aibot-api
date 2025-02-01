const DepartmentModel = require("../models/department.model");
const Embedding = require("../models/embeddings.modal");
const PromptModel = require("../models/prompt.model");
const QnaModel = require("../models/qna.model");
const UploadModel = require("../models/uploade.model");
const UserModel = require("../models/user.model");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/response");

const getAllDepartment = async (req, res) => {
  try {
    const departmentList = await DepartmentModel.find().lean();
    let departments = [];
    for (let i = 0; i < departmentList?.length; i++) {
      const agentCount = await UserModel.countDocuments({
        department: departmentList[i]?._id,
      });
      let department = {
        ...departmentList[i],
        agentCount,
      };
      departments.push(department);
    }
    return sendSuccessResponse(res, { data: departments });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const getAllDepartmentData = async (req, res) => {
  const { id } = req.params;
  try {
    const QNA = await QnaModel.find({ department: id }).lean();
    const Prompt = await PromptModel.find({ department: id }).lean();
    const Upload = await UploadModel.find({ department: id }).lean();
    // for (let i = 0; i < Upload?.length; i++) {
    //   const embedding = await Embedding.find({ documentId: Upload[i]?._id });
    //   Upload[i].embedding = embedding;
    // }
    const departmentData = {
      QNA,
      Prompt,
      Upload,
    };
    return sendSuccessResponse(res, { data: departmentData });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

module.exports = { getAllDepartment, getAllDepartmentData };
