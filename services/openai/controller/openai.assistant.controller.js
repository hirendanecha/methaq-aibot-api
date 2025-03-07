const { openai } = require("../openai-config/openai-config");
const toolFunctions = require("../openai-functions/function-schema/functionsSchema");
// Create an assistant
exports.createAssistant = async (
  name,
  instructions,
  tools = [{ type: "code_interpreter" }, { type: "file_search" }]
) => {
  try {
    if (!name || !instructions) {
      throw new Error(
        "Name and instructions are required to create an assistant."
      );
    }

    const assistant = await openai.beta.assistants.create({
      name,
      instructions,
      model: process.env.OPENAI_MODEL,
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
    const { name, instructions } = updates;
    const updatedAssistant = await openai.beta.assistants.update(assistantId, {
      name,
      instructions,
    });

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

    await openai.beta.assistants.del(assistantId);

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
}


//add fucntion

exports.addToolToAssistant = async (assistantId, functionId) => {
  try {
    const toolFunction = toolFunctions[functionId];

    if (!toolFunction) {
      return { success: false, message: "Tool function not found" };
    }

     const existingAssistant = await openai.beta.assistants.retrieve(assistantId);

     const updatedTools = [...existingAssistant.tools, toolFunction];

     const updatedAssistant = await openai.beta.assistants.update(assistantId, {
      tools: updatedTools,
    });

    return { success: true, updatedAssistant };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
