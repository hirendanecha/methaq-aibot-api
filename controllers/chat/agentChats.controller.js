const Chat = require("../../models/chat.model");

const getAgentChats = async (req, res) => {
  try {
    const { agentId } = req.body;
    const query = agentId ? { agentId } : { agentId: null };

    const chats = await Chat.find(query).sort({ "messages.timestamp": -1 });

    res.status(200).json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
// const getAgentChats = async (req, res) => {
//   try {
//     const { agentId } = req.query;

//     if (!agentId) {
//       return res.status(400).json({ error: "Agent ID is required" });
//     }

//     // Fetch chats assigned to the agent
//     const chats = await Chat.find({ agentId }).lean();

//     // Fetch latest messages for each chat
//     const chatList = await Promise.all(
//       chats.map(async (chat) => {
//         const lastMessage = await Message.findOne({ chatId: chat._id })
//           .sort({ "messages.timestamp": -1 })
//           .lean();

//         return {
//           id: chat._id,
//           name: `User ${chat.userId.slice(-4)}`, // Placeholder, replace with actual name if available
//           thumb: "/images/profile/user-placeholder.jpg", // Placeholder avatar
//           status: "online", // Static, change if you track user status
//           lastMessage: lastMessage ? lastMessage.messages.slice(-1)[0] : null,
//         };
//       })
//     );

//     res.json(chatList);
//   } catch (error) {
//     console.error("Error fetching agent chats:", error);
//     res.status(500).json({ error: "Failed to fetch chats" });
//   }
// };

const getSingleUserChat = async (req, res) => {
  try {
    const { chatId } = req.body;
    console.log("chatId", chatId);
    
    const chat = await Chat.findById(chatId).select("messages");

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.status(200).json(chat.messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

module.exports = { getAgentChats, getSingleUserChat};
