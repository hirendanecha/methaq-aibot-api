var express = require("express");
var router = express.Router();
const authentication = require("../../middleware/authentication");
const { authorization } = require("../../middleware/authorization");
const constants = require("../../utils/constants");
const authRoutes = require("./auth");
const adminRoutes = require("./admin/index.routes");
const protectedRoutes = require("./protected/index");
const publicRoutes = require("./public/index");

// Auth APIs
router.use("/auth", authRoutes);
router.use("/public", publicRoutes);

// Middleware to check token
router.use(authentication);

// Protected Routes
router.use(protectedRoutes);

// Admin Routes
router.use(
  "/admin",
  authorization([
    constants.roles.admin,
    constants.roles.superAdmin,
    constants.roles.supervisor,
    constants.roles.broker,
    constants.roles.agent,
    constants.roles.garage,
  ]),
  adminRoutes
);

module.exports = router;
