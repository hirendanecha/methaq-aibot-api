
const path = require("path");
const multer = require("multer");
const { openai } = require("../openai-config/openai-config");
const fs = require("fs");
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
  userMessage = null,
  assistantId,
  fileUrl = null
) => {
  try {
    // Validate inputs
    if (!threadId || !assistantId) {
      throw new Error("Thread ID and user message are required.");
    }

    // Construct the message payload
    const messagePayload = {
      role: "user",
      content: userMessage || fileUrl || "",
    };

    // Add attachment if fileUrl is provided
    // if (fileUrl) {
    //   messagePayload.attachments = [{ file_url: fileUrl }];
    // }

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

exports.createVectorStore = async (vectorName, files) => {
  if (!vectorName) {
    throw new Error("Vector store name is required!");
  }

  if (!files || files.length === 0) {
    throw new Error("No files uploaded!");
  }

  try {
    const vectorStore = await openai.beta.vectorStores.create({
      name: vectorName,
    });
    console.log("Vector Store Created:", vectorStore);

    if (vectorStore.id) {
      for (const file of files) {
        const filePath = file.path;
        const originalExtension = path.extname(file.originalname);
        const newFilePath = filePath + originalExtension;
        console.log("newFilePath", newFilePath, filePath);
        const filePathT = filePath.replaceAll("\\", "/")
        const newFilePathT = newFilePath.replaceAll("\\", "/")
        fs.renameSync(filePathT, newFilePathT);

        const fileStream = fs.createReadStream(newFilePath);
        const response = await openai.files.create({
          file: fileStream,
          purpose: "assistants",
        });

        console.log(`Uploaded File ID: ${response.id}`);

        await openai.beta.vectorStores.files.createAndPoll(vectorStore.id, {
          file_id: response.id,
        });

        console.log(`File ${response.id} attached to Vector Store!`);
      }

      return {
        success: true,
        message: "Vector Store created successfully!",
        vectorStore,
      };
    }
  } catch (error) {
    console.error("Error:", error);
    throw new Error(error.message);
  }
};

exports.updateAssistantVectorStore = async (assistantId, vectorStoreId) => {
  if (!vectorStoreId) {
    throw new Error("Vector Store ID is required!");
  }

  try {
    await openai.beta.assistants.update(assistantId, {
      tool_resources: { file_search: { vector_store_ids: [vectorStoreId] } },
    });

    return {
      success: true,
      message: "Vector Store assigned to Assistant!",
      assistantId,
      vectorStoreId,
    };
  } catch (error) {
    console.error("Error updating assistant:", error);
    throw new Error(`Failed to update assistant: ${error.message}`);
  }
};
