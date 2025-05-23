const { Agenda } = require("@hokify/agenda");
const ChatModel = require("../models/chat.model");
const environment = require("../utils/environment");
const { sendHtmlEmail } = require("./email.helper");
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

agenda.define("not replying", async (job) => {

    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const aggregate = [
        {
            $lookup: {
                from: "messages",
                localField: "latestMessage",
                foreignField: "_id",
                as: "latestMessage",
            },
        },
        {
            $unwind: {
                path: "$latestMessage",
                preserveNullAndEmptyArrays: true // Optional: if no message found, still include the chat document
            }
        },
        {
            $match: {
                $and: [
                    { "latestMessage.sendType": "user" },
                    { "latestMessage.timestamp": { $lt: thirtyMinutesAgo } },
                ]
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "adminId",
                foreignField: "_id",
                as: "adminId",
            },
        },
        {
            $unwind: {
                path: "$adminId",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: "customers",
                localField: "customerId",
                foreignField: "_id",
                as: "customerId",
            }
        },
        {
            $unwind: {
                path: "$customerId",
                preserveNullAndEmptyArrays: true
            }
        }
    ];


    const chats = await ChatModel.aggregate(aggregate);
    const unreadChats = {};
    for (const chat of chats) {
        if (chat?.adminId?._id) {
            unreadChats[chat?.adminId?._id?.toString()] = Array.isArray(unreadChats[chat?.adminId?._id?.toString()]) ? unreadChats[chat?.adminId?._id?.toString()].push(chat) : [chat];
        }
    }
    console.log(unreadChats, "sdgdfg")
    //for send mail use chats.user.email


    if (chats.length === 0) {
        console.log("No chats found.");
        return;
    }

    for (const admin of Object.keys(unreadChats)) {
        const chats = unreadChats[admin];
        const customers = chats?.map((chat) => chat?.customerId?.name);
        const adminMail = chats[0]?.adminId?.email;
        const adminName = chats[0]?.adminId?.fullName;
        console.log(adminMail, "Sending email to admin");
        if (adminMail) {
            const data = {
                serverBaseUrl: environment.server,
                adminName: adminName,
                emailTitle: "Not Replying chats",
                requestType: "reply chats",
                customersName: customers
            };

            try {
                await sendHtmlEmail(
                    "views/templates/noreply.ejs",
                    {
                        to: adminMail,
                        subject: "Not replying chats",
                    },
                    { data }
                );
                console.log(`Email sent to ${email}`);
            } catch (error) {
                console.error(`Failed to send email to ${email}`, error);
            }
        }
    }
});


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

