const files = require("../../helpers/files.helper");
const DepartmentModel = require("../../models/department.model");
const PromptModel = require("../../models/prompt.model");
const QnaModel = require("../../models/qna.model");
const UploadModel = require("../../models/uploade.model");
const UserModel = require("../../models/user.model");
const Embedding = require("../../models/embeddings.modal");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../../utils/response");
const s3 = require("../../helpers/s3.helper");
const dayjs = require("dayjs");
const { deleteDocumentsByMetadata } = require("../../helpers/pineconeupload.helper");

exports.getAllDepartment = async (req, res) => {
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

exports.getParticularDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await DepartmentModel.findById(id).lean();

    return sendSuccessResponse(res, { data: department });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

exports.addDepartment = async (req, res) => {
  try {
    let columns = Object.keys(req.body);
    let columnNames = columns.map((val) => {
      return { [val]: req.body[val] };
    });

    const mergedObject = columnNames.reduce((result, currentObject) => {
      return { ...result, ...currentObject };
    }, {});

    if (req?.files?.logo) {
      const fileData = req.files.logo[0];
      const pathD = fileData?.path;
      const npathD = pathD.replaceAll("\\", "/");

      const month = `${dayjs().year()}-${dayjs().month() + 1}`;
      const url = await s3.uploadPublic(npathD, fileData?.mimetype, `${fileData?.filename}`, `DepartmentLogos/${month}`);
      console.log(url, "url ");

      await files
        .deleteFileByPath(`${npathD.replace("public/", "")}`)
        .catch((err) => console.log(err));

      mergedObject.logo = url;
    };

    const newDepartment = new DepartmentModel({
      ...mergedObject,
    });
    await newDepartment.save();

    return sendSuccessResponse(res, { data: newDepartment }, 201);
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    let columns = Object.keys(req.body);
    let columnNames = columns.map((val) => {
      return { [val]: req.body[val] };
    });

    const mergedObject = columnNames.reduce((result, currentObject) => {
      return { ...result, ...currentObject };
    }, {});

    if (req?.files?.logo) {
      const fileData = req.files.logo[0];
      console.log(fileData, "data")
      const pathD = fileData?.path;
      const npathD = pathD.replaceAll("\\", "/");

      const month = `${dayjs().year()}-${dayjs().month() + 1}`;
      const url = await s3.uploadPublic(npathD, fileData?.mimetype, `${fileData?.filename}`, `DepartmentLogos/${month}`);
      console.log(url, "url ");

      await files
        .deleteFileByPath(`${npathD.replace("public/", "")}`)
        .catch((err) => console.log(err));

      mergedObject.logo = url;

      const department = await DepartmentModel.findById(id).lean();
      await s3.deleteFiles([department?.logo]);
    };

    const updatedDepartment = await DepartmentModel.findByIdAndUpdate(
      id,
      {
        ...mergedObject
      },
      {
        new: true
      }
    );

    return sendSuccessResponse(res, { data: updatedDepartment });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

exports.deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await DepartmentModel.findByIdAndDelete(id);
    await deleteDocumentsByMetadata({ departmentName: department?.name });
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
