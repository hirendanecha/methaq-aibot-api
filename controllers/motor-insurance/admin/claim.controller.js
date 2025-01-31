const { default: mongoose } = require("mongoose");
const { sendHtmlEmail } = require("../../../helpers/email.helper");
const ClaimModel = require("../../../models/motor-insurance/claim.model");
const UserModel = require("../../../models/user.model");
const environment = require("../../../utils/environment");
const { getPagination, getPaginationData, getCount, getCountA } = require("../../../utils/fn");
const { sendSuccessResponse, sendErrorResponse } = require("../../../utils/response");

const calculateElapsedWorkingHours = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    console.log(start, end);

    // Working hours setup
    const startHour = 9;
    const endHour = 18;
    const hoursPerDay = endHour - startHour;
    const fridayHours = 3;
    const weekendDays = [0, 6]; // Sunday: 0, Saturday: 6

    let totalHours = 0;

    // Loop through each day
    while (start < end) {
        const day = start.getDay();
        const hour = start.getHours();
        console.log(day, hour);

        // Check if it's a working day
        if (!weekendDays.includes(day)) {
            if (day === 5) {
                // Friday (Half day)
                if (hour >= startHour && hour < startHour + fridayHours) {
                    totalHours++;
                }
            } else {
                // Regular working day
                if (hour >= startHour && hour < endHour) {
                    totalHours++;
                }
            }
        }

        // Increment time by one hour
        start.setHours(start.getHours() + 1);
    }

    return totalHours;
};

exports.getAllClaims = async (req, res) => {
    try {
        const { _id: adminId, role } = req.user;
        const user = await UserModel.findById(adminId);

        const { page, size, search } = req.query;
        const { claimStatus, preferredEmiratesOfRepair, overdueType, source } = req.body;
        const { limit, offset } = getPagination(page, size);
        const currentTime = new Date();

        const baseFilters = {
            // ...((role !== "Admin" && role !== "Supervisor") ? { adminId: new mongoose.mongo.ObjectId(adminId) } : {}),
            ...(role === "Agent" 
                ? { 
                    $or: [
                        { adminId: new mongoose.mongo.ObjectId(adminId) },
                        { claimStatus: "New", adminId: null, preferredEmiratesOfRepair: { $in: user?.preferredEmirates } }
                    ]
                } : {
                    ...((role !== "Admin" && role !== "Supervisor" && role !== "Agent") ? { adminId: new mongoose.mongo.ObjectId(adminId) } : {}),
                }),
            ...(claimStatus ? { claimStatus } : {}),
            ...(preferredEmiratesOfRepair ? { preferredEmiratesOfRepair } : {}),
            ...(source ? { source } : {}),
            ...(search ? {
                $or: [
                    { claimNo: new RegExp(search, "i") },
                    { policyNo: new RegExp(search, "i") },
                    { fullName: new RegExp(search, "i") },
                    { email: new RegExp(search, "i") },
                    { mobileNumber: new RegExp(search, "i") },
                ]
            } : {})
        };

        let filteredClaims = await ClaimModel.find(baseFilters).populate("adminId").sort({ createdAt: -1 });

        // Apply overdueType filters
        if (overdueType) {
            filteredClaims = filteredClaims.filter(claim => {
                const elapsedHours = calculateElapsedWorkingHours(claim.createdAt, currentTime);

                switch (overdueType) {
                    case "notOpened24Hours":
                        return claim.claimStatus === "New" && elapsedHours <= 24;

                    case "notOpenedOver24Hours":
                        return claim.claimStatus === "New" && elapsedHours > 24;

                    case "lpoPending3Days":
                        return claim.claimStatus === "Opened" && elapsedHours >= 27; // 27 working hours (3 working days)

                    default:
                        return true; // No filter applied
                }
            });
        } else {
            const count = await getCount(ClaimModel, baseFilters);

            const claims = await ClaimModel.find(baseFilters).populate("adminId").sort({ createdAt: -1 }).skip(offset).limit(limit);

            return sendSuccessResponse(res, getPaginationData({
                count,
                docs: claims
            }, page, limit));
        }

        // Pagination
        const paginatedClaims = filteredClaims.slice(offset, offset + limit);

        return sendSuccessResponse(res, getPaginationData({
            count: filteredClaims.length,
            docs: paginatedClaims
        }, page, limit));
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}

exports.getClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { _id: adminId, role } = req.user;
        const claim = await ClaimModel.findById(claimId).populate('adminId');
        if (claim?.adminId) {
            return sendSuccessResponse(res, { data: claim });
        } else {
            const updateClaim = await ClaimModel.findByIdAndUpdate(claimId,
                {
                    adminId: role !== "Admin" ? adminId : null
                },
                {
                    new: true
                }
            ).populate("adminId");

            return sendSuccessResponse(res, { data: updateClaim })
        }
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}

exports.updateClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const { _id: adminId, role } = req.user;

        if (role !== "Admin" && role !== "Supervisor") {
            return sendErrorResponse(res, "You are not authorized to perform this operation.", 403, true, true);
        }

        // const supervisor = await UserModel.findById(adminId);

        let columns = Object.keys(req.body);
        let columnNames = columns.map((val) => {
            return { [val]: req.body[val] };
        });
        const mergedObject = columnNames.reduce((result, currentObject) => {
            return { ...result, ...currentObject };
        }, {});

        // Check if adminId can be updated
        // if ("adminId" in req.body) {
        //     if (supervisor.role === "Supervisor") {
        //         mergedObject.adminId = req.body.adminId;
        //     } else {
        //         delete mergedObject.adminId;
        //     }
        // }

        if (req?.files?.reportFile?.[0]) {
            mergedObject.reportFile = req.files.reportFile[0];
            const pathT = req.files.reportFile[0]?.path;
            const npathT = pathT.replaceAll("\\", "/");
            mergedObject.reportFile.path = npathT.replace("public/", "");
        }
        if (req?.files?.emiratesIdFile?.[0]) {
            mergedObject.emiratesIdFile = req.files.emiratesIdFile[0];
            const pathT = req.files.emiratesIdFile[0]?.path;
            const npathT = pathT.replaceAll("\\", "/");
            mergedObject.emiratesIdFile.path = npathT.replace("public/", "");
        }
        if (req?.files?.drivingLicenseFile?.[0]) {
            mergedObject.drivingLicenseFile = req.files.drivingLicenseFile[0];
            const pathT = req.files.drivingLicenseFile[0]?.path;
            const npathT = pathT.replaceAll("\\", "/");
            mergedObject.drivingLicenseFile.path = npathT.replace("public/", "");
        }
        if (req?.files?.carRegCardFile?.[0]) {
            mergedObject.carRegCardFile = req.files.carRegCardFile[0];
            const pathT = req.files.carRegCardFile[0]?.path;
            const npathT = pathT.replaceAll("\\", "/");
            mergedObject.carRegCardFile.path = npathT.replace("public/", "");
        }
        if (req?.files?.tradeLicense?.[0]) {
            mergedObject.tradeLicense = req.files.tradeLicense[0];
            const pathT = req.files.tradeLicense[0]?.path;
            const npathT = pathT.replaceAll("\\", "/");
            mergedObject.tradeLicense.path = npathT.replace("public/", "");
        }
        if (req?.files?.imagesOfDamages) {
            let imagesOfDamages = [];
            for (let i = 0; i < req?.files?.imagesOfDamages?.length; i++) {
                let imagesOfDamage = req.files.imagesOfDamages[i];
                const pathT = req.files.imagesOfDamages[i]?.path;
                const npathT = pathT.replaceAll("\\", "/");
                imagesOfDamage.path = npathT.replace("public/", "");
                imagesOfDamages.push(imagesOfDamage);
            }
            mergedObject.imagesOfDamages = imagesOfDamages;
        }

        if (mergedObject?.claimStatus !== "New") {
            mergedObject.statusColor = null;
        }

        const claim = await ClaimModel.findByIdAndUpdate(
            claimId,
            {
                ...mergedObject,
            },
            {
                new: true
            }
        ).populate("adminId");

        // Check if status is accepted
        if (req.body?.claimStatus === "Accepted") {
            (async () => {
                try {
                    const data = {
                        serverBaseUrl: environment.server,
                        customerName: claim?.fullName,
                        customerEmail: claim?.email,
                        claim: claim,
                    };
                    await sendHtmlEmail(
                        "views/templates/claimRequest.ejs",
                        {
                            to: claim?.email,
                            subject: `Claim Request Accepted`,
                        },
                        data
                    );
                } catch (error) {
                    console.log(error);
                }
            })();
        }

        if (req.body?.claimStatus === "Rejected") {
            (async () => {
                try {
                    const data = {
                        serverBaseUrl: environment.server,
                        customerName: claim?.fullName,
                        customerEmail: claim?.email,
                        claim: claim,
                    };
                    await sendHtmlEmail(
                        "views/templates/claimRequest.ejs",
                        {
                            to: claim?.email,
                            subject: `Claim Request Rejected`,
                        },
                        data
                    );
                } catch (error) {
                    console.log(error);
                }
            })();
        }

        if (req.body?.claimStatus === "Opened") {
            (async () => {
                try {
                    const data = {
                        serverBaseUrl: environment.server,
                        customerName: claim?.fullName,
                        customerEmail: claim?.email,
                        claim: claim,
                    };
                    await sendHtmlEmail(
                        "views/templates/claimRequest.ejs",
                        {
                            to: claim?.email,
                            subject: `Claim Request Opened`,
                        },
                        data
                    );
                } catch (error) {
                    console.log(error);
                }
            })();
        }

        if (req.body?.claimStatus === "LPO Sent") {
            (async () => {
                try {
                    const data = {
                        serverBaseUrl: environment.server,
                        customerName: claim?.fullName,
                        customerEmail: claim?.email,
                        claim: claim,
                    };
                    await sendHtmlEmail(
                        "views/templates/claimRequest.ejs",
                        {
                            to: claim?.email,
                            subject: `Claim LPO Sent`,
                        },
                        data
                    );
                } catch (error) {
                    console.log(error);
                }
            })();
        }

        if (req.body?.claimStatus === "LPO Closed") {
            (async () => {
                try {
                    const data = {
                        serverBaseUrl: environment.server,
                        customerName: claim?.fullName,
                        customerEmail: claim?.email,
                        claim: claim,
                    };
                    await sendHtmlEmail(
                        "views/templates/claimRequest.ejs",
                        {
                            to: claim?.email,
                            subject: `Claim LPO Closed`,
                        },
                        data
                    );
                } catch (error) {
                    console.log(error);
                }
            })();
        }
        sendSuccessResponse(res, { data: claim });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}

exports.deleteClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const claim = await ClaimModel.findByIdAndDelete(claimId);
        sendSuccessResponse(res, { data: "Claim Deleted." });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}

exports.claimsStatusWiseCounts = async (req, res) => {
    try {
        const { _id: adminId, role } = req.user;
        const user = await UserModel.findById(adminId);
        const claimStatusNo = await ClaimModel.aggregate([
            {
                $match: {
                    ...(role === "Agent" 
                        ? { 
                            $or: [
                                { adminId: new mongoose.mongo.ObjectId(adminId) },
                                { claimStatus: "New", adminId: null,preferredEmiratesOfRepair: { $in: user?.preferredEmirates } }
                            ]
                        } : {
                            ...((role !== "Admin" && role !== "Supervisor" && role !== "Agent") ? { adminId: new mongoose.mongo.ObjectId(adminId) } : {}),
                        }),
                    // ...((role !== "Admin" && role !== "Supervisor") ? { adminId: new mongoose.mongo.ObjectId(adminId) } : {}),
                }
            },
            {
                $group: {
                    _id: "$claimStatus",
                    statusCount: { $sum: 1 }
                }
            }
        ]);

        sendSuccessResponse(res, { data: claimStatusNo });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
}