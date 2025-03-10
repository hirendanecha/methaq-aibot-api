const axios = require("axios");
const ChatModel = require("../../../models/chat.model");

async function documentStatus() {
  try {
    // const chatDetails = await ChatModel.findOne({ threadId: threadId }).lean();
    const updatedChat = await ChatModel.findOneAndUpdate(
      { threadId: threadId },
      { tags: { $push: "document_received" } },
      { new: true }
    );
    console.log(updatedChat, "documentStatus");

    const documentInfo = "all  ducument uploaded successfully";
    return {
      status: "success",
      message: documentInfo,
    };
  } catch (error) {
    console.error("Error processing image:", error.message);
    return {
      status: "error",
      message: "Failed to process the image. Please try again later.",
    };
  }
}

module.exports = documentStatus;
