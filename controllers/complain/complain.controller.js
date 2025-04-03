const { default: mongoose } = require("mongoose");
const ChatModel = require("../../models/chat.model");
const ComplaintModel = require("../../models/complain.model");
const CustomerModel = require("../../models/customer.model");
const {
  getPagination,
  getPaginationData,
  getAssigneeAgent,
} = require("../../utils/fn");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../../utils/response");

const getAllComplaints = async (req, res) => {
  try {
    let { page, size } = req.query;
    // search = search?.replace(/^[^a-zA-Z0-9]+/, "");
    const { limit, offset } = getPagination(page, size);

    const count = await ComplaintModel.countDocuments();

    const complaints = await ComplaintModel.find();
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
    const newComplaint = new ComplaintModel({
      chatId: chat ? chat._id : null,
      custid: customer ? customer._id : null,
      customername: customer ? customer.name : req.body.customername,
      customeremail: customer ? customer.email : req.body.customeremail,
      customerphone: customer ? customer.phone : req.body.customerphone,
      adminId: agent ? agent._id : null,
      ...req.body, // Include any additional details from the request body
    });

    const savedComplaint = await newComplaint.save();
    return sendSuccessResponse(res, { data: savedComplaint });
  } catch (error) {
    return sendErrorResponse(res, error.message);
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

module.exports = {
  getAllComplaints,
  deleteComplaintById,
  updateComplaint,
  addComplaint,
  updateComplaintStatus,
  assignAgentToComplaint,
  getComplaintById,
};
