const mongoose = require("mongoose");
const constants = require("../utils/constants");
const Schema = mongoose.Schema;

const ChatTransferHistorySchema = Schema(
    {
        historyType: [{
            type: String,
            enum: ['department_tranfer', 'agent_tranfer', 'archive_chat', 'change_tags', 'transfer_main_menu', 'transfer_bot'],
            default: ['department_tranfer'],
        }],
        chatId: {
            type: Schema.Types.ObjectId,
            ref: "chat",
            default: null,
        },
        oldDepartment: {
            type: Schema.Types.ObjectId,
            ref: "departments",
            default: null,
        },
        newDepartment: {
            type: Schema.Types.ObjectId,
            ref: "departments",
            default: null,
        },
        oldAgent: {
            type: Schema.Types.ObjectId,
            ref: "user",
            default: null,
        },
        newAgent: {
            type: Schema.Types.ObjectId,
            ref: "user",
            default: null,
        },
        addedBy: {
            type: Schema.Types.ObjectId,
            ref: "user",
            default: null,
        },
        // This both are in minutes
        departmentSpendTime: {
            type: Number,
            default: 0,
        },
        agentSpendTime: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const ChatTransferHistoryModel = mongoose.model("chattransferhistory", ChatTransferHistorySchema);

module.exports = ChatTransferHistoryModel;
