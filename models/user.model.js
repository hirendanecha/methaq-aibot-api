const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const constants = require("../utils/constants");

const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    fullName: { type: String },
    arabicName: { type: String },
    gender: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true, // Removes any leading/trailing spaces
      lowercase: true, // Converts to lowercase
    },
    countryCode: { type: String, default: "971" },
    mobileNumber: {
      type: String,
      required: true,
      unique: true,
    },
    password: { type: String, select: false },
    preferredEmirates: [{ type: String }],
    otp: { type: String, select: false },
    otpExpiredAt: { type: Date, select: false },
    otpRef: { type: String, select: false },
    qr: { type: String, select: false },
    qrCreatedOn: { type: String },
    role: {
      type: String,
      enum: constants.user.roles,
      default: constants.roles.user,
    },
    state: {
      type: String,
    },
    city: {
      type: String,
    },
    zip: {
      type: String,
    },
    licenceNo: {
      type: String,
    },
    licenceIssueDate: {
      type: Date,
    },
    licenceExpiryDate: {
      type: Date,
    },
    emiratesIdExpiryDate: {
      type: Date,
    },
    isBlock: {
      type: Boolean,
      default: false,
    },
    dateOfBirth: {
      type: Date,
    },
    emiratesId: {
      type: String,
    },
    nationality: {
      type: String,
    },
    emiratesIdFile: {
      type: Object,
    },
    placeOfIssue: {
      type: String,
    },
    placeOfIssueDL: {
      type: String,
    },
    drivingLicenseFile: {
      type: Object,
    },
    oneYearLicence: {
      type: Boolean,
    },
    customerId: {
      type: String,
    },
    occupation: {
      type: String,
      // default: "Manager",
    },
    address: {
      type: String,
    },
    maritalStatus: {
      type: String,
      // default: "Married",
    },
    responseOCREmirates: {
      type: Object,
    },
    responseOCRDL: {
      type: Object,
    },
    passportNumber: {
      type: String,
    },
    dlTcNo: {
      type: String,
    },
    lastLoggedInAt: {
      type: Date,
    },
    isParent: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
    age: {
      type: Number,
    },
    employer: {
      type: String,
    },
    sourceOfFunds: {
      type: String,
    },
    politicallyExposed: {
      type: Boolean,
    },
    isSupervisor: {
      type: Boolean,
    },
    agentUserType: {
      type: String,
      default: "Agent",
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "departments",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

UserSchema.index({
  emiratesId: "text",
  fullName: "text",
  nationality: "text",
  licenceNo: "text",
});

UserSchema.pre("save", function save(next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }
    bcrypt.hash(user.password, salt, (err, hash) => {
      if (err) {
        return next(err);
      }
      user.password = hash;
      next();
    });
  });
});

// UserSchema.pre("save", function save(next) {
//     const user = this;

//     user.email = user.email.toLowerCase()
//     next();
// });

/**
 * Helper method for getting user's gravatar.
 */
UserSchema.methods.gravatar = function gravatar(size) {
  if (!size) {
    size = 200;
  }
  if (!this.email) {
    return `https://gravatar.com/avatar/?s=${size}&d=retro`;
  }
  const md5 = crypto.createHash("md5").update(this.email).digest("hex");
  return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

UserSchema.methods.comparePassword = function comparePassword(
  plainPassword,
  next
) {
  bcrypt.compare(plainPassword, this.password, (err, isMatch) => {
    next(err, isMatch);
  });
};

const UserModel = mongoose.model("user", UserSchema);

module.exports = UserModel;
