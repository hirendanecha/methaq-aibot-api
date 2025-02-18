const AgentModel = require("../models/agent.model");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/response");

exports.me = async (req, res) => {
    try {
        const { _id: userId } = req.user;
        const user = await AgentModel.findById(userId).lean();
        sendSuccessResponse(res, { data: user });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};