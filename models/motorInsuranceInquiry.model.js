const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const MotorInsuranceInquiry = new Schema(
  {
    custid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "customers",
      // required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chat",
      // required: true,
    },
    motorInquiryType: { type: String, default: "" },
    customername: { type: String },
    customeremail: { type: String },
    customerphone: { type: String },
    motorInquirydesc: { type: String },
    motorInquirydocuments: [{ type: String }], // Assuming documents are stored as URLs or file paths
    motorInquirystatus: {
      type: String,
      enum: ["new", "in_progress", "closed"],
      default: "new",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const MotorInsuranceInquiryModel = mongoose.model("motor_insurance_inquiry", MotorInsuranceInquiry);

module.exports = MotorInsuranceInquiryModel;
