const ModuleAcessModel = require("../models/permission.model");
const { sendErrorResponse } = require("../utils/response");

exports.authorization = (roles) => {
  return async (req, res, next) => {
    try {
      if (!roles.includes(req.user.role)) {
        throw new Error("You are not authorized to perform this operation");
      }
      next();
    } catch (error) {
      sendErrorResponse(res, error.message, 403);
    }
  };
};

exports.permissionAuthorization = (moduleName, permission, specialpermission = []) => {
  return async (req, res, next) => {
    try {
      if (specialpermission?.length > 0 && specialpermission.includes(req.user.role)) {
        next();
        return;
      }
      const [module, per] = moduleName.split(".");

      const permissions = await ModuleAcessModel.findOne({ userId: req.user._id });
      if (permissions && module && per) {
        const assignedPermissions = permissions[module.trim()][per.trim()];
        const allowed = permission.every((p) => assignedPermissions[p]);
        console.log(allowed, "allowed");
        if (!allowed) {
          return sendErrorResponse(res, "You are not authorized to perform this operation", 403);
        }
      }
      else {
        return sendErrorResponse(res, "Don't have permission", 500);
      }

      next();
    } catch (error) {
      sendErrorResponse(res, error.message, 403);
    }
  }
}