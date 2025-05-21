const { Agenda } = require("@hokify/agenda");
const ChatModel = require("../models/chat.model");
const environment = require("../utils/environment");

const DB_URI = environment.database.uri;

const agenda = new Agenda({ db: { address: DB_URI, collection: "cronjobs" } });

agenda.define("archive old chats", async (job) => {
    const jobName = job.attrs.name;
    console.log(`Running job: ${jobName}`);
    const { chatId } = job.attrs.data;
    console.log(chatId, "chatId1111111111");
    const chat = await ChatModel.findByIdAndUpdate(chatId, {
        status: "archived",
        currentSessionId: null,
        adminId: null,
        isHuman: false,
        department: null,
    });
    console.log(chat, "archived chat in cronjob");
});

// agenda.define("not replying", async (job) => {

//     const aggregate = [];
//     const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

//     aggregate.push({
//         $lookup: {
//             from: "messages",
//             localField: "latestMessage",
//             foreignField: "_id",
//             as: "message",
//         },
//     });

//     aggregate.push({
//         $unwind: {
//             path: "$message",
//             preserveNullAndEmptyArrays: true // Optional: if no message found, still include the chat document
//         }
//     });

//     aggregate.push({
//          $match: {
//             $and: [
//                 {"message.sendType" : "user"},
//                 { "message.timestamp": { $lt: thirtyMinutesAgo } },
//             ]
//         }
//     })

//     aggregate.push({ 
//         $lookup: {
//             from: "users",
//             localField: "adminId",
//             foreignField: "_id",
//             as: "user",
//         },
//     })

//     aggregate.push({
//         $unwind: { 
//             path: "$user",
//             preserveNullAndEmptyArrays: true 
//         }
//         })

//     const chats = await ChatModel.aggregate(aggregate);
//     console.log(chats)
//         //for send mail use chats.user.email

// });


// Start the agenda scheduler
exports.start = async () => {
    try {
        await agenda.start();

        return true;
    } catch (error) {
        console.log("Error: in Agenda starting", error);
    }
};

exports.agenda = agenda;

