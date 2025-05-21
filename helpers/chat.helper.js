const Chat = require("../models/chat.model");

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

const detectLanguage= async (text)=> {
  const arabicRegex = /[\u0600-\u06FF]/; // Arabic Unicode range
  if (!text || typeof text !== 'string') return "english"; // Default to English
  return arabicRegex.test(text) ? "arabic" : "english";
}

module.exports = { getChatHistory, logTransfer, updateChatStatus,detectLanguage };
