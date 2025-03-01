const { ChatOpenAI } = require("@langchain/openai");

async function isDocumentRequest(message) {
  // Determine if the message is an object (e.g., file mapping) or a string.
  let inputText = "";
  if (typeof message === "object" && message !== null) {
    const keys = Object.keys(message);
    if (keys.length > 0) {
      // Use the first file's text
      inputText = message[keys[0]];
    }
  } else if (typeof message === "string") {
    inputText = message;
  } else {
    console.error("Unsupported message format");
    return false;
  }

  console.log("Processing message:", inputText);

  const openai = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini", // Or gpt-3.5-turbo, gpt-4-0314, etc.
    temperature: 0.0, // Deterministic results.
    timeout: 15000,
    maxRetries: 3,
  });

  const prompt = `
  You are an expert document processing and classification AI. Your task is to analyze the provided text and determine if it relates to a Car document (front or back), an Emirates ID (front or back), or a Driving License (front or back).

  **Document Keywords:**

  * Car Front: ["Owner", "Nationality", "Vehicle License", "UNITED ARAB EMIRATES"]
  * Car Back: ["Model", "Origin", "Veh. Type", "G. V. W.", "Chassis No"]
  * Emirates Front: ["Resident Identity Card", "Name", "Nationality"]
  * Emirates Back: ["Issuing Place", "Card Number", "Occupation", "Sex", "Card Number"]
  * Driving Front: ["Driving License", "Drivir License"]
  * Driving Back: ["Traffic Code No"]

  **Document Keyword Groups for Overall Document Identification:**

  * Driving Document: ["Driving License", "Drivir License", "License No.", "Traffic Code No"]
  * Car Document: ["Owner", "Nationality", "Vehicle", "Model", "Origin", "Veh. Type", "G. V. W.", "Chassis No"]
  * Emirates Document: ["Resident Identity Card", "Name", "Nationality", "Issuing Place", "Card Number", "Occupation"]

  **State Management:**

  Maintain a state dictionary to track the presence of front and back documents:
  {
      "car": { "front": false, "back": false },
      "emirates": { "front": false, "back": false },
      "driving": { "front": false, "back": false }
  }

  **Processing Instructions:**

  1. **Document Type Identification:**
      - Check if the provided text contains keywords from any of the "Document Keyword Groups".
      - If no keyword groups are found, STRICTLY output the following JSON: {"text": "Not a valid document. Can you please upload a valid document like Car, Emirates and Driving?", "dataState": {}}.
  2. **Front/Back Identification:**
      - If a document type is identified, check if the text contains keywords from the specific front or back keyword lists.
      - Update the corresponding state dictionary (car, emirates, or driving) based on whether front or back keywords are found.
  3. **Response Generation:**
      - If a front document is identified and the back is not, STRICTLY output the following JSON: {"text": "You uploaded [Document Type] front card. Can you upload back details?", "dataState": [Updated State Dictionary]}.
      - If both front and back are identified, STRICTLY output the following JSON: {"text": "Both front and back of [Document Type] are uploaded.", "dataState": [Updated State Dictionary]}.
      - If a back document is uploaded before a front document, STRICTLY output the following JSON: {"text": "Please upload the front document of [Document Type] first.", "dataState": [Updated State Dictionary]}.
      - Always, and without deviation, output the response as a JSON object with "text" and "dataState" keys.

  **Example Text (Input):**

  ${inputText}

  **Output:**

  (Strictly JSON format as described above)
`;

  try {
    const response = await openai.invoke([{ role: "user", content: prompt }]);
    const trimmedResponse = response.content.trim();
    // Remove any backticks or non-JSON content
    console.log(trimmedResponse,"lllllllllll");
    
    const cleanedResponse = trimmedResponse.replace(/```json|```/g, '');
    const responseWithoutState = JSON.parse(cleanedResponse);
    return responseWithoutState.text;
  } catch (error) {
    console.error("Error invoking OpenAI:", error);
    return false;
  }
}

module.exports = { isDocumentRequest };
