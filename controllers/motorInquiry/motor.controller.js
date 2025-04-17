const { default: mongoose } = require("mongoose");
const ChatModel = require("../../models/chat.model");
const MotorInsuranceInquiryModel = require("../../models/motorInsuranceInquiry.model");
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

const getAllMotorInquiry = async (req, res) => {
  try {
    let { page, size, search } = req.query;
    search = search?.replace(/^[^a-zA-Z0-9]+/, "");
    const { limit, offset } = getPagination(page, size);

    const query = {};
    if (search) {
      query.$or = [
        { customername: { $regex: search, $options: "i" } },
        { motorInquirystatus: { $regex: search, $options: "i" } },
      ];
    }

    const count = await MotorInsuranceInquiryModel.countDocuments(query);

    const motorInsuranceInquiry = await MotorInsuranceInquiryModel.find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return sendSuccessResponse(
      res,
      getPaginationData({ count, docs: motorInsuranceInquiry }, page, limit)
    );
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const addMotorInquiry = async (req, res) => {
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
    if (req.body.motorInquirydocuments) {
      // Normalize and ensure unique documents
      const normalizedDocuments = req.body.motorInquirydocuments.map((url) =>
        url.trim()
      ); // Trim whitespace
      uniqueDocuments = [...new Set(normalizedDocuments)]; // Ensure uniqueness
    }

    console.log(uniqueDocuments, req.body, "uniqueDocuments");

    const newMotorInquiry = new MotorInsuranceInquiryModel({
      chatId: chat ? chat._id : null,
      custid: customer ? customer._id : null,
      customername: customer ? customer.name : req.body.customername,
      customeremail: customer ? customer.email : req.body.customeremail,
      customerphone: customer ? customer.phone : req.body.customerphone,
      adminId: agent ? agent._id : null,
      ...req.body,
      motorInquirydocuments: uniqueDocuments,
      // Include any additional details from the request body
    });

    const savedMotorInquiry = await newMotorInquiry.save();
    console.log("Saved Motor Inquiry:", savedMotorInquiry); // Log the saved complaint
    return sendSuccessResponse(res, { data: savedMotorInquiry });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const getMotorInquiryById = async (req, res) => {
  try {
    const { id } = req.params; // Get complaint ID from URL parameters

    // Find the complaint using the complaint ID
    const motorInquiry = await MotorInsuranceInquiryModel.findById(id).lean();
    if (!motorInquiry) {
      return sendErrorResponse(res, "motor Inquiry not found", 404, true, true);
    }

    return sendSuccessResponse(res, { data: motorInquiry });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const updatMotorInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params; // Get complaint ID from URL parameters
    const { motorInquirystatus } = req.body; // Get the new status from the request body

    // Validate the new status
    if (!["in_progress", "new", "closed"].includes(motorInquirystatus)) {
      return sendErrorResponse(res, "Invalid status value", 400, true, true);
    }

    // Find and update the complaint's status using the complaint ID
    const updatedMotorInquiry =
      await MotorInsuranceInquiryModel.findByIdAndUpdate(
        id,
        { motorInquirystatus },
        { new: true }
      );

    if (!updatedMotorInquiry) {
      return sendErrorResponse(res, "Motor Inquiry not found", 400, true, true);
    }
    return sendSuccessResponse(res, { data: updatedMotorInquiry });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const updatedMotorInquiry = async (req, res) => {
  try {
    const { id } = req.params; // Get complaint ID from URL parameters

    // Find and update the complaint using the complaint ID
    const updatedMotorInquiry =
      await MotorInsuranceInquiryModel.findByIdAndUpdate(id, req.body, {
        new: true,
      });

    if (!updatedMotorInquiry) {
      return sendErrorResponse(res, "motor Inquiry not found", 404, true, true);
    }

    return sendSuccessResponse(res, { data: updatedMotorInquiry });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const deleteMotorInquiryById = async (req, res) => {
  try {
    const { id } = req.params; // Get complaint ID from URL parameters

    // Find and delete the complaint using the complaint ID
    const deletedMotorInquiry =
      await MotorInsuranceInquiryModel.findByIdAndDelete(id);
    if (!deletedMotorInquiry) {
      return sendErrorResponse(res, "motor Inquiry not found", 400, true, true);
    }
    return sendSuccessResponse(res, "motor Inquiry deleted successfully");
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const assignAgentToMotorInquiry = async (req, res) => {
  try {
    const { id } = req.params; // Get complaint ID from URL parameters
    const { agentId } = req.body; // Get the agent ID from the request body

    // Validate the agent ID
    if (!agentId) {
      return sendErrorResponse(res, "Agent ID is required", 400, true, true);
    }

    // Find and update the complaint with the agent ID
    const updatedMotorInquiry =
      await MotorInsuranceInquiryModel.findByIdAndUpdate(
        id,
        { adminId: agentId },
        { new: true }
      );

    if (!updatedMotorInquiry) {
      return sendErrorResponse(res, "Motor Inquiry not found", 400, true, true);
    }

    return sendSuccessResponse(res, { data: updatedMotorInquiry });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};


module.exports = {
    getAllMotorInquiry,
    deleteMotorInquiryById,
    updatedMotorInquiry,
    addMotorInquiry,
    updatMotorInquiryStatus,
    assignAgentToMotorInquiry,
    getMotorInquiryById,
  };