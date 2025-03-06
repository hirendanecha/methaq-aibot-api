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
exports.addUserMessageWithAttachment = async (
  threadId,
  userMessage,
  fileUrl = null
) => {
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

exports.handleUserMessage = async (
  threadId,
  userMessage,
  assistantId,
  fileUrl = null
) => {
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

    // Send the user message
    const userMessageResponse = await openai.beta.threads.messages.create(
      threadId,
      messagePayload
    );
    console.log("User message added:", userMessageResponse);

    // Run the assistant
    const run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
    });

    if (run.status === "completed") {
      const messages = await openai.beta.threads.messages.list(threadId);
      const aiReply = messages.data.find((m) => m.role === "assistant");
      return aiReply.content[0].text.value;
    } else {
      return "Processing your request...";
    }
  } catch (error) {
    console.error("Error handling user message:", error);
    throw new Error("Failed to handle user message.");
  }
};
