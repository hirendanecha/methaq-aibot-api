const { default: mongoose } = require("mongoose");
const ChatModel = require("../../models/chat.model");
const ComplaintModel = require("../../models/complain.model");
const CustomerModel = require("../../models/customer.model");
const {
  getPagination,
  getPaginationData,
  getAssigneeAgent,
  sendMessageToAdmins,
} = require("../../utils/fn");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../../utils/response");
const DepartmentModel = require("../../models/department.model");
const socketObj = require("../../helpers/socket.helper");
const MessageModel = require("../../models/message.model");
const { startChat, continueChat } = require("../typebot/typeBot.controller");
const UserModel = require("../../models/user.model");

const getAllComplaints = async (req, res) => {
  try {
    let { page, size, search } = req.query;
    let { complaintType } = req.body; // <-- Get from body
    search = search?.replace(/^[^a-zA-Z0-9]+/, "");
    const { limit, offset } = getPagination(page, size);

    const query = {};
    if (search) {
      query.$or = [
        { customername: { $regex: search, $options: "i" } },
        { complainstatus: { $regex: search, $options: "i" } },
      ];
    }
    // console.log("complaintType from body:", complaintType);
    // Add complaintType filter if provided
    if (complaintType) {
      query.complainType = Array.isArray(complaintType)
        ? { $in: complaintType }
        : complaintType;
    }


    const count = await ComplaintModel.countDocuments(query);

    const complaints = await ComplaintModel.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return sendSuccessResponse(
      res,
      getPaginationData({ count, docs: complaints }, page, limit)
    );
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const addComplaint = async (req, res) => {
  try {
    const { sessionId } = req.params; // Get session ID from query string

    let chat = null;
    let customer = null;
    let agent = null;

    console.log("sessionid", sessionId);

    // Find the chat document using the session ID
    if (sessionId) {
      chat = await ChatModel.findOne({
        currentSessionId: sessionId,
      }).lean();
    }

    if (chat) {
      //console.log(chat, "srsdg");
      // Retrieve customer details using the customer ID from the chat
      agent = await getAssigneeAgent(
        chat && chat.department
          ? chat.department
          : new mongoose.Types.ObjectId("67e6d17332f102190438fa1d")
      );
      customer = await CustomerModel.findById(chat.customerId);
    }

    // Object"67e6d17332f102190438fa1d"
    // Create a new complaint using the chat ID and customer details
    let uniqueDocuments = [];
    // Check if req.body.complaindocuments exists
    if (req.body.complaindocuments) {
      // Normalize and ensure unique documents
      const normalizedDocuments = req.body.complaindocuments.map((url) =>
        url.trim()
      ); // Trim whitespace
      uniqueDocuments = [...new Set(normalizedDocuments)]; // Ensure uniqueness
    }

    console.log(uniqueDocuments, req.body, "uniqueDocuments");
    const latest = await ComplaintModel.findOne({ complainNumber: { $exists: true } })
      .sort({ createdAt: -1 })
      .select("complainNumber")
      .lean();
    let nextNumber = 1;
    if (latest && latest.complainNumber) {
      const match = latest.complainNumber.match(/^COM(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    const newComplaint = new ComplaintModel({
      chatId: chat ? chat._id : null,
      complainNumber: nextNumber,
      custid: customer ? customer._id : null,
      customername: customer ? customer.name : req.body.customername,
      customeremail: customer ? customer.email : req.body.customeremail,
      customerphone: customer ? customer.phone : req.body.customerphone,
      adminId: agent ? agent._id : null,
      ...req.body,
      complaindocuments: uniqueDocuments,
      // Include any additional details from the request body
    });
    const updatedChat = await ChatModel.findOneAndUpdate({ _id: chat?._id }, {
      $push: { tags: "complaint_submitted" },
    }, { new: true });
    const receivers = await UserModel.find({
      $or: [
        { role: { $in: ["Admin", "Supervisor"] } },
        { department: chat?.department?.toString() },
      ],
    });
    receivers.forEach((receiver) => {
      socketObj.io
        .to(receiver._id?.toString())
        .emit("update-chat", updatedChat);
    });
    const savedComplaint = await newComplaint.save();
    console.log("Saved Complaint:", savedComplaint); // Log the saved complaint
    return sendSuccessResponse(res, { data: savedComplaint });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const transferChatToMainMenu = async (req, res) => {
  try {
    const { sessionId } = req.params; // Get session ID from request parameters

    if (!sessionId) {
      return res.status(400).json({ success: false, message: "Session ID is required." });
    }

    // Find the chat by session ID
    const chat = await ChatModel.findOne({ currentSessionId: sessionId }).lean();
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found." });
    }

    // Get chat details and populate customer information
    const chatDetails = await ChatModel.findById(chat._id).populate("customerId").lean();
    if (!chatDetails) {
      return res.status(404).json({ success: false, message: "Chat details not found." });
    }

    // Create a message indicating the transfer
    const mess = {
      chatId: chatDetails._id,
      sender: null,
      sendType: "admin",
      content: "Chat is transferred to Main Menu",
      attachments: [],
      timestamp: new Date(),
      receiver: chatDetails.customerId?._id?.toString(),
      receiverType: "user",
      messageType: "tooltip",
    };

    // Save the message
    const newMessage = new MessageModel(mess);
    const final = await newMessage.save();
    const startChatResponse = await startChat(" ");
    const sessionIds = startChatResponse?.response?.data?.sessionId;
    const firstMess = await continueChat(sessionIds, sessionIds);

    // Update the chat with new session details
    const updatedChat = await ChatModel.findOneAndUpdate(
      { _id: chatDetails?._id },
      {
        latestMessage: final?._id,
        isHuman: false,
        adminId: null,
        currentSessionId: sessionIds,
        department: null,
      },
      { new: true }
    )
      .populate("adminId customerId")
      .lean();

    // Find receivers to notify
    const receivers = await UserModel.find({
      $or: [
        { role: { $in: ["Admin", "Supervisor"] } },
        {
          _id: {
            $in: [
              chatDetails?.customerId?._id?.toString(),
              chatDetails?.adminId?.toString(),
            ],
          },
        },
        { department: chatDetails?.department?.toString() },
      ],
    });

    // Notify receivers via sockets
    receivers.forEach((receiver) => {
      socketObj.io
        .to(receiver._id?.toString())
        .emit("update-chat", updatedChat);
      socketObj.io
        .to(receiver._id?.toString())
        .emit("message", { ...updatedChat, latestMessage: final });
    });
    // Send success response
    return res.status(200).json({
      success: true,
      message: "Chat transferred to Main Menu successfully.",
    });
  } catch (error) {
    console.error("Error transferring chat to Main Menu:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while transferring the chat.",
      error: error.message,
    });
  }
};
const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params; // Get complaint ID from URL parameters

    // Find the complaint using the complaint ID
    const complaint = await ComplaintModel.findById(id).lean();
    if (!complaint) {
      return sendErrorResponse(res, "Complaint not found", 404, true, true);
    }

    return sendSuccessResponse(res, { data: complaint });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};
const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params; // Get complaint ID from URL parameters
    const { complainstatus } = req.body; // Get the new status from the request body

    // Validate the new status
    if (!["in_progress", "new", "closed"].includes(complainstatus)) {
      return sendErrorResponse(res, "Invalid status value", 400, true, true);
    }

    // Find and update the complaint's status using the complaint ID
    const updatedComplaint = await ComplaintModel.findByIdAndUpdate(
      id,
      { complainstatus },
      { new: true }
    );

    if (!updatedComplaint) {
      return sendErrorResponse(res, "Complaint not found", 400, true, true);
    }
    return sendSuccessResponse(res, { data: updatedComplaint });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const assignAgentToComplaint = async (req, res) => {
  try {
    const { id } = req.params; // Get complaint ID from URL parameters
    const { agentId } = req.body; // Get the agent ID from the request body

    // Validate the agent ID
    if (!agentId) {
      return sendErrorResponse(res, "Agent ID is required", 400, true, true);
    }

    // Find and update the complaint with the agent ID
    const updatedComplaint = await ComplaintModel.findByIdAndUpdate(
      id,
      { adminId: agentId },
      { new: true }
    );

    if (!updatedComplaint) {
      return sendErrorResponse(res, "Complaint not found", 400, true, true);
    }

    return sendSuccessResponse(res, { data: updatedComplaint });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const updateComplaint = async (req, res) => {
  try {
    const { id } = req.params; // Get complaint ID from URL parameters

    // Find and update the complaint using the complaint ID
    const updatedComplaint = await ComplaintModel.findByIdAndUpdate(
      id,
      req.body,
      { new: true }
    );

    if (!updatedComplaint) {
      return sendErrorResponse(res, "Complaint not found", 404, true, true);
    }

    return sendSuccessResponse(res, { data: updatedComplaint });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};
const deleteComplaintById = async (req, res) => {
  try {
    const { id } = req.params; // Get complaint ID from URL parameters

    // Find and delete the complaint using the complaint ID
    const deletedComplaint = await ComplaintModel.findByIdAndDelete(id);
    if (!deletedComplaint) {
      return sendErrorResponse(res, "Complaint not found", 400, true, true);
    }
    return sendSuccessResponse(res, "Complaint deleted successfully");
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const assignDepartmentBySessionId = async (req, res) => {
  try {
    const { sessionId, deptId } = req.body;

    if (!sessionId || !deptId) {
      return res
        .status(400)
        .json({ error: "Session ID and Department ID are required" });
    }

    // Find the chat by session ID
    const chat = await ChatModel.findOne({ currentSessionId: sessionId });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Find the department by depId
    const department = await DepartmentModel.findOne({ depId: deptId });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Update the chat with the new department
    chat.department = department._id;
    chat.depId = department.depId;
    await chat.save();

    const mess2 = {
      chatId: chat._id,
      sender: null,
      receiver: null,
      sendType: "assistant",
      receiverType: "admin",
      messageType: "tooltip",
      content: `Chat is transferred to ${department.name} department`,
    };

    // Send the message to admins
    sendMessageToAdmins(socketObj, mess2, department._id);

    // Send a success response
    res.status(200).json({
      success: true,
      message: "Department assigned successfully",
      chat,
    });
  } catch (error) {
    console.error("Error assigning department:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllComplaints,
  deleteComplaintById,
  updateComplaint,
  addComplaint,
  updateComplaintStatus,
  assignAgentToComplaint,
  getComplaintById,
  assignDepartmentBySessionId,
  transferChatToMainMenu
};
