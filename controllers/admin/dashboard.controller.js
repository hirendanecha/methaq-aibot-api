const { format } = require("morgan");
const ClaimModel = require("../../models/motor-insurance/claim.model");
const UserModel = require("../../models/user.model");
const { sendErrorResponse, sendSuccessResponse } = require("../../utils/response");

exports.getDashboardData = async (req, res) => {
    try {
        const { _id, role } = req?.user || {};
        const { startDate, endDate, agentId, moduleAccessRole } = req.body;

        let agents = [];
        let brokers = [];
        let garages = [];
        let extraFilters = {};

        if (moduleAccessRole === "Agent") {
            agents = await UserModel.find({
                role: "Agent"
            });
            extraFilters["adminId"] = {
                $in: agents
            };
        } else if (moduleAccessRole === "Broker") {
            brokers = await UserModel.find({
                role: "Broker"
            });
            extraFilters["adminId"] = {
                $in: brokers
            };
        } else if (moduleAccessRole === "Garage") {
            garages = await UserModel.find({
                role: "Garage"
            });
            extraFilters["adminId"] = {
                $in: garages
            }
        };

        // Total Number of Claims Requests
        const totalClaims = await ClaimModel.countDocuments({
            ...((role !== "Admin" && role !== "Supervisor") ? { adminId: _id } : {}),
            ...(startDate && endDate
                ? {
                    $and: [
                        { createdAt: { $gte: new Date(startDate) } },
                        { createdAt: { $lte: new Date(endDate) } }
                    ],
                }
                : {}),
            ...(agentId ? { adminId: agentId } : {}),
            ...extraFilters,
        });

        // Total Number of Claims Approved
        const totalClaimsApproved = await ClaimModel.countDocuments({
            ...((role !== "Admin" && role !== "Supervisor") ? { adminId: _id } : {}),
            ...(startDate && endDate
                ? {
                    $and: [
                        { createdAt: { $gte: new Date(startDate) } },
                        { createdAt: { $lte: new Date(endDate) } },
                    ],
                }
                : {}),
            ...(agentId ? { adminId: agentId } : {}),
            claimStatus: "Accepted",
            ...extraFilters,
        });

        // Total Number of Claims Rejected
        const totalClaimsRejected = await ClaimModel.countDocuments({
            ...((role !== "Admin" && role !== "Supervisor") ? { adminId: _id } : {}),
            ...(startDate && endDate
                ? {
                    $and: [
                        { createdAt: { $gte: new Date(startDate) } },
                        { createdAt: { $lte: new Date(endDate) } },
                    ],
                }
                : {}),
            ...(agentId ? { adminId: agentId } : {}),
            claimStatus: "Rejected",
            ...extraFilters,
        });


        // Calculate Claim Acceptance Ratio
        const claimAcceptanceRatio = totalClaims
            ? ((totalClaimsApproved / totalClaims) * 100).toFixed(2)
            : 0;

        return sendSuccessResponse(res, {
            data: {
                totalClaims,
                totalClaimsApproved,
                totalClaimsRejected,
                claimAcceptanceRatio
            },
        });
    } catch (error) {
        return sendErrorResponse(res, error.message);
    }
};

exports.getClaimsByDate = async (req, res) => {
    try {
        const { _id, role } = req?.user || {};
        const { startDate, endDate, agentId, moduleAccessRole } = req.body;

        if (!startDate || !endDate) {
            return sendErrorResponse(res, "Start date and end date are required.");
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        // Ensure the end date includes the entire day
        end.setHours(23, 59, 59, 999);

        let agents = [];
        let brokers = [];
        let garages = [];
        let extraFilters = {};

        if (moduleAccessRole === "Agent") {
            agents = await UserModel.find({
                role: "Agent"
            });
            extraFilters["adminId"] = {
                $in: agents
            };
        } else if (moduleAccessRole === "Broker") {
            brokers = await UserModel.find({
                role: "Broker"
            });
            extraFilters["adminId"] = {
                $in: brokers
            };
        } else if (moduleAccessRole === "Garage") {
            garages = await UserModel.find({
                role: "Garage"
            });
            extraFilters["adminId"] = {
                $in: garages
            }
        };

        const claimsData = await ClaimModel.aggregate([
            {
                $match: {
                    ...((role !== "Admin" && role !== "Supervisor") ? { adminId: _id } : {}),
                    ...(agentId ? { adminId: agentId } : {}),
                    ...extraFilters,
                    createdAt: {
                        $gte: start,
                        $lte: end,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                    },
                    totalClaims: { $sum: 1 },
                },
            },
            {
                $sort: {
                    _id: 1,
                },
            },
        ]);

        const formattedData = claimsData.map((item) => ({
            date: item._id,
            totalClaims: item.totalClaims,
        }));

        return sendSuccessResponse(res, {
            data: formattedData,
        });

    } catch (error) {
        return sendErrorResponse(res, "Failed to fetch claims data: " + error.message);
    }
};
