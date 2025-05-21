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
  if (!text || typeof text !== 'string') return "english"; // default

  const arabicChars = text.match(/[\u0600-\u06FF]/g) || [];
  const englishChars = text.match(/[a-zA-Z]/g) || [];

  // If Arabic characters clearly outnumber English ones
  if (arabicChars.length > englishChars.length) return "arabic";

  return "english";
}

module.exports = { getChatHistory, logTransfer, updateChatStatus,detectLanguage };
