const openai = require("../openai-config/openai-config.js");

// Create an assistant
export async function createAssistant(
  name,
  instructions,
  tools = [{ type: "code_interpreter" }, { type: "file_search" }]
) {
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
      assistantId: assistant.id,
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
}

// Update an assistant
export async function updateAssistant(assistantId, updates) {
  try {
    if (!assistantId) {
      throw new Error(
        "Assistant ID and updates are required to update an assistant."
      );
    }
    const { name, instructions, tools } = updates;
    const updatedAssistant = await openai.beta.assistants.update(assistantId, {
      name,
      instructions,
      tools,
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
}

// Delete an assistant
export async function deleteAssistant(assistantId) {
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
