
const path = require("path");
const multer = require("multer");
const { openai } = require("../openai-config/openai-config");
const fs = require("fs");
const processImage = require("../openai-functions/processImage");
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
const getActiveRun = async (threadId) => {
  const activeRuns = await openai.beta.threads.runs.list(threadId);
  return activeRuns.data.find(run => run.status === "active");
};

const messageQueues = new Map();
const processingThreads = new Map();
const messageResponses = new Map();

const runAssistant = async (threadId, assistantId, formData) => {
  try {
    const runs = await openai.beta.threads.runs.list(threadId);
    const activeRun = runs.data.find(run =>
      ['in_progress', 'queued', 'requires_action'].includes(run.status)
    );

    if (activeRun) {
      console.log(`Found active run ${activeRun.id}, cancelling`);
      await openai.beta.threads.runs.cancel(threadId, activeRun.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    let run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId
    });
    
    while (['in_progress', 'queued', 'requires_action'].includes(run.status)) {
      console.log(`Run status: ${run.status}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      run = await openai.beta.threads.runs.retrieve(threadId, run.id);

      if (run.status === "requires_action") {
        console.log("Function call required.");

        const toolCalls = run.required_action.submit_tool_outputs.tool_calls;

        const toolOutputs = await Promise.allSettled(
          toolCalls.map(async (toolCall) => {
            try {
              const functionName = toolCall.function.name;
              const functionArgs = JSON.parse(toolCall.function.arguments);
              console.log(`Calling Function: ${functionName}`, functionArgs);

              let output;
              if (functionName === "processImage") {
                output = await processImage(formData, threadId, assistantId);
              } else {
                console.warn(`Unknown function: ${functionName}`);
                output = { error: "Unknown function" };
              }

              return {
                tool_call_id: toolCall.id,
                output: JSON.stringify(output),
              };
            } catch (error) {
              console.error("Error executing function:", error);
              return { tool_call_id: toolCall.id, output: JSON.stringify({ error: "Function execution failed" }) };
            }
          })
        );

        const validOutputs = toolOutputs
          .filter(result => result.status === "fulfilled")
          .map(result => result.value);

        if (validOutputs.length > 0) {
          await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
            tool_outputs: validOutputs,
          });
          console.log("Tool outputs submitted. Waiting for final response...");
        }
      }

      if (run.status === "failed") {
        console.error("Run failed:", run.last_error);
        return "The assistant encountered an error processing your request.";
      }

      const messages = await openai.beta.threads.messages.list(threadId);
      const aiReply = messages.data.find(m => m.role === "assistant");

      return aiReply ? aiReply.content[0].text.value : "No response from the assistant.";
    }

  } catch (error) {
    console.error(error);
  }
}

const processMessageQueue = async (threadId, formData) => {
  processingThreads.set(threadId, true);

  try {
    const queue = messageQueues.get(threadId);

    while (queue.length > 0) {
      const currentMessage = queue[0];
      console.log(`Processing message ${currentMessage.messageId} for thread ${threadId}, ${queue.length} messages remaining in queue`);
      const messagePayload = {
        role: "user",
        content: currentMessage?.userMessage,
      };
      const userMessageResponse = await openai.beta.threads.messages.create(
        threadId,
        messagePayload
      );

      // Process with assistant
      try {
        // let run = await openai.beta.threads.runs.createAndPoll(threadId, {
        //   assistant_id: assistantId,
        // });
        const response = await runAssistant(threadId, currentMessage.assistantId, formData);
        console.log(`Message ${currentMessage.messageId} processed successfully for thread ${threadId}`);

        const responseHandler = messageResponses.get(currentMessage.messageId);
        if (responseHandler) {
          responseHandler.resolve(response);
        }
      } catch (error) {
        console.error(`Error processing message ${currentMessage.messageId} for thread ${threadId}:`, error);

        const responseHandler = messageResponses.get(currentMessage.messageId);
        if (responseHandler) {
          responseHandler.resolve("Sorry, there was an error processing your message.");
        }
      }

      // Remove processed message from queue
      queue.shift();
    }
  } catch (error) {
    console.error(`Error processing message queue for thread ${threadId}:`, error);
  } finally {
    processingThreads.set(threadId, false);
    console.log(`Finished processing queue for thread ${threadId}`);
  }
}


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
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(messageId, "messageIdmessageId")
    let resolveResponsePromise;
    const responsePromise = new Promise(resolve => {
      resolveResponsePromise = resolve;
    });

    messageResponses.set(messageId, {
      promise: responsePromise,
      resolve: resolveResponsePromise
    });

    if (!messageQueues.has(threadId)) {
      messageQueues.set(threadId, []);
    }

    let messageContent = userMessage || "";
    if (fileUrl) {
      messageContent += ` Analyze the file at this URL: ${fileUrl}`;
    }

    messageQueues.get(threadId).push({
      messageId,
      userMessage: messageContent,
      assistantId
    });

    if (!processingThreads.get(threadId)) {
      processMessageQueue(threadId, formData);
    }

    try {
      const aiResponse = await responsePromise;
      return aiResponse
    } catch (error) {
      console.error("Error getting AI response:", error);
      return "Failed to get AI response"
    } finally {
      messageResponses.delete(messageId);
    }


    // Construct the message payload
    // const messagePayload = {
    //   role: "user",
    //   content: messageContent,
    // };

    // Add attachment if fileUrl is provided
    // if (fileUrl) {
    //   messagePayload.attachments = [{ file_url: fileUrl }];
    // }

    // Send the user message
    // const userMessageResponse = await openai.beta.threads.messages.create(
    //   threadId,
    //   messagePayload
    // );
    // console.log("User message added:", userMessageResponse);
    // const activeRun = await getActiveRun(threadId);
    // if (activeRun) {
    //   console.log(`Cancelling active run: ${activeRun.id}`);
    //   await openai.beta.threads.runs.cancel(activeRun.id, { thread_id: threadId });
    // }
    // Run the assistant
    // let run = await openai.beta.threads.runs.createAndPoll(threadId, {
    //   assistant_id: assistantId,
    // });
    // console.log(run.status, "run.status");
    // if (run.status === "requires_action") {
    //   // Extract the required function call
    //   const functionCall =
    //     run.required_action.submit_tool_outputs.tool_calls[0];
    //   let xyz = "";
    //   if (functionCall) {
    //     const functionName = functionCall.function.name;
    //     const functionArgs = JSON.parse(functionCall.function.arguments);

    //     console.log(`Function to Call: ${functionName}`, functionArgs);
    //     let functionResult;
    //     switch (functionName) {
    //       case "processImage":
    //         console.log("hey i am function");

    //         functionResult = await processImage(formData, threadId, assistantId);
    //         xyz = {
    //           tool_call_id: functionCall.id,
    //           output: JSON.stringify(functionResult?.message),
    //         };


    //         // const messagePayload = {
    //         //   role: "user",
    //         //   content: functionResult?.message,
    //         // };
    //         // const userMessageResponse = await openai.beta.threads.messages.create(
    //         //   threadId,
    //         //   messagePayload
    //         // );
    //         // const run = await openai.beta.threads.runs.createAndPoll(threadId, {
    //         //   assistant_id: assistantId,
    //         // });
    //         if (run.status === "completed") {
    //           const messages = await openai.beta.threads.messages.list(threadId);
    //           const aiReply = messages.data.find((m) => m.role === "assistant");
    //           return aiReply.content[0].text.value;
    //         }
    //         break;
    //       default:
    //         console.error("Unknown function:", functionName);
    //         return "Unknown function call.";
    //     }
    //     await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
    //       tool_outputs: [xyz],
    //     });
    //     while (run.status !== "completed") {
    //       console.log("Waiting for assistant to finish processing...");
    //       await new Promise((resolve) => setTimeout(resolve, 2000));
    //       run = await openai.beta.threads.runs.retrieve(threadId, run.id);
    //     }
    //     // console.log(functionResult);
    //     return functionResult?.message;
    //     //aiResponse = functionResult;
    //   }
    // }
    // if (run.status === "requires_action") {
    //   const toolCalls = run.required_action.submit_tool_outputs.tool_calls;

    //   const toolOutputs = await Promise.all(
    //     toolCalls.map(async (toolCall) => {
    //       const functionName = toolCall.function.name;
    //       const functionArgs = JSON.parse(toolCall.function.arguments);

    //       console.log(`Function to Call: ${functionName}`, functionArgs);

    //       let output;

    //       if (functionName === "processImage") {
    //         // console.log('Fetching Temperature for:', functionArgs.location);
    //         output = await processImage(formData, threadId, assistantId);
    //         console.log('output :>> ', output);
    //       } else {
    //         console.warn(`Unknown function called: ${functionName}`);
    //         output = { error: "Unknown function" };
    //       }

    //       return {
    //         tool_call_id: toolCall.id,
    //         output: JSON.stringify(output?.message),
    //       };
    //     })
    //   );

    //   // Submit function response to OpenAI
    //   await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
    //     tool_outputs: toolOutputs,
    //   });

    //   console.log("Tool outputs submitted. Waiting for final response...");

    //   // Poll again until Assistant completes processing**
    //   while (run.status !== "completed") {
    //     console.log("Waiting for assistant to finish processing...");
    //     await new Promise((resolve) => setTimeout(resolve, 2000));
    //     run = await openai.beta.threads.runs.retrieve(threadId, run.id);
    //   }
    // }
    // if (run.status === "completed") {
    //   const messages = await openai.beta.threads.messages.list(threadId);
    //   const aiReply = messages.data.find((m) => m.role === "assistant");
    //   return aiReply.content[0].text.value;
    // } else {
    //   return "Processing your request...";
    // }
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
