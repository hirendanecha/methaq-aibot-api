var express = require('express');
var router = express.Router();
const authCtrl = require("../../controllers/auth.controller");

//unUsed
router.post(
    "/signup/send-otp",
    authCtrl.sendOtp("signup")
);
router.post(
    "/signup/verify-otp",
    authCtrl.verifyOtp("signup")
);
router.post("/signup", authCtrl.signup);
router.post("/signupwithotp", authCtrl.signupwithotp);
router.post("/login/send-otp", authCtrl.sendOtp("login"));
router.post(
    "/login/verify-otp",
    authCtrl.verifyOtp("login")
);


//Used
router.post("/login", authCtrl.login);

module.exports = router;
