const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const constants = require("../utils/constants");

const Schema = mongoose.Schema;

const AgentSchema = new Schema(
  {
    fullName: { type: String },
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
    role: {
      type: String,
      enum: constants.user.roles,
      default: constants.roles.user,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "departments",
    },
    isActive: { type: Boolean, default: false },
    assignChats: [{ type: mongoose.Schema.Types.ObjectId, ref: "Chat" }],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AgentSchema.index({
  emiratesId: "text",
  fullName: "text",
  nationality: "text",
  licenceNo: "text",
});

AgentSchema.pre("save", function save(next) {
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

// AgentSchema.pre("save", function save(next) {
//     const user = this;

//     user.email = user.email.toLowerCase()
//     next();
// });

/**
 * Helper method for getting user's gravatar.
 */
AgentSchema.methods.gravatar = function gravatar(size) {
  if (!size) {
    size = 200;
  }
  if (!this.email) {
    return `https://gravatar.com/avatar/?s=${size}&d=retro`;
  }
  const md5 = crypto.createHash("md5").update(this.email).digest("hex");
  return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

AgentSchema.methods.comparePassword = function comparePassword(
  plainPassword,
  next
) {
  bcrypt.compare(plainPassword, this.password, (err, isMatch) => {
    next(err, isMatch);
  });
};

const AgentModel = mongoose.model("agent", AgentSchema);

module.exports = AgentModel;
