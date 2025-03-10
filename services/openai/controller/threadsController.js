const path = require("path");
const multer = require("multer");
const { openai } = require("../openai-config/openai-config");
const fs = require("fs");
const processImage = require("../openai-functions/processImage");
const documentStatus = require("../openai-functions/document_submission_confirmation");
const closeChat = require("../openai-functions/closeChat");
// Create a new thread
exports.createThread = async () => {
  try {
    const thread = await openai.beta.threads.create();
    console.log("Thread Created:", thread.id);
    return thread.id;
  } catch (error) {
    console.error("Error creating thread:", error.message);
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
    console.error("Error adding message:", error.message);
    throw new Error("Failed to add message.");
  }
};
const getActiveRun = async (threadId) => {
  const activeRuns = await openai.beta.threads.runs.list(threadId);
  return activeRuns.data.find((run) => run.status === "active");
};
exports.handleUserMessage = async (
  threadId,
  userMessage = null,
  assistantId,
  fileUrl = null,
  formData,
  prompt
) => {
  try {
    // Validate inputs
    if (!threadId || !assistantId) {
      throw new Error("Thread ID and user message are required.");
    }

    let messageContent = userMessage || "";
    if (fileUrl) {
      messageContent += ` Analyze the file at this URL: ${fileUrl
        ?.map((file) => file.url)
        ?.join(", ")}`;
    }
    // Construct the message payload
    const messagePayload = {
      role: "user",
      content: messageContent,
    };
    console.log(messagePayload, "messagePayload");

    const userMessageResponse = await openai.beta.threads.messages.create(
      threadId,
      messagePayload
    );
    console.log("User message added:", userMessageResponse);
    const activeRun = await getActiveRun(threadId);
    if (activeRun) {
      console.log(`Cancelling active run: ${activeRun.id}`);
      await openai.beta.threads.runs.cancel(activeRun.id, {
        thread_id: threadId,
      });
    }
    // Run the assistant
    let run = await openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: assistantId,
    });
    console.log(run.status, "run.status ankit");

    if (run.status === "requires_action") {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
      console.log(toolCalls, "toolCallstoolCallstoolCalls");

      const toolOutputs = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          console.log(`Function to Call: ${functionName}`, functionArgs);

          let output;

          if (functionName === "processImage") {
            // console.log('Fetching Temperature for:', functionArgs.location);
            output = await processImage(formData, threadId, assistantId);
            //console.log("output :>> ", output);
          } else if (functionName === "checkUserUploadedAllDocs") {
            output = await documentStatus();
          } else if (functionName === "closeChat") {
            output = await closeChat(threadId);
          } else {
            console.warn(`Unknown function called: ${functionName}`);
            output = { error: "Unknown function" };
          }
          return {
            tool_call_id: toolCall.id,
            output: JSON.stringify(output?.message),
          };
        })
      );

      // Submit function response to OpenAI
      await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
        tool_outputs: toolOutputs,
      });

      console.log("Tool outputs submitted. Waiting for final response...");

      // Poll again until Assistant completes processing**
      while (run.status !== "completed") {
        console.log("Waiting for assistant to finish processing...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        run = await openai.beta.threads.runs.retrieve(threadId, run.id);
      }
    }
    if (run.status === "completed") {
      const messages = await openai.beta.threads.messages.list(threadId);
      const aiReply = messages.data.find((m) => m.role === "assistant");
      return aiReply.content[0].text.value;
    } else {
      return "Processing your request...";
    }
  } catch (error) {
    console.error("Error handling user message:", error.message);
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
        const filePathT = filePath.replaceAll("\\", "/");
        const newFilePathT = newFilePath.replaceAll("\\", "/");
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
    console.error("Error: createVectorStore", error.message);
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
    console.error("Error updating assistant:", error.message);
    throw new Error(`Failed to update assistant: ${error.message}`);
  }
};
