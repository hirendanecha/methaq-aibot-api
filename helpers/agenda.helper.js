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

    const aggregate = [];
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    aggregate.push({
        $lookup: {
            from: "messages",
            localField: "latestMessage",
            foreignField: "_id",
            as: "message",
        },
    });

    aggregate.push({
        $unwind: {
            path: "$message",
            preserveNullAndEmptyArrays: true // Optional: if no message found, still include the chat document
        }
    });

    aggregate.push({
        $match: {
            $and: [
                { "message.sendType": "user" },
                { "message.timestamp": { $lt: thirtyMinutesAgo } },
            ]
        }
    })

    aggregate.push({
        $lookup: {
            from: "users",
            localField: "adminId",
            foreignField: "_id",
            as: "user",
        },
    })

    aggregate.push({
        $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true
        }
    })  

    aggregate.push({ 
        $lookup: {
            from: "customers",
            localField: "customerId",
            foreignField: "_id",
            as: "customer",
        }
    })

    aggregate.push({
        $unwind: {  
            path: "$customer",
            preserveNullAndEmptyArrays: true
        }
    })

    const chats = await ChatModel.aggregate(aggregate);
    console.log(chats)
    //for send mail use chats.user.email

    console.log("Sending email to admin");

    if (chats.length === 0) {
        console.log("No chats found.");
        return;
    }

    for (const chat of chats) {
        if (chat?.user?.email) {
            const email = chat?.user?.email;
            console.log(chat.user.email)
            const adminName = chat?.user?.fullName || "Admin";

            if (!email) {
                console.warn("No email found for chat:", chat._id);
                continue;
            }

            const data = {
                serverBaseUrl: environment.server,
                customerName: adminName,
                emailTitle: "Not Replying chats",
                requestType: "reply chats",
                endorsementType: "Accepted",
                customerName: chat?.customer?.name
            };

            try {
                await sendHtmlEmail(
                    "views/templates/noreply.ejs",
                    {
                        to: email,
                        subject: "Not replying chats",
                    },
                    {data}
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

