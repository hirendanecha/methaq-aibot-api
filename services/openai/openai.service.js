const { OpenAI } = require("openai");
const { OpenAIEmbeddings } = require("@langchain/openai");

const { PineconeStore } = require("@langchain/pinecone");
const { Pinecone } = require("@pinecone-database/pinecone");
const environment = require("../../utils/environment");
const ChatModel = require("../../models/chat.model");
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

async function generateAIResponse(context, userInput,chatDetails) {
  try {

    const departmentsData = await fetchDepartmentsAndPrompts();

    const detectedDepartment = await detectDepartment(
      userInput,
      departmentsData.data
    );
    const updatedChat = await ChatModel.findOneAndUpdate(
      { _id: chatDetails._id },
      { department: detectedDepartment._id },
      { new: true }
    )
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
