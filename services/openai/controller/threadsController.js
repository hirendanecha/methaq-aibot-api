const openai = require("../openai-config/openai-config.js");

// Create a new thread
exports.createThread = async () => {
  try {
    const thread = await openai.beta.threads.create();
    console.log("Thread Created:", thread.id);
    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error);
    throw new Error("Failed to create thread.");
  }
};
// Add a user message with an optional attachment to a thread
exports.addUserMessageWithAttachment =
  async function addUserMessageWithAttachment(
    threadId,
    userMessage,
    fileUrl = null
  ) {
    try {
      // Validate inputs
      if (!threadId || !userMessage) {
        throw new Error("Thread ID and user message are required.");
      }

      // Construct the message payload
      const messagePayload = {
        role: "user",
        content: userMessage,
      };

      // Add attachment if fileUrl is provided
      if (fileUrl) {
        messagePayload.attachments = [{ file_url: fileUrl }];
      }

      // Send the message
      const message = await openai.beta.threads.messages.create(
        threadId,
        messagePayload
      );
      console.log("Message added:", message);
      return message;
    } catch (error) {
      console.error("Error adding message:", error);
      throw new Error("Failed to add message.");
    }
  };
