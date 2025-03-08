const { ChatOpenAI } = require("@langchain/openai");

async function isDeparmentChange(message) {
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

  const prompt = `
  You are an exceptionally skilled conversational analysis AI and expert prompt engineer, tasked with accurately determining if a user intends to switch or change their current "department" (AI assistance category).
  
  **Objective:**
  
  Analyze the user's message and return ONLY "true" if the user clearly indicates a desire to change departments, or "false" if not.
  
  **Detailed Instructions:**
  
  1.  **Language Neutralization:**
      * If the user's message is not in English, translate it to English.
      * Perform all subsequent analysis in English.
  
  2.  **"Department" Definition:**
      * "Department" refers to distinct AI assistance categories (e.g., "A," "B," "Support," "Sales," etc.).
  
  3.  **Precise Switch Detection:**
      * Identify explicit phrases indicating a department change, including but not limited to:
          * "I want to switch to [department]"
          * "Change to [department]"
          * "Go to [department]"
          * "I meant [department]"
          * "Actually, I need [department]"
          * "Instead, I want [department]"
          * "I need a different department"
          * "Take me to [department]"
          * "Move me to [department]"
      * **Crucially, consider contextual clues and implied intent.** A user might express a desire to switch without using those exact phrases.
      * **Avoid false positives:** Do not return "true" for simple questions or requests for information related to other departments. The user must clearly indicate a desire to *change* their active department.
  
  4.  **Output Format (Strict):**
      * Return ONLY "true" or "false". No additional text or explanations.
  
  **Example Scenarios (for clarity):**
  
  * **User:** "Hi" -> **Output:** "false"
  * **User:** "I want to switch to department A." -> **Output:** "true"
  * **User:** "Actually, I need help with B." -> **Output:** "true"
  * **User:** "How do I do this in the current department?" -> **Output:** "false"
  * **User:** "Can I go to department C?" -> **Output:** "true"
  * **User:** "instead of this, I want support in group D" -> **Output:** "true"
  * **User:** "Tell me about department C" -> **Output:** "false"
  * **User:** "I have a question for the sales department" -> **Output:** "false"
  * **User:** "I need to speak to someone in support." -> **Output:** "true"
  
  **User Message (to be analyzed):**
  
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

module.exports = { isDeparmentChange };
