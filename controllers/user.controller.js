const ModuleAcessModel = require("../models/permission.model");
const UserModel = require("../models/user.model");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/response");

exports.me = async (req, res) => {
    try {
        const { _id: userId } = req.user;
        const user = await UserModel.findById(userId).lean();
        const permissions = await ModuleAcessModel.findOne({ user: userId }).lean();
        sendSuccessResponse(res, { data: { ...user, permission: permissions } });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};