const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ClaimSchema = new Schema(
    {
        claimNo: {
            type: String
        },
        claimOpenDate: {
            type: Date,
            default: Date.now
        },
        policyNo: {
            type: String,
        },
        policyStartDate: {
            type: Date
        },
        policyEndDate: {
            type: Date
        },
        registrationNo: {
            type: String
        },
        chassisNo: {
            type: String
        },
        tcfNo: {
            type: String
        },
        proposalNo: {
            type: String
        },
        policyPremium: {
            type: Number
        },
        product: {
            type: String
        },
        imagesOfDamages: [
            {
                type: Object,
                default: []
            }
        ],
        reportFiles: [
            {
                type: Object,
                default: []
            }
        ],
        emiratesIdImages: [
            {
                type: Object,
                default: []
            }
        ],
        registrationCardImages: [
            {
                type: Object,
                default: []
            }
        ],
        drivingLicenseImages: [
            {
                type: Object,
                default: []
            }
        ],
        tradeLicenses: [
            {
                type: Object,
                default: []
            }
        ],
        reportNo: {
            type: String
        },
        lossDateTime: {
            type: Date
        },
        natureOfLoss: {
            type: String
        },
        fullName: {
            type: String
        },
        mobileNumber: {
            type: String
        },
        additionalMobileNumber: {
            type: String
        },
        email: {
            type: String
        },
        source: {
            type: String,
            default: "Web"
        },
        preferredEmiratesOfRepair: {
            type: String
        },
        remarks: {
            type: String
        },
        claimStatus: {
            type: String,
            default: "New",
        },
        reason: {
            type: String,
        },
        adminId: {
            type: Schema.Types.ObjectId,
            ref: "user",
            default: null
        },
        locationoflossemirates: {
            type: String
        },
        vehicletype: {
            type: String
        },
        statusColor: {
            type: String,
        },
        actualClaimNumber: {
            type: String
        }
    },
    {
        timestamps: true,
        versionKey: false,
    }
);

const ClaimModel = mongoose.model("claim", ClaimSchema);

module.exports = ClaimModel;
