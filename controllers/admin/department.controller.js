const files = require("../../helpers/files.helper");
const DepartmentModel = require("../../models/department.model");
const PromptModel = require("../../models/prompt.model");
const QnaModel = require("../../models/qna.model");
const UploadModel = require("../../models/uploade.model");
const UserModel = require("../../models/agent.model");
const Embedding = require("../../models/embeddings.modal");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../../utils/response");

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

const addDepartment = async (req, res) => {
  const { name, description } = req.body;
  const { logo = [] } = req.files || {};

  try {
    const newDepartment = new DepartmentModel({
      name,
      description,
      ...(logo[0] && { logo: `${logo[0]?.destination}/${logo[0]?.filename}` }),
    });
    await newDepartment.save();
    return sendSuccessResponse(res, { data: newDepartment }, 201);
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  const { logo = [] } = req.files || {};
  try {
    const department = await DepartmentModel.findById(id);
    const updatedDepartment = await DepartmentModel.findByIdAndUpdate(
      id,
      {
        name,
        description,
        logo: `${logo[0]?.destination}/${logo[0]?.filename}`,
      },
      { new: true }
    );
    await files
      .deleteFileByPath(`${department?.logo}`)
      .catch((err) => console.log(err));

    return sendSuccessResponse(res, { data: updatedDepartment });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await DepartmentModel.findByIdAndDelete(id);
    await PromptModel.deleteMany({ department: id });
    await QnaModel.deleteMany({ department: id });
    const uploadFiles = await UploadModel.find({ department: id });
    for (let i = 0; i < uploadFiles?.length; i++) {
      await UploadModel.findByIdAndDelete(uploadFiles[i]?._id);
      await Embedding.deleteMany({ documentId: uploadFiles[i]?._id });
      if (uploadFiles[i]?.file) {
        await files
          .deleteFileByPath(
            `${uploadFiles[i]?.file?.destination}/${uploadFiles[i]?.file?.filename}`
          )
          .catch((err) => console.log(err));
      }
    }
    if (department?.logo) {
      await files
        .deleteFileByPath(`${department?.logo}`)
        .catch((err) => console.log(err));
    }
    return sendSuccessResponse(res, "Department deleted successfully.");
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

module.exports = {
  getAllDepartment,
  addDepartment,
  updateDepartment,
  deleteDepartment,
};
