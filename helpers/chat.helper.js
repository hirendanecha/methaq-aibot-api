const Chat = require("../models/chat.model");
const { ChatOpenAI } = require("@langchain/openai");

const getChatHistory = async (chatId) => {
  const chat = await Chat.findById(chatId).populate("messages");
  return chat.messages;
};

const logTransfer = async (chatId, transferDetails) => {
  const chat = await Chat.findById(chatId);
  chat.transfers.push(transferDetails);
  await chat.save();
};

const updateChatStatus = async (chatId, status) => {
  console.log("status", status);
  console.log("chatId", chatId);

  const chat = await Chat.findByIdAndUpdate(chatId, status, { new: true });
  // console.log("chat updated", chat);
  return chat;
};

const detectLanguage = async (message) => {
  const lowerCaseMessage =
    typeof message === "string"
      ? message.trim().toLowerCase().split(/\s+/).join(" ")
      : "";

  if (!lowerCaseMessage) return "english"; // default fallback

  const openai = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini", // Or gpt-3.5-turbo, gpt-4-0314, or your preferred model.
    temperature: 0.0, // Set temperature low for more deterministic results.
    timeout: 15000,
    maxRetries: 3,
    // cache: true, // Consider carefully if you want caching; it can lead to stale results.
  });
  const languagePrompt = `
You are a language detection assistant.

Analyze the following message and determine whether it is written in English or Arabic.

If the message is in **Arabic**, respond with only: "arabic"  
If the message is in **English**, respond with only: "english"  
If you're unsure or if it's a mix, respond with: "english" by default.

Do not provide any other text or explanation.

Message: ${lowerCaseMessage}

Respond with only "english" or "arabic".

`;
  const response = await openai.invoke([
    { role: "user", content: languagePrompt },
  ]);

  const result = response.content?.trim().toLowerCase();
  return result === "arabic" ? "arabic" : "english"; // Fallback to english
};

module.exports = {
  getChatHistory,
  logTransfer,
  updateChatStatus,
  detectLanguage,
};
