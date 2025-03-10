const axios = require("axios");
const ChatModel = require("../../../models/chat.model");

async function documentStatus(threadId) {
  try {
    // const chatDetails = await ChatModel.findOne({ threadId: threadId }).lean();
    const updatedChat = await ChatModel.findOneAndUpdate(
      { _id: chat._id },
      {
        status: "archived",
        adminId: null,
        isHuman: false,
        department: null,
      },
      { new: true }
    ).lean();
    //console.log(updatedChat, "documentStatus");

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
