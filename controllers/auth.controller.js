const jwt = require("jsonwebtoken");
const UserModel = require("../models/user.model");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/response");
const environment = require("../utils/environment");
const { generateRandomString } = require("../utils/fn");
const dayjs = require("dayjs");
const { sendHtmlEmail } = require("../helpers/email.helper");
const ModuleAcessModel = require("../models/permission.model");

// sign up
exports.signup = async (req, res) => {
  try {
    const { email, password, role, fullName, mobileNumber } = req.body;
    const existingUser = await UserModel.findOne({ email: email });
    if (!existingUser) {
      const user = new UserModel({
        fullName,
        email,
        role,
        password,
        mobileNumber,
      });
      const savedUser = await user.save();
      sendSuccessResponse(res, { data: savedUser, message: "User created successfully" });
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

// sign up with otp
exports.signupwithotp = async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return sendErrorResponse(
        res,
        "Account with that email address already exists.",
        400,
        true,
        true
      );
    } else {
      const user = new UserModel({
        email,
        mobileNumber,
      });
      const savedUser = await user.save();
      sendSuccessResponse(res, { data: savedUser });
    }
  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};

// send otp
exports.sendOtp = (module) => async (req, res) => {
  try {
    const { email, countryCode, mobileNumber, fullName } = req.body;

    const otp = generateRandomString(6, {
      alphabets: false,
      upperCase: false,
    });
    const otpExpiredAt = dayjs().add(10, "minute").toDate();
    const otpRef = generateRandomString(12);
    const condition = (mod) => {
      switch (mod) {
        case "signup":
          return { email, mobileNumber, isParent: true };
        case "login":
          return { email, isParent: true };
        default:
          return {};
      }
    };
    const existUser = await UserModel.findOne(condition("login"));
    if (module === "login") {
      if (!email && !mobileNumber) {
        return sendErrorResponse(
          res,
          "one of the following value is required. email or mobileNumber.",
          400,
          true,
          true
        );
      }
    } else if (module === "signup") {
      if (!email || !mobileNumber) {
        return sendErrorResponse(
          res,
          "email and mobileNumber are required",
          400,
          true,
          true
        );
      }

      if (existUser) {
        return sendErrorResponse(res, "User already registered", 403, true, true);
      }
    }

    const user = await UserModel.findOneAndUpdate(
      condition(module),
      {
        ...(email ? { email } : {}),
        ...(countryCode ? { countryCode } : {}),
        ...(mobileNumber ? { mobileNumber } : {}),
        ...(fullName ? { fullName } : {}),
        otp,
        otpExpiredAt,
        otpRef,
      },
      {
        upsert: true,
        new: true,
      }
    ).exec();
    let mock = false;
    if (user?.mobileNumber) {

      sendSuccessResponse(res, {
        message: "Otp have been sent to your registered mobile number.",
        data: {
          ref: otpRef,
          countryCode: user?.countryCode,
          ...(mock ? { otp } : {}),
          mobileNumber: `XXXXXX${user?.mobileNumber.slice(-4)}`,
          fullName: fullName,
        },
      });
    } else {
      if (user._id) {
        UserModel.findByIdAndRemove(user._id)
          .exec()
          .then(() => { })
          .catch((err) => {
            console.log("Error in removing user");
          });
      }
      return sendErrorResponse(
        res,
        "There is not account with this email, please register.",
        400,
        true,
        true
      );
    }
  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};

// verify otp
exports.verifyOtp = (module) => async (req, res) => {
  try {
    const { email, countryCode, mobileNumber, otp, ref } = req.body;
    if (module === "login") {
      if (!email && !mobileNumber) {
        return sendErrorResponse(
          res,
          "one of the following value is required. email or mobileNumber.",
          400,
          true,
          true
        );
      }
    } else if (module === "signup") {
      if (!email || !mobileNumber) {
        return sendErrorResponse(
          res,
          "email and mobileNumber are required",
          400,
          true,
          true
        );
      }
    }
    const condition = (mod) => {
      switch (mod) {
        case "signup":
          return { email, mobileNumber };
        case "login":
          return { email, };

        default:
          return {};
      }
    };
    const user = await UserModel.findOne(condition(module))
      .select("+otp +otpRef +otpExpiredAt +fullName +email")
      .exec();

    if (!user) {
      return sendErrorResponse(res, "Please register your account first", 400, true, true);
    }

    const sendToken = async () => {
      const token = jwt.sign(
        { _id: user._id, role: user.role },
        environment.jwt.secret,
        { expiresIn: environment.jwt.expiredIn }
      );
      if (!user?.lastLoggedInAt) {
        try {
          const data = {
            serverBaseUrl: environment.server,
            customerName: user?.fullName,
            customerEmail: user?.email,
          };
          //   await sendHtmlEmail(
          //     "views/templates/welcome.ejs",
          //     {
          //       to: user?.email,
          //       subject: `Welcome to the eSanad family!`,
          //     },
          //     data
          //   );
        } catch (error) {
          console.log("Error sending welcome email", error);
        }
      }
      if (!user.subUsersId.includes(user._id)) {
        user.subUsersId = [...user.subUsersId, user._id];
      }
      user.lastLoggedInAt = dayjs().toDate();
      await user.save();
      res.cookie("token", token, { domain: `.${environment.domain}` });
      return sendSuccessResponse(res, {
        message: "verified successfully",
        token,
        data: user,
      });
    };

    // Verification OTP
    if ((environment.nodeEnv !== "production") && (`${otp}`.trim() === "123456")) {
      const newOtp = generateRandomString(6, {
        alphabets: false,
        upperCase: false,
      });
      user
        .updateOne({
          otp: newOtp,
          otpExpiredAt: dayjs().toDate(),
        })
        .exec();
      sendToken();
    } else {
      if (
        user.otp === `${otp}`.trim() &&
        ref === user.otpRef &&
        dayjs(user.otpExpiredAt).isAfter(dayjs())
      ) {
        const newOtp = generateRandomString(6, {
          alphabets: false,
          upperCase: false,
        });
        user
          .updateOne({
            otp: newOtp,
            otpExpiredAt: dayjs().toDate(),
          })
          .exec();
        sendToken();
      } else {
        return sendErrorResponse(res, "Invalid otp or expired", 401, true, true);
      }
    }

  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};

// login
exports.login = async (req, res) => {
  try {
    res.clearCookie("token", { domain: `.${environment.domain}` });
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email }).select(
      "+password"
    );

    if (!user) {
      return sendErrorResponse(res, "We are not aware of this user.", 403, true, true);
    }

    user.comparePassword(password, (err, isMatch) => {
      if (err) {
        return sendErrorResponse(res, "Invalid email or password", 401, true, true);
      }
      if (isMatch) {
        const token = jwt.sign(
          { _id: user._id, role: user.role },
          environment.jwt.secret,
          { expiresIn: environment.jwt.expiredIn }
        );

        const { password: hash, ...data } = user.toJSON();
        res.cookie("token", token, { domain: `.${environment.domain}` });
        return sendSuccessResponse(res, {
          message: "Success! You are logged in.",
          token,
          data,
        });
      }
      return sendErrorResponse(res, "Invalid email or password.", 401, true, true);
    });
  } catch (error) {
    sendErrorResponse(res, error.message);
  }
};