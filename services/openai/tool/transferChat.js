const { ChatOpenAI } = require("@langchain/openai");

async function isHumanChatRequest(message) {
  const lowerCaseMessage = message.trim().toLowerCase().split(/\s+/).join(" ");

  const openai = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini", // Or gpt-3.5-turbo, gpt-4-0314, or your preferred model.
    temperature: 0.0, // Set temperature low for more deterministic results.
    timeout: 15000,
    maxRetries: 3,
    // cache: true, // Consider carefully if you want caching; it can lead to stale results.
  });

  const prompt = `
    You are a chatbot assistant. Your task is to determine if a user's message indicates a desire to speak with a human agent.
    
    First, translate the following message to English if it is not already in English.
    
    Then, analyze the translated message and respond with ONLY "true" or "false" (lowercase, no quotes) depending on whether the message suggests the user wants human assistance. Do not provide any other text or explanation.
    
    Message: ${lowerCaseMessage}
    
    Respond with only "true" or "false".
    `;
  try {
    const response = await openai.invoke([{ role: "user", content: prompt }]);

    const trimmedResponse = response.content;

    if (trimmedResponse === "true") {
      return true;
    } else if (trimmedResponse === "false") {
      return false;
    } else {
      console.error("Unexpected response from OpenAI:", trimmedResponse);
      return false; // Default to false if the response is unclear.
    }
  } catch (error) {
    console.error("Error invoking OpenAI:", error);
    return false; // Default to false in case of an error.
  }
}

module.exports = { isHumanChatRequest };
