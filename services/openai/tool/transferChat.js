const { ChatOpenAI } = require("@langchain/openai");

async function isHumanChatRequest(message) {
  const lowerCaseMessage =
    typeof message === "string"
      ? message.trim().toLowerCase().split(/\s+/).join(" ")
      : "";

  const openai = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini", // Or gpt-3.5-turbo, gpt-4-0314, or your preferred model.
    temperature: 0.0, // Set temperature low for more deterministic results.
    timeout: 15000,
    maxRetries: 3,
    // cache: true, // Consider carefully if you want caching; it can lead to stale results.
  });

  // const prompt = `
  // You are an expert chatbot assistant designed to accurately determine if a user's message expresses a genuine, strong desire to speak with a human agent. Your analysis should be highly sensitive to the user's emotional state and the complexity of their request.
  
  // **Process:**
  
  // 1.  **Language Check and Translation:** If the following message is not in English, translate it to English. Ensure the translation preserves the original sentiment and nuances.
  
  // 2.  **Intent and Emotional Analysis:** Analyze the translated message with a focus on these key aspects:
  //     * **Explicit Requests for Human Interaction:** Identify clear phrases like "talk to a person," "speak to an agent," "human support," "real person," "customer service representative," "escalate this," "transfer me," or similar expressions.
  //     * **Emotional Indicators:** Look for signs of:
  //         * **Frustration and Impatience:** Phrases like "I'm fed up," "This is ridiculous," "I've tried everything," or excessive use of exclamation points.
  //         * **Confusion and Desperation:** Statements like "I don't understand," "I'm lost," "I need help urgently," or repeated requests for clarification.
  //         * **Emotional Distress:** Indications of anger, sadness, or anxiety that suggest the user needs human empathy.
  //     * **Complexity and Specificity of the Issue:**
  //         * Determine if the issue requires nuanced problem-solving, emotional support, or access to information beyond the bot's capabilities.
  //         * Consider if the user is describing a unique or complex situation that automated systems are unlikely to handle effectively.
  //         * **Repetitive failures:** If the user states they have already tried to get help from the automated system multiple times and failed.
  //     * **Contextual Clues:** Pay attention to the overall context of the conversation. Does the user's message follow a series of failed attempts to resolve their issue with the bot?
  //     * **Requests for exceptions or deviations from standard procedures:** These requests almost always require human intervention.
  //     * **Requests for sensitive information, or describing sensitive situations:** These requests should be flagged for human intervention.
  
  // 3.  **Threshold for "true":** Only respond with "true" (lowercase) if the message strongly suggests the user is experiencing a situation where human intervention is **essential** for a satisfactory resolution. Mere requests for information or simple transactional tasks should not trigger "true." The user should feel that they have no other options.
  
  // 4.  **Response:** Respond with ONLY "true" (lowercase) if the message indicates a strong, genuine desire for human assistance and that the issue requires it. Otherwise, respond with ONLY "false" (lowercase). Do not provide any other text or explanation.
  
  // Message: ${lowerCaseMessage}
  
  // Respond with only "true" or "false".
  // `;
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
* Note: Requests for refunds or money back should not automatically be considered as requests for human assistance unless explicitly stated.

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
