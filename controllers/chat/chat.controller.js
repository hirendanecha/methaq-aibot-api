const dayjs = require("dayjs");
const s3 = require("../../helpers/s3.helper");
const Chat = require("../../models/chat.model");
const User = require("../../models/user.model");
const { sendSuccessResponse, sendErrorResponse } = require("../../utils/response");

// Store chat message
const storeChat = async (req, res) => {
  try {
    const { userId, sender, content, department, messageType } = req.body;

    console.log(req.body);

    if (!userId || !sender || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let chat = await Chat.findOne({ userId });

    // Store the User reply in the database
    if (chat) {
      await Chat.updateOne(
        { _id: chat._id },
        {
          $push: {
            messages: {
              sender: sender,
              content: content,
              messageType: messageType,
            },
          },
        }
      );
    } else {
      const newChat = new Chat({
        userId: userId,
        department: department || "AI",
        isHandshakeRequested: false,
        isHuman: false,
      });
      await newChat.save();
    }

    res.status(200).json({ message: "Chat stored successfully", chat });
  } catch (error) {
    console.error("Error storing chat:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get chat history
const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const chat = await Chat.findOne({ userId });

    if (!chat) {
      return res.status(404).json({ error: "No chat history found" });
    }

    res.status(200).json(chat);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateHandshakeStatus = async (req, res) => {
  try {
    const { userId, isHandshakeRequested } = req.body;
    const agentId = "67a4548fa0abc6f3aa736ae7"; // Fixed agent assignment

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Find chat by userId
    let chat = await Chat.findOne({ userId });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Update handshake status and assign agent
    chat.isHandshakeRequested = isHandshakeRequested;
    chat.agentId = agentId;

    // Log the transfer
    chat.transferLog.push({
      transferredBy: "system", // Can be admin or system
      transferredTo: agentId,
      transferFromDepartment: chat.department,
    });

    await chat.save();

    // Add chat ID to the assigned agent's `assignChats`
    await User.findByIdAndUpdate(
      agentId,
      { $addToSet: { assignChats: chat._id } }, // Avoid duplicate chat IDs
      { new: true }
    );

    // await Chat.updateOne({ userId }, { $set: { isHandshakeRequested } });
    // await Chat.findOneAndUpdate(
    //   { userId },
    //   { isHandshakeRequested },
    //   { new: true }
    // );

    res.json({ success: true, message: "Handshake status updated" });
  } catch (error) {
    console.error("Error updating handshake:", error.message);
    res.status(500).json({ error: "Failed to update handshake" });
  }
};

const updateIsHumanStatus = async (req, res) => {
  try {
    const { userId, isHuman } = req.body;
    console.log(req.body);

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    await Chat.findOneAndUpdate({ userId }, { isHuman }, { new: true });

    res.json({ success: true, message: "isHuman status updated" });
  } catch (error) {
    console.error("Error updating isHuman:", error.message);
    res.status(500).json({ error: "Failed to update isHuman" });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const file = req.files;
    console.log(req.files, "fileeee");
    const uploadFile = req.files.file[0];
    const path = uploadFile.path;
    const npath = path.replaceAll("\\", "/");
    const month = `${dayjs().year()}-${dayjs().month() + 1}`;
    const url = await s3.uploadPublic(
      npath,
      `${uploadFile?.filename}`,
      `ChatDocuments/${month}`
    );
    res
      .status(200)
      .json({ url: url, message: "Document uploaded successfully" });
  } catch (error) {
    console.log(error);

    return res.status(500).json({ error: "Failed to upload document" });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { filePathToDelete } = req.body;
    const deletedDoc = await s3.deleteFiles([filePathToDelete]);
    console.log(deletedDoc, "deletedDoc");
    return res.status(200).json({ message: "Document deleted successfully" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete document" });
  }
};

const archiveChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    };

    chat.status = "archived";
    await chat.save();

    return sendSuccessResponse(res, "Chat archived successfully.");
  } catch (error) {
    console.error("Error archiving chat:", error);
    return sendErrorResponse(res, "Failed to archive chat.");
  }
};

module.exports = {
  storeChat,
  getChatHistory,
  updateHandshakeStatus,
  updateIsHumanStatus,
  uploadDocument,
  deleteDocument,
  archiveChat
};
