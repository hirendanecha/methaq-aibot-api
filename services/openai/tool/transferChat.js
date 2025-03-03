const { ChatOpenAI } = require("@langchain/openai");

async function isHumanChatRequest(message) {

  const lowerCaseMessage = typeof message === 'string' ? message.trim().toLowerCase().split(/\s+/).join(" ") : "";

  const openai = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini", // Or gpt-3.5-turbo, gpt-4-0314, or your preferred model.
    temperature: 0.0, // Set temperature low for more deterministic results.
    timeout: 15000,
    maxRetries: 3,
    // cache: true, // Consider carefully if you want caching; it can lead to stale results.
  });

  const prompt = `
   You are a chatbot assistant designed to determine if a user's message indicates a desire to speak with a human agent.

First, translate the following message to English if it is not already in English.

Then, analyze the translated message to determine if the user is expressing a need or desire for human assistance. Consider the following:

* Does the message contain keywords or phrases related to:
    * Speaking with a human, agent, representative, person, customer service, support, or a real person?
    * Escalating the issue or needing help beyond automated responses?
    * Asking to be transferred to a human?
* Does the user's tone or context suggest frustration, confusion, or a need for specialized assistance?
* Is the user requesting help that a bot can not provide?

Focus on understanding the user's intent, not just the literal words. Be tolerant of variations in phrasing and potential misspellings.

Respond with ONLY "true" (lowercase) if the message indicates a desire for human assistance. Otherwise, respond with ONLY "false" (lowercase). Do not provide any other text or explanation.

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
