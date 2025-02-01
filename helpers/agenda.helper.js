// const { Agenda } = require("@hokify/agenda");
// const environment = require("../utils/environment");
// const ClaimModel = require("../models/motor-insurance/claim.model");
// const DB_URI = environment.database.uri;

// const agenda = new Agenda({ db: { address: DB_URI, collection: "cronjobs" } });

// const calculateElapsedWorkingHours = (startDate, endDate) => {
//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     console.log(start, end);

//     // Working hours setup
//     const startHour = 9;
//     const endHour = 18;
//     const fridayHours = 4;
//     const weekendDays = [0, 6]; // Sunday: 0, Saturday: 6

//     let totalHours = 0;

//     // Loop through each day
//     while (start < end) {
//         const day = start.getDay();
//         const hour = start.getHours();
//         console.log(day, hour);

//         // Check if it's a working day
//         if (!weekendDays.includes(day)) {
//             if (day === 5) {
//                 // Friday (Half day)
//                 if (hour >= startHour && hour < startHour + fridayHours) {
//                     totalHours++;
//                 }
//             } else {
//                 // Regular working day
//                 if (hour >= startHour && hour < endHour) {
//                     totalHours++;
//                 }
//             }
//         }

//         // Increment time by one hour
//         start.setHours(start.getHours() + 1);
//     }

//     return totalHours;
// };

// agenda.define("update claim status colors", async (job) => {
//     const jobName = job.attrs.name;
//     console.log(`Running job: ${jobName}`);

//     // const claims = await ClaimModel.find({ claimStatus: "New" });
//     const claims = await ClaimModel.find({
//         $or: [
//             { claimStatus: "New" },
//             { claimStatus: "Opened" },
//         ],
//     });
//     const currentTime = new Date();

//     for (const claim of claims) {
//         const elapsedHours = calculateElapsedWorkingHours(claim.createdAt, currentTime);

//         let statusColor = null;

//         // Logic for "New" claims
//         if (claim.claimStatus === "New") {
//             if (elapsedHours >= 48) {
//                 statusColor = "Red";
//             } else if (elapsedHours >= 24) {
//                 statusColor = "Orange";
//             }
//         }

//         // Logic for "Opened" claims not updated to "LPO Sent/Closed"
//         if (
//             claim.claimStatus === "Opened" &&
//             elapsedHours >= 27 // 3 working days
//         ) {
//             statusColor = "Red";
//         }

//         if (statusColor) {
//             await ClaimModel.findByIdAndUpdate(claim._id, { statusColor });
//         }
//     }
// });

// // Start the agenda scheduler
// exports.start = async () => {
//     try {
//         await agenda.start();

//         // Schedule the job to run every 30 minutes
//         await agenda.every(
//             "30 minutes",
//             "update claim status colors",
//             null,
//             {
//                 timezone: "Asia/Dubai",
//             }
//         );

//         return true;
//     } catch (error) {
//         console.log("Error: in Agenda starting", error);
//     }
// };