const files = require("../../helpers/files.helper");
const DepartmentModel = require("../../models/department.model");
const PromptModel = require("../../models/prompt.model");
const QnaModel = require("../../models/qna.model");
const UploadModel = require("../../models/uploade.model");
const UserModel = require("../../models/user.model");
const Embedding = require("../../models/embeddings.modal");
const { openai } = require("../../services/openai/openai-config/openai-config");
// const { openai } = require("../openai-config/openai-config");

const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../../utils/response");
const s3 = require("../../helpers/s3.helper");
const dayjs = require("dayjs");
const {
  createAssistant,
  updateAssistant,
  deleteAssistant,
  addToolToAssistant,
  enableFIleSearch,
} = require("../../services/openai/controller/openai.assistant.controller");

const {
  toolFunctions,
} = require("../../services/openai/openai-functions/function-schema/functionsSchema");
const { getNextSubDeptId } = require("../../utils/fn");
const ChatModel = require("../../models/chat.model");

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

// exports.addDepartment = async (req, res) => {
//   try {
//     let columns = Object.keys(req.body);
//     let columnNames = columns.map((val) => {
//       return { [val]: req.body[val] };
//     });

//     const mergedObject = columnNames.reduce((result, currentObject) => {
//       return { ...result, ...currentObject };
//     }, {});

//     if (req?.files?.logo) {
//       const fileData = req.files.logo[0];
//       const pathD = fileData?.path;
//       const npathD = pathD.replaceAll("\\", "/");

//       const month = `${dayjs().year()}-${dayjs().month() + 1}`;
//       const url = await s3.uploadPublic(npathD, fileData?.mimetype, `${fileData?.filename}`, `DepartmentLogos/${month}`);
//       console.log(url, "url ");

//       await files
//         .deleteFileByPath(`${npathD.replace("public/", "")}`)
//         .catch((err) => console.log(err));

//       mergedObject.logo = url;
//     };

//     const newDepartment = new DepartmentModel({
//       ...mergedObject,
//     });
//     const savedDepartment = await newDepartment.save();

//     if (savedDepartment) {
//       console.log(savedDepartment, "savedDepartment");

//       const newAssistant = await createAssistant(savedDepartment?.name, savedDepartment?.prompt);
//       console.log(newAssistant, "newAssistant");
//       const updatedDepartment = await DepartmentModel.findByIdAndUpdate(
//         savedDepartment?._id,
//         {
//           assistantDetails: newAssistant?.assistantData,
//         },
//         {
//           new: true,
//         }
//       )
//     }

//     return sendSuccessResponse(res, { data: newDepartment }, 201);
//   } catch (error) {
//     return sendErrorResponse(res, error.message);
//   }
// };

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
      const url = await s3.uploadPublic(
        npathD,
        fileData?.mimetype,
        `${fileData?.filename}`,
        `DepartmentLogos/${month}`
      );
      console.log(url, "url ");

      await files
        .deleteFileByPath(`${npathD.replace("public/", "")}`)
        .catch((err) => console.log(err));

      mergedObject.logo = url;
    }
    if (mergedObject?.isChild && mergedObject?.parentId) {
      const updatedDepartment = await DepartmentModel.findOneAndUpdate(
        { depId: mergedObject?.parentId },
        { isParent: true },
        {
          new: true,
        }
      )
    }
    const newDepartment = new DepartmentModel({
      ...mergedObject,
    });
    const savedDepartment = await newDepartment.save();
    const tools = [];
    if (savedDepartment) {
      console.log(savedDepartment, "savedDepartment");
      for (const id of savedDepartment?.functionId) {
        const toolFunction = toolFunctions[id];
        if (!toolFunction) {
          return sendErrorResponse(
            res,
            `Tool function not found for ID: ${id}`
          );
        }
        tools.push(toolFunction);
      }
      console.log(tools, "tools");

      const newAssistant = await createAssistant(
        savedDepartment?.assistantName,
        " ",
        tools
      );
      const openaiClient = await openai;
      const updatedAssistant = await openaiClient.beta.assistants.update(
        newAssistant?.assistantData?.id,
        {
          tools: tools,
        }
      );
      const updatedDepartment = await DepartmentModel.findByIdAndUpdate(
        savedDepartment?._id,
        {
          assistantDetails: newAssistant?.assistantData,
        },
        {
          new: true,
        }
      );

      //Add tool functions if functionId is provided
      if (req.body.functionId && Array.isArray(req.body.functionId)) {
        for (const functionId of req.body.functionId) {
          await addToolToAssistant(
            {
              body: {
                assistantId: newAssistant?.assistantData?.id,
                functionId: functionId,
              },
            },
            res
          );
        }
      }
    }

    return sendSuccessResponse(res, { data: newDepartment }, 201);
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await DepartmentModel.findById(id).lean();
    if (!department) {
      return sendErrorResponse(res, "Department not found.");
    }
    let columns = Object.keys(req.body);
    let columnNames = columns.map((val) => {
      return { [val]: req.body[val] };
    });

    const mergedObject = columnNames.reduce((result, currentObject) => {
      return { ...result, ...currentObject };
    }, {});

    if (req?.files?.logo) {
      const fileData = req.files.logo[0];
      console.log(fileData, "data");
      const pathD = fileData?.path;
      const npathD = pathD.replaceAll("\\", "/");

      const month = `${dayjs().year()}-${dayjs().month() + 1}`;
      const url = await s3.uploadPublic(
        npathD,
        fileData?.mimetype,
        `${fileData?.filename}`,
        `DepartmentLogos/${month}`
      );
      console.log(url, "url ");

      await files
        .deleteFileByPath(`${npathD.replace("public/", "")}`)
        .catch((err) => console.log(err));

      mergedObject.logo = url;

      await s3.deleteFiles([department?.logo]);
    }

    const updatedDepartment = await DepartmentModel.findByIdAndUpdate(
      id,
      {
        ...mergedObject,
      },
      {
        new: true,
      }
    );

    if (updatedDepartment) {
      // console.log(updatedDepartment, "updatedDepartment")
      const updatedAssistant = await updateAssistant(
        updatedDepartment?.assistantDetails?.id,
        {
          name: updatedDepartment?.assistantName,
          instructions: updatedDepartment?.prompt,
          tools: updatedDepartment?.functionId,
        }
      );
      console.log(updatedAssistant, "updatedAssistant");
    }

    await enableFIleSearch(updatedDepartment?.assistantDetails?.id);
    return sendSuccessResponse(res, { data: updatedDepartment });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

exports.deleteDepartment = async (req, res) => {
  const { id } = req.params;
  try {
    const department = await DepartmentModel.findByIdAndDelete(id);
    console.log(department, "department");
    const deletedAssistant = await deleteAssistant(
      department?.assistantDetails?.id
    );
    // await QnaModel.deleteMany({ department: id });
    const uploadFiles = await UploadModel.find({ department: id });
    for (let i = 0; i < uploadFiles?.length; i++) {
      // await UploadModel.findByIdAndDelete(uploadFiles[i]?._id);
      // await Embedding.deleteMany({ documentId: uploadFiles[i]?._id });
      if (uploadFiles[i]?.file) {
        await files
          .deleteFileByPath(
            `${uploadFiles[i]?.file?.destination}/${uploadFiles[i]?.file?.filename}`
          )
          .catch((err) => console.log(err));
      }
    }
    // if (department?.logo) {
    // await files
    //   .deleteFileByPath(`${department?.logo}`)
    //   .catch((err) => console.log(err));
    // }
    return sendSuccessResponse(res, "Department deleted successfully.");
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

exports.updateDepartmentsWorkingHours = async (req, res) => {
  try {
    const { departmentIds, workingHours, holidays } = req.body;
    console.log(departmentIds, "departmentIdssss");

    for (let i = 0; i < departmentIds?.length; i++) {
      const department = await DepartmentModel.findByIdAndUpdate(departmentIds[i], { ...workingHours ? { workingHours: workingHours } : {}, ...holidays ? { holidays: holidays } : {} }, { new: true });
    }

    return sendSuccessResponse(res, "Working hours updated successfully.");
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
}

exports.getSubDepartmentId = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const departmentDetails = await DepartmentModel.findOne({ depId: departmentId }).lean();
    if (!departmentDetails) {
      return sendErrorResponse(res, "Department not found.");
    }
    const department = await DepartmentModel.findOne({ parentId: departmentDetails?._id }).sort({ createdAt: -1 }).lean();
    let newDeptId = "";
    if (!department) {
      newDeptId = `${departmentId}-A`
    } else {
      newDeptId = getNextSubDeptId(department?.depId);
    }
    if (!newDeptId) {
      return sendErrorResponse(res, "Department is now full.");
    }
    return sendSuccessResponse(res, { data: newDeptId });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
}

exports.transferDepartmentInBulk = async (req, res) => {
  try {
    const { departmentTranferArray } = req.body;
    console.log(req.body, "departmentTranferArray")
    for (let i = 0; i < departmentTranferArray?.length; i++) {
      const { fromDepartment, toDepartment } = departmentTranferArray[i];
      const fromDepartmentDetails = await DepartmentModel.findOne({ _id: fromDepartment }).lean();
      const toDepartmentDetails = await DepartmentModel.findOne({ _id: toDepartment }).lean();
      // const chats = await ChatModel.find({ department: fromDepartmentDetails?._id, tags: "transferred" });
      const chats = await ChatModel.updateMany({ department: fromDepartmentDetails?._id }, { $set: { department: toDepartmentDetails?._id, adminId: null, depId: toDepartmentDetails?.depId } }).lean();
    }
    return sendSuccessResponse(res, { message: "Department transfered successfully." });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
}