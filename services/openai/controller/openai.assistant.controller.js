const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../../../utils/response");
const { openai } = require("../openai-config/openai-config");
const {
  toolFunctions,
} = require("../openai-functions/function-schema/functionsSchema");

// Create an assistant
exports.createAssistant = async (name, instructions, toolNames = []) => {
  try {
    if (!name || !instructions) {
      throw new Error("Both name and instructions are required.");
    }

    // Default tools like code interpreter and file search
    let tools = [{ type: "code_interpreter" }, { type: "file_search" }];

    // Ensure toolNames is an array
    const functionNames = Array.isArray(toolNames) ? toolNames : [toolNames];

    const selectedTools = functionNames
      .map((name) =>
        Object.values(toolFunctions).find((tool) => tool.name === name)
      )
      .filter((tool) => tool !== undefined); // Remove undefined tools
    // Merge selected tools
    tools = tools.concat(selectedTools);
    const openaiClient = await openai;
    const assistant = await openaiClient.beta.assistants.create({
      name,
      instructions,
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      tools,
    });

    console.log(`Assistant created: ${assistant.name} (ID: ${assistant.id})`);
    const assistantData = {
      id: assistant.id,
      name: assistant.name,
      instructions: assistant.instructions,
      createdAt: new Date().toISOString(),
    };
    return {
      success: true,
      assistantData,
      message: "Assistant created successfully!",
    };
  } catch (error) {
    console.error("Error creating assistant:", error);
    return {
      success: false,
      message: `Failed to create assistant: ${error.message}`,
    };
  }
};

// Update an assistant
exports.updateAssistant = async (assistantId, updates) => {
  try {
    if (!assistantId) {
      throw new Error(
        "Assistant ID and updates are required to update an assistant."
      );
    }

    // Retrieve the existing assistant details
    const openaiClient = await openai;
    const existingAssistant = await openaiClient.beta.assistants.retrieve(
      assistantId
    );

    let updatedTools = [...existingAssistant.tools]; // Keep existing tools by default

    if (updates.tools) {
      if (updates.tools.length === 0) {
        // If an empty array is provided, remove all tools
        updatedTools = [];
      } else {
        // Process tools (replace old ones)
        updatedTools = updates.tools
          .map((toolName) => toolFunctions[toolName])
          .filter(Boolean);
      }
    }

    const { name, instructions } = updates;
   
    const updatedAssistant = await openaiClient.beta.assistants.update(
      assistantId,
      {
        name,
        instructions,
        tools: updatedTools, // Update tools dynamically
      }
    );

    console.log(
      `Assistant updated: ${updatedAssistant.name} (ID: ${updatedAssistant.id})`
    );

    return {
      success: true,
      assistantId: updatedAssistant.id,
      message: "Assistant updated successfully!",
    };
  } catch (error) {
    console.error("Error updating assistant:", error);
    return {
      success: false,
      message: `Failed to update assistant: ${error.message}`,
    };
  }
};

// Delete an assistant
exports.deleteAssistant = async (assistantId) => {
  try {
    if (!assistantId) {
      throw new Error("Assistant ID is required to delete an assistant.");
    }
    const openaiClient = await openai;
    await openaiClient.beta.assistants.del(assistantId);

    console.log(`Assistant deleted: ID ${assistantId}`);

    return {
      success: true,
      message: "Assistant deleted successfully!",
    };
  } catch (error) {
    console.error("Error deleting assistant:", error);
    return {
      success: false,
      message: `Failed to delete assistant: ${error.message}`,
    };
  }
};

//add fucntion

exports.addToolToAssistant = async (req, res) => {
  try {
    const { assistantId, functionId } = req.body;

    // Ensure functionId is an array
    const functionIds = Array.isArray(functionId) ? functionId : [functionId];

    // Retrieve existing assistant
    const openaiClient = await openai;
    const existingAssistant = await openaiClient.beta.assistants.retrieve(
      assistantId
    );

    // Initialize updated tools with existing tools
    let updatedTools = [...existingAssistant.tools];

    // Add each tool function to the updated tools
    for (const id of functionIds) {
      const toolFunction = toolFunctions[id];
      if (!toolFunction) {
        return sendErrorResponse(res, `Tool function not found for ID: ${id}`);
      }
      updatedTools.push(toolFunction);
    }
    console.log(updatedTools, "updatedTools");

    // Update the assistant with the new tools
   
    const updatedAssistant = await openaiClient.beta.assistants.update(assistantId, {
      tools: updatedTools,
    });

    return sendSuccessResponse(res, { data: updatedAssistant });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};
exports.getToolFunctions = async (req, res) => {
  try {
    // const functions = Object.keys(toolFunctions);
    return sendSuccessResponse(res, { data: toolFunctions });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

exports.enableFIleSearch = async (assistantId) => {
  try {
    if (!assistantId) {
      throw new Error(
        "Assistant ID and updates are required to update an assistant."
      );
    }

    // Retrieve the existing assistant details
    const openaiClient = await openai;
    const existingAssistant = await openaiClient.beta.assistants.retrieve(
      assistantId
    );

    // Check if file_search is already enabled
    const hasFileSearch = existingAssistant.tools.some(
      (tool) => tool.type === "file_search"
    );

    if (!hasFileSearch) {
      // Add file_search tool
      existingAssistant.tools.push({
        type: "file_search",
        file_search: {
          ranking_options: {
            ranker: "default_2024_08_21",
            score_threshold: 0.0,
          },
        },
      });

      // Update the assistant with the new tools
      const openaiClient = await openai;
      const updatedAssistant = await openaiClient.beta.assistants.update(
        assistantId,
        {
          tools: existingAssistant.tools,
        }
      );

      return {
        success: true,
        assistantId: updatedAssistant.id,
        message: "Assistant updated successfully!",
      };
    } // Added missing closing brace here
  } catch (error) {
    console.error("Error updating assistant:", error);
    return {
      success: false,
      message: `Failed to update assistant: ${error.message}`,
    };
  }
};
