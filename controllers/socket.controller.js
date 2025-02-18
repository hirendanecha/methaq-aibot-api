
const Chat = require("../models/chat.model");

let activeAgent = null;

const handleSocketEvents = (socket, io, data) => {
  console.log("data", data);

   // User sends a message to the agent
   socket.on("user-send-message", (data) => {
    console.log("User message:", data);
    // Emit the message to the agent
    io.emit("receive-message-from-user", data);
  });

  // Agent sends a message to the user
  socket.on("agent-send-message", (data) => {
    console.log("Agent message:", data);
    // Emit the message to the user
    io.emit("receive-message-from-agent", data);
  });
  
  // socket.on("sendMessage", async (msgData) => {
  //   try {
  //     const { message, sender, chatHistory } = msgData;

  //     console.log("Received message:", message, "from", sender, chatHistory);

  //     if (!message || !sender) {
  //       io.to(data.chatId).emit("error", {
  //         error: "Message and sender are required.",
  //       });
  //       return;
  //     }

  //     // find the chat
  //     const chat = await Chat.findOne({userId: data.chatId});

  //     // Check if the message contains keywords to request a human agent
  //     const humanRequestKeywords = [
  //       "connect to human",
  //       "connect with agent",
  //       "connect with human",
  //       "human agent",
  //       "human support",
  //       "human assistance",
  //       "human help",
  //     ];
  //     const lowerCasedMessage = message.toLowerCase();
  //     const isHumanRequest = humanRequestKeywords.some((keyword) =>
  //       lowerCasedMessage.includes(keyword)
  //     );

  //     if (isHumanRequest) {
  //       // Notify the user
  //       io.to(data.chatId).emit("receiveMessage", {
  //         text: "Connecting you to a human agent... You can continue chatting in the meantime.",
  //         richContent: null,
  //         responseType: "text",
  //       });

  //       //update status of chat
  //       await updateChatStatus(chat._id.toString(), { isHandshakeRequested: true });

  //       // update the chat history with the human request message
  //       // await logTransfer(data.chatId, { sender, message });

  //       // Notify the admin/agent side or activate human handling
  //       io.emit("humanRequested", { chatId: data.chatId, sender });

  //       // Optionally, suspend AI handling
  //       // await updateChatStatus(data.chatId, { isHuman: true });

  //       return;
  //     }

  //     // If no human request, proceed with regular AI processing
  //     const response = await handleUserMessage2(message, sender, chatHistory);

  //     console.log("Response:", response);

  //     // Send the response back to the user
  //     io.to(data.chatId).emit("receiveMessage", response);
  //   } catch (error) {
  //     console.error("Error handling socket message:", error);
  //     socket.emit("error", { error: "Internal Server Error" });
  //   }
  // });

  // Handle takeover request
  // socket.on("requestHuman", async ({ chatId, agentId }) => {
  //   try {
  //     activeAgent = agentId;

  //     // Notify the agent and send the chat history
  //     const chatHistory = await getChatHistory(chatId);
  //     io.to(agentId).emit("humanTakeover", {
  //       message: "You are now managing this chat.",
  //       chatHistory,
  //     });

  //     // Notify the user
  //     io.to(chatId).emit("infoMessage", {
  //       message: "You are now speaking with a human agent.",
  //     });

  //     // Suspend AI handling for this chat
  //     await updateChatStatus(chatId, { isHumanActive: true });
  //   } catch (error) {
  //     console.error("Error in requestHuman:", error);
  //     io.to(chatId).emit("error", {
  //       error: "Failed to transfer to human agent.",
  //     });
  //   }
  // });

  // Handle transfer to another agent/department
  // socket.on("transferChat", async ({ chatId, newAgentId, newDepartment }) => {
  //   try {
  //     const chatHistory = await getChatHistory(chatId);

  //     if (newDepartment) {
  //       // Log transfer and notify the user
  //       await logTransfer(chatId, { newDepartment });
  //       io.to(chatId).emit("infoMessage", {
  //         message: `Your chat has been transferred to the ${newDepartment} department.`,
  //       });

  //       // Activate new department AI
  //       activeAgent = null;
  //       io.to(chatId).emit("departmentAI", {
  //         message: "The department's AI assistant is now active.",
  //         chatHistory,
  //       });
  //     } else if (newAgentId) {
  //       // Transfer to another agent
  //       await logTransfer(chatId, { newAgentId });
  //       io.to(newAgentId).emit("humanTakeover", {
  //         message: "You are now managing this chat.",
  //         chatHistory,
  //       });

  //       // Notify the previous agent
  //       io.to(activeAgent).emit("infoMessage", {
  //         message: "Chat has been transferred to another agent.",
  //       });

  //       // Update active agent
  //       activeAgent = newAgentId;
  //     }
  //   } catch (error) {
  //     console.error("Error in transferChat:", error);
  //     io.to(chatId).emit("error", { error: "Failed to transfer chat." });
  //   }
  // });
};

module.exports = { handleSocketEvents };
