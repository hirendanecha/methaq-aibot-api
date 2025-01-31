const dayjs = require("dayjs");
const ClaimModel = require("../../models/motor-insurance/claim.model");
const { sendSuccessResponse, sendErrorResponse } = require("../../utils/response");
const { padStartZeroes, removeFile } = require("../../utils/fn");
const CounterModel = require("../../models/counter.model");
const environment = require("../../utils/environment");
const { sendHtmlEmail } = require("../../helpers/email.helper");
const { checkCarRegistrationCard, checkDrivingLicense, checkEmirates } = require("../../services/ocr-api.service");

exports.createClaim = async (req, res) => {
    try {
        let columns = Object.keys(req.body);
        let columnNames = columns.map((val) => {
            return { [val]: req.body[val] };
        });
        const mergedObject = columnNames.reduce((result, currentObject) => {
            return { ...result, ...currentObject };
        }, {});

        const getClaimNo = async () => {
            const file = await CounterModel.findByIdAndUpdate(
                "claimNo",
                {
                    $inc: { seq: 1 },
                },
                {
                    upsert: true,
                    new: true,
                }
            );

            const cities = {
                "Abu Dhabi": "AUH",
                "Dubai": "DXB",
                "Sharjah": "SHJ",
                "Ras Al Khaimah": "RKT",
                "Fujairah": "FJR",
                "Ajman": "AJM",
                "Umm Al Quwain": "UAQ",
                "Al Ain": "AAN",
            };

            const cityCode = cities[mergedObject?.preferredEmiratesOfRepair];
            const month = dayjs().format("MM");
            const year = dayjs().format("YY");

            const filename = "MC-" + `${cityCode}-` + `${month}${year}-` + padStartZeroes(file?.seq, 5);
            return filename;
        };
        const claimNo = await getClaimNo();

        if (req?.files?.reportFiles && req?.files?.reportFiles.length > 0) {
            let reportFiles = [];
            for (let i = 0; i < req?.files?.reportFiles?.length; i++) {
                let reportFile = req.files.reportFiles[i];
                const pathT = reportFile?.path;
                const npathT = pathT.replaceAll("\\", "/");
                reportFile.path = npathT.replace("public/", "");
                reportFiles.push(reportFile);
            }
            mergedObject.reportFiles = reportFiles;
        };

        if (req?.files?.tradeLicenses && req?.files?.tradeLicenses.length > 0) {
            let tradeLicenses = [];
            for (let i = 0; i < req?.files?.tradeLicenses?.length; i++) {
                let tradeLicense = req.files.tradeLicenses[i];
                const pathT = tradeLicense?.path;
                const npathT = pathT.replaceAll("\\", "/");
                tradeLicense.path = npathT.replace("public/", "");
                tradeLicenses.push(tradeLicense);
            }
            mergedObject.tradeLicenses = tradeLicenses;
        };

        if (req?.files?.drivingLicenseImages && req?.files?.drivingLicenseImages.length > 0) {
            let drivingLicenseImages = [];
            for (let i = 0; i < req?.files?.drivingLicenseImages?.length; i++) {
                let drivingLicenseImage = req.files.drivingLicenseImages[i];
                const pathT = drivingLicenseImage?.path;
                const npathT = pathT.replaceAll("\\", "/");
                drivingLicenseImage.path = npathT.replace("public/", "");
                drivingLicenseImages.push(drivingLicenseImage);
            }
            mergedObject.drivingLicenseImages = drivingLicenseImages;
        };

        if (req?.files?.registrationCardImages && req?.files?.registrationCardImages.length > 0) {
            let registrationCardImages = [];
            for (let i = 0; i < req?.files?.registrationCardImages?.length; i++) {
                let carRegCardImage = req.files.registrationCardImages[i];
                const pathT = carRegCardImage?.path;
                const npathT = pathT.replaceAll("\\", "/");
                carRegCardImage.path = npathT.replace("public/", "");
                registrationCardImages.push(carRegCardImage);
            }
            mergedObject.registrationCardImages = registrationCardImages;
        };

        if (req?.files?.emiratesIdImages && req?.files?.emiratesIdImages.length > 0) {
            let emiratesIdImages = [];
            for (let i = 0; i < req?.files?.emiratesIdImages?.length; i++) {
                let emiratesIdImage = req.files.emiratesIdImages[i];
                const pathT = emiratesIdImage?.path;
                const npathT = pathT.replaceAll("\\", "/");
                emiratesIdImage.path = npathT.replace("public/", "");
                emiratesIdImages.push(emiratesIdImage);
            }
            mergedObject.emiratesIdImages = emiratesIdImages;
        }

        if (req?.files?.imagesOfDamages && req?.files?.imagesOfDamages.length > 0) {
            let imagesOfDamages = [];
            for (let i = 0; i < req?.files?.imagesOfDamages?.length; i++) {
                let imagesOfDamage = req.files.imagesOfDamages[i];
                const pathT = imagesOfDamage?.path;
                const npathT = pathT.replaceAll("\\", "/");
                imagesOfDamage.path = npathT.replace("public/", "");
                imagesOfDamages.push(imagesOfDamage);
            }
            mergedObject.imagesOfDamages = imagesOfDamages;
        };

        const NewClaim = new ClaimModel({
            ...mergedObject,
            claimNo
        });
        const Claim = await NewClaim.save();

        (async () => {
            try {
                const data = {
                    serverBaseUrl: environment.server,
                    customerName: Claim?.fullName,
                    customerEmail: Claim?.email,
                    claim: Claim,
                };
                await sendHtmlEmail(
                    "views/templates/claimRequest.ejs",
                    {
                        to: Claim?.email,
                        subject: `Claim Request Received`,
                    },
                    data
                );
            } catch (error) {
                console.log(error);
            }
        })();

        sendSuccessResponse(res, { data: Claim });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

exports.verifyCarRegistrationCard = async (req, res) => {
    try {
        const files = req.files?.files;

        if (!files || files.length === 0) {
            return sendErrorResponse(res, 'No files uploaded', 400);
        }

        // const processedFiles = files.map(file => ({
        //     ...file,
        //     path: file.path.replace(/\\/g, '/')
        // }));
        // console.log(processedFiles, "processedFiles")

        // const response = await checkCarDetection(processedFiles);

        // return sendSuccessResponse(res, { data: response?.data });

        const readFiles = [];
        for (let i = 0; i < files?.length; i++) {
            const file = files[i];
            const pathT = files[i]?.path;
            const npathT = pathT.replaceAll("\\", "/");
            // file.path = npathT.replace("public/", "");
            file.path = npathT;

            // readFiles.push(fs.readFileSync(npathT));
            readFiles.push(file);
        };

        const response = await checkCarRegistrationCard(readFiles);

        return sendSuccessResponse(res, { data: response });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

exports.verifyDrivingLicense = async (req, res) => {
    try {
        const files = req.files?.files;

        if (!files || files.length === 0) {
            return sendErrorResponse(res, 'No files uploaded', 400);
        }

        const readFiles = [];
        for (let i = 0; i < files?.length; i++) {
            const file = files[i];
            const pathT = files[i]?.path;
            const npathT = pathT.replaceAll("\\", "/");
            file.path = npathT;

            readFiles.push(file);
        };

        const response = await checkDrivingLicense(readFiles);

        return sendSuccessResponse(res, { data: response });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

exports.verifyEmiratesId = async (req, res) => {
    try {
        const files = req.files?.files;

        if (!files || files.length === 0) {
            return sendErrorResponse(res, 'No files uploaded', 400);
        }

        const readFiles = [];
        for (let i = 0; i < files?.length; i++) {
            const file = files[i];
            const pathT = files[i]?.path;
            const npathT = pathT.replaceAll("\\", "/");
            file.path = npathT;

            readFiles.push(file);
        };

        const response = await checkEmirates(readFiles);

        return sendSuccessResponse(res, { data: response });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};

exports.getClaim = async (req, res) => {
    try {
        const { claimId } = req.params;
        const claim = await ClaimModel.findById(claimId);
        sendSuccessResponse(res, { data: claim });
    } catch (error) {
        sendErrorResponse(res, error.message);
    }
};