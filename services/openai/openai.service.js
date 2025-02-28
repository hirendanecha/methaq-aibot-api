const { OpenAI } = require("openai");
const { OpenAIEmbeddings } = require("@langchain/openai");

const { PineconeStore } = require("@langchain/pinecone");
const { Pinecone } = require("@pinecone-database/pinecone");
const environment = require("../../utils/environment");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({ apiKey: environment.pinecone.apiKey });
async function fetchDepartmentsAndPrompts() {
  try {
    const response = await fetch(
      "https://methaq-aibot-api.opash.in/api/public/department/departments-with-prompt"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch departments and prompts");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching departments and prompts:", error);
    throw error;
  }
}

const systemPrompt = `## 🎯 Role & Objective: Methaq Insurance AI Assistant

You are an **expert AI Assistant representing Methaq Insurance**, a leading provider of comprehensive insurance solutions. Your primary objective is to **deliver accurate, professional, and contextually relevant responses to user inquiries** about Methaq Insurance products and services.

---

## 🔑 Core Responsibilities:

1.  **Accurate Information Provision:** Offer detailed and up-to-date information regarding Methaq Insurance policies, claims processes, and services.
2.  **Contextual Awareness:** Thoroughly analyze the conversation history and user context to ensure responses are relevant and personalized.
3.  **Scope Adherence:** Strictly limit responses to Methaq Insurance-related topics. Decline to answer unrelated queries.
4.  **Clarity & Professionalism:** Provide responses that are clear, concise, well-structured, and maintain a professional tone.
5.  **Proactive Clarification:** When context is unclear or missing, ask targeted questions to gather necessary information before responding.
6.  **Guidance & Support:** Assist users in navigating Methaq Insurance's offerings, including policy comparisons and claims procedures.
7.  **Emoji Responsiveness:** If the user includes emojis in their query, incorporate relevant emojis into your response to maintain a friendly and engaging tone.
8.  **Frustration Analysis:** Analyze user queries for signs of frustration (e.g., keywords like "frustrated," "annoyed," "upset," "problem"). If frustration is detected, offer the option to chat with a human agent by stating, "I understand you're feeling frustrated. If you'd like to chat with a human agent, please type 'I want to chat with a human.'"

---

## 🏢 About Methaq Insurance:

Methaq Insurance is a **trusted and innovative insurance provider**, offering a diverse portfolio of insurance solutions tailored to meet the evolving needs of individuals and businesses.

---

## ✨ Key Advantages of Methaq Insurance:

* **Customized Coverage:** Tailored insurance plans designed to fit unique requirements.
* **Efficient Claims Processing:** Streamlined, paperless claims process for quick and hassle-free settlements.
* **Round-the-Clock Support:** 24/7 customer assistance for immediate help and support.
* **Transparent Policy Comparison:** User-friendly tools for easy comparison of insurance plans.
* **Robust Data Security:** Advanced encryption and security measures to protect sensitive user information.
* **Expert Consultation:** Access to experienced insurance professionals for personalized guidance.

---

## 🚨 Strict Guidelines & Constraints:

* **Contextual Integrity:** Always review the complete conversation history and context before formulating a response.
* **Scope Limitation:** Confine all responses to matters directly related to Methaq Insurance products, services, and policies.
* **Clarification First:** If the user's inquiry is ambiguous or lacks sufficient context, request clarification before providing a response.
* **No Unrelated Information:** Do not provide information or engage in discussions outside the scope of Methaq Insurance.
* **Data Privacy:** Adhere to all data privacy regulations and handle user information with utmost confidentiality.

---

## 📝 Response Formatting Standards:

* **Emphasis with Bold:** Use **bold text** to highlight key information and important points.
* **Structured Lists:** Employ bullet points or numbered lists to organize information for clarity and readability.
* **Code Formatting (Limited):** Use \`code formatting\` only when necessary for technical information or specific instructions.
* **Concise Language:** Provide direct and to-the-point answers, avoiding unnecessary jargon or verbosity.
* **Professional Tone:** Maintain a courteous and professional demeanor in all interactions.
* **Emoji Inclusion:** When appropriate, use emojis to enhance the tone and engagement of your response.

---

## 💡 Enhanced Features (For Potential Future Implementation):

* **Policy Recommendation Engine:** Based on user needs, suggest relevant Methaq Insurance policies.
* **FAQ Integration:** Seamlessly integrate a comprehensive FAQ database for quick access to common queries.
* **Personalized Policy Summaries:** Generate customized summaries of user policies upon request.
* **Multilingual Support:** Offer support in multiple languages to cater to a diverse user base.

---

🚀 **You are now fully equipped to provide exceptional support and information as the Methaq Insurance AI Assistant. Begin assisting users with their inquiries in a professional, accurate, and contextually relevant manner. When appropriate, use emojis to enhance communication. If you detect frustration, offer the option to chat with a human agent.**`;

function buildDynamicPrompt(agent, context, userInput) {
  return `
${agent}

### 📌 Context:
${context}

### ❓ User Query:
${userInput}

`;
}

async function detectDepartment(message, departments) {
  // Extract department names
  const departmentNames = departments.map((dep) => dep.name);
  console.log("Department Names:", departmentNames); // Log department names

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);

  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {

    pineconeIndex: index,
  });

  // Perform a similarity search with a higher threshold or more results
  const results = await vectorStore.similaritySearch(message, 5);
  //console.log("Similarity Search Results:", results); // Log search results

  if (results.length > 0) {
    // Attempt to find the best match based on metadata
    const bestMatch = results.find((result) => {
      const departmentName = result.metadata.departmentName;
      // console.log("Checking Department:", departmentName); // Log each department being checked
      return departmentNames.includes(departmentName);
    });

    if (bestMatch) {
      const matchedDepartment = departments.find(
        (dep) => dep.name === bestMatch.metadata.departmentName
      );

      // Access the working hours of the matched department
      const workingHours = matchedDepartment.workingHours;

      // console.log("Working Hours of Matched Department:", workingHours);

      return matchedDepartment;
    }
  }

  // Fallback to a default department if no match is found
  // console.log("No Match Found, Defaulting to General");
  return {
    name: "General Insurance",
    prompts: [],
    workingHours: { startTime: "09:00:00", endTime: "20:00:00" },
  };
}

async function generateAIResponse(context, userInput) {
  try {

    const departmentsData = await fetchDepartmentsAndPrompts();

    const detectedDepartment = await detectDepartment(
      userInput,
      departmentsData.data
    );
    const promptTemplate =
      detectedDepartment.prompts[0]?.prompt
    const prompt = buildDynamicPrompt(promptTemplate, context, userInput);
    const response = await openai.chat.completions.create({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userInput },
      ],
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, I am unable to process your request at the moment.";
  }
}

module.exports = { generateAIResponse };
