const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TemplateAccessSchema = new Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    templateNames: [{ type: String }],
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },

}, { timestamps: true });


const TemplateAccessModel = mongoose.model("TemplateAccess", TemplateAccessSchema);

module.exports = TemplateAccessModel;
