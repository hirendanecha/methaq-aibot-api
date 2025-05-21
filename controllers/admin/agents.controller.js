const { default: mongoose } = require("mongoose");
const ChatModel = require("../../models/chat.model");
const MessageModel = require("../../models/message.model");
const ModuleAcessModel = require("../../models/permission.model");
const UserModel = require("../../models/user.model");
const {
  getPagination,
  getCount,
  getPaginationData,
} = require("../../utils/fn");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../../utils/response");

exports.createAgent = async (req, res) => {
  try {
    const { _id: adminId } = req.user;
    const {
      email,
      password,
      role,
      fullName,
      mobileNumber,
      preferredEmirates,
      department,
      workingHours,
      permission,
    } = req.body;

    const adminRole = req.user.role;

    if (adminRole !== "Admin" && adminRole !== "SuperAdmin") {
      return sendErrorResponse(
        res,
        "You are not authorized to perform this operation.",
        403,
        true,
        true
      );
    }

    const existingUser = await UserModel.findOne({
      $or: [{ email: email }],
    });
    console.log(existingUser, "existingUser123");
    if (!existingUser) {
      const user = new UserModel({
        fullName,
        email,
        role,
        password,
        mobileNumber,
        preferredEmirates,
        ...(department && { department }),
        workingHours,
      });
      const savedUser = await user.save();
      const populatedUser = await savedUser.populate("department");
      const permissions = new ModuleAcessModel({
        user: populatedUser._id,
        ...permission,
      });
      await permissions.save();
      console.log(permissions, "permissions");

      return sendSuccessResponse(res, {
        data: populatedUser,
        permission: permissions,
      });
    } else {
      return sendErrorResponse(
        res,
        "Account with that email address already exists.",
        400,
        true,
        true
      );
    }
  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};

exports.getAllAgents = async (req, res) => {
  try {
    const { page, size, search, department } = req.query;
    const { limit, offset } = getPagination(page, size);
    const count = await getCount(UserModel, {
      role: { $nin: ["User", "Admin"] },
      ...(search
        ? {
            $or: [
              { fullName: new RegExp(search, "i") },
              { email: new RegExp(search, "i") },
              { mobileNumber: new RegExp(search, "i") },
            ],
          }
        : {}),
    });
    const users = await UserModel.find({
      role: { $nin: ["User", "Admin"] },
      ...(department ? { department: { $in: department } } : {}),
      ...(search
        ? {
            $or: [
              { fullName: new RegExp(search, "i") },
              { email: new RegExp(search, "i") },
              { mobileNumber: new RegExp(search, "i") },
            ],
          }
        : {}),
    })
      .populate("department")
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 });

    sendSuccessResponse(
      res,
      getPaginationData({ count, docs: users }, page, limit)
    );
  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};

exports.getAgent = async (req, res) => {
  try {
    const { userId } = req.params;
    const agent = await UserModel.findById(userId)
      .populate("department")
      .lean();
    const permission = await ModuleAcessModel.findOne({ user: userId }).lean();
    sendSuccessResponse(res, { data: { ...agent, permission } });
  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};

exports.updateAgents = async (req, res) => {
  try {
    const { _id: adminId, role } = req.user;
    const { userId } = req.params;

    if (role !== "Admin" && role !== "SuperAdmin") {
      return sendErrorResponse(
        res,
        "You are not authorized to perform this operation.",
        403,
        true,
        true
      );
    }

    let columns = Object.keys(req.body);
    let columnNames = columns.map((val) => {
      return { [val]: req.body[val] };
    });
    const mergedObject = columnNames.reduce((result, currentObject) => {
      return { ...result, ...currentObject };
    }, {});

    const updateUser = await UserModel.findByIdAndUpdate(userId, mergedObject, {
      new: true,
    });
    const updatedPermissions = await ModuleAcessModel.findOneAndUpdate(
      { user: updateUser._id },
      {
        ...(mergedObject.permission || {}),
      },
      {
        upsert: true,
        new: true,
      }
    ).lean();
    sendSuccessResponse(res, {
      data: updateUser,
      permission: updatedPermissions,
    });
  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};

// change user password
exports.changePassword = async (req, res) => {
  try {
    const { _id: userId } = req.user;
    const { password, newPassword } = req.body;
    const user = await UserModel.findById(userId).select("+password");
    if (!user) {
      return sendErrorResponse(
        res,
        "We are not aware of this user.",
        500,
        true,
        true
      );
    }
    if (user) {
      user.password = newPassword;
      await user.save();
      sendSuccessResponse(res, { data: user });
    }
  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};

exports.deleteAgent = async (req, res) => {
  try {
    const { _id: adminId, role } = req.user;
    const { userId } = req.params;

    if (role !== "Admin" && role !== "SuperAdmin") {
      return sendErrorResponse(
        res,
        "You are not authorized to perform this operation.",
        403,
        true,
        true
      );
    }

    const deleteUser = await UserModel.findByIdAndDelete(userId);
    sendSuccessResponse(res, { data: "User deleted." });
  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};

// exports.listAllAgent = async (req, res) => {
//     try {
//         const { _id: adminId, role } = req.user;
//         const { claimId } = req.params;

//         const claim = await ClaimModel.findById(claimId);
//         const preferredEmiratesOfRepair = claim?.preferredEmiratesOfRepair;

//         const users = await UserModel.find(
//             {
//                 role: { $in: ["Agent", "Admin", "Supervisor"] },
//                 preferredEmirates: { $in: preferredEmiratesOfRepair }
//             }
//         )
//         sendSuccessResponse(res, { data: users });
//     } catch (error) {
//         sendErrorResponse(res, error.message);
//     }
// }

exports.updatePermissions = async (req, res) => {
  try {
    const { userId, permissions } = req.body;
    const user = await UserModel.findById(userId);
    if (!user) {
      return sendErrorResponse(
        res,
        "We are not aware of this user.",
        500,
        true,
        true
      );
    }
    const updatePermission = await ModuleAcessModel.findOneAndUpdate(
      { user: user?._id },
      {
        ...(permissions || {}),
      },
      {
        upsert: true,
        new: true,
      }
    ).lean();
    sendSuccessResponse(res, { data: updatePermission });
  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};

exports.getChatList = async (req, res) => {
  try {
    const { _id: userId, role } = req.user;
    const {
      limit = 25,
      offset = 0,
      status = "active",
      department,
      search,
      tags,
      isRead,
      customerId,
      sortOrder = "desc",
    } = req.body;

    const userDetails = await UserModel.findById(userId);

    let searchCondition = { status };

    // ✅ Department filter (if passed from frontend)
    if (department?.length > 0) {
      searchCondition.department = {
        $in: department.map(dep => new mongoose.Types.ObjectId(dep)),
      };
    }

    // ✅ Tags filter
    if (tags?.length > 0) {
      searchCondition.tags = { $in: tags };
    }

    // ✅ Role-based restriction for non-admins
    if (role !== "Admin" && role !== "Supervisor") {
      searchCondition.department = {
        $in: userDetails?.department || [],
      };
    }

    // ✅ Filter by customer ID
    if (customerId) {
      searchCondition.customerId = new mongoose.Types.ObjectId(customerId);
    }

    const pipeline = [
      { $match: searchCondition },

      // ✅ Lookup customer details
      {
        $lookup: {
          from: "customers",
          localField: "customerId",
          foreignField: "_id",
          as: "customerId",
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "latestMessage",
          foreignField: "_id",
          as: "latestMessage",
        },
      },
      { $unwind: "$customerId" },

      // ✅ Optional search on name, phone, or message content
      ...(search
        ? [
            {
              $match: {
                $or: [
                  { "customerId.name": { $regex: new RegExp(search, "i") } },
                  { "customerId.phone": { $regex: new RegExp(search, "i") } },
                  { "messages.content": { $regex: new RegExp(search, "i") } },
                ],
              },
            },
          ]
        : []),

      // ✅ Lookup admin user
      {
        $lookup: {
          from: "users",
          localField: "adminId",
          foreignField: "_id",
          as: "adminId",
        },
      },
      { $unwind: { path: "$adminId", preserveNullAndEmptyArrays: true } },

      // ✅ Lookup latest message
     
      { $unwind: { path: "$latestMessage", preserveNullAndEmptyArrays: true } },

      // ✅ Filter by message isRead if specified
      ...(typeof isRead === "boolean"
        ? [
            {
              $match: {
                "latestMessage.isSeen": isRead,
              },
            },
          ]
        : []),

      // ✅ Sort by latest message timestamp
      {
        $sort: { "latestMessage.timestamp": sortOrder === "asc" ? 1 : -1 },
      },

      // ✅ Paginate results
      {
        $facet: {
          totalCount: [{ $count: "count" }],
          paginatedResults: [{ $skip: offset }, { $limit: limit }],
        },
      },
    ];

    const result = await ChatModel.aggregate(pipeline);

    const totalChats = result[0]?.totalCount?.[0]?.count || 0;
    const chats = result[0]?.paginatedResults || [];

    return sendSuccessResponse(
      res,
      getPaginationData({ count: totalChats, docs: chats }, offset, limit)
    );
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

exports.getChatDetails = async (req, res) => {
  try {
    const { chatId } = req.params;
    let attachments = [];
    const chat = await ChatModel.findById(new mongoose.Types.ObjectId(chatId))
      .populate("adminId customerId department currentViewingUser")
      .lean();
    console.log(chat, chatId, "chatchatchat");

    const messages = await MessageModel.find({ chatId: chatId }).lean();
    messages.forEach((message) => {
      if (message?.attachments?.length > 0) {
        attachments.push(...message.attachments);
      }
    });
    return sendSuccessResponse(res, { data: { ...chat, attachments } });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

exports.updateNotesToChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { notes, tags } = req.body;
    const chat = await ChatModel.findById(chatId);
    if (notes) {
      chat.notes = notes;
    }
    if (tags) {
      chat.tags = tags;
    }
    await chat.save();
    return sendSuccessResponse(res, { data: chat });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};
