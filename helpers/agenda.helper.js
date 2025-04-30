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

