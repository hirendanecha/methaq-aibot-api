const { OpenAI } = require("openai");
const { OpenAIEmbeddings } = require("@langchain/openai");
const axios = require("axios");
const { PineconeStore } = require("@langchain/pinecone");
const { Pinecone } = require("@pinecone-database/pinecone");
const environment = require("../../utils/environment");
const DepartmentModel = require("../../models/department.model.js");
const ChatModel = require("../../models/chat.model");
const MessageModel = require("../../models/message.model");
const processImage = require("./openai-functions/processImage.js");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({ apiKey: environment.pinecone.apiKey });

function buildDynamicPrompt(agent, context, userInput, formattedHistory) {
  return `
${agent}

### 📌 Context:
${context}

### 🧠 Important Rule:
You must only respond to the user's request by parsing the past conversation.
If the user asks "Which documents i uploaded" you must only list the documents that the user has explicitly stated that they uploaded. Ignore all other conversation.
Search the conversation for phrases like 'Car Document' or 'ID' or other document names. Extract the document types mentioned in these phrases.

### 🔄 Conversation History (Context-Aware):
${formattedHistory}



### ❓ User Query:
${userInput}
`;
}

const fetchDepartmentsAndPrompts = async () => {
  try {
    const departments = await DepartmentModel.find().lean();
    return departments;
  } catch (error) {
    console.error("Error fetching departments and prompts:", error);
    throw error;
  }
};

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
    name: "Motor Insurance",
    prompts: [],
    workingHours: { startTime: "09:00:00", endTime: "20:00:00" },
  };
}

async function generateAIResponse(
  context,
  userInput,
  chatDetails,
  image_url,
  formData
) {
  try {
    console.log("Generating AI Response...", chatDetails);
    const departmentsData = await fetchDepartmentsAndPrompts();
    let detectedDepartment = null;
    if (userInput) {
      detectedDepartment = await detectDepartment(userInput, departmentsData);
    }

    const pastMessages = await MessageModel.find({ chatId: chatDetails._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    const formattedHistory = pastMessages
      .map((msg) => {
        let messageContent = msg.content;
        // If attachments exist, append them to the message content.
        if (msg.attachments && msg.attachments.length > 0) {
          // Assume attachments is an array of file URLs.
          const attachmentUrls = msg.attachments.join(", ");
          messageContent += `\n[Attachments: ${attachmentUrls}]`;
        }
        // Prefix with the appropriate label based on sendType.
        return `${
          msg.sendType === "user" ? "👤 User" : "🤖 Assistant"
        }: ${messageContent}`;
      })
      .join("\n");

    console.log(formattedHistory, "formattedHistory");
    // const promptTemplate = image_url
    //   ? chatDetails?.department?.prompt
    //   : detectedDepartment.prompt;

    const promptTemplate = chatDetails?.department?.prompt;

    const imageDescription = image_url ? `Image URL: ${image_url}` : "";
    const prompt = buildDynamicPrompt(
      promptTemplate,
      context,
      userInput,
      formattedHistory
    );

    const userMessageContent = [
      { type: "text", text: userInput },
      { type: "text", text: imageDescription },
    ];

    console.log("prompt", prompt);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userMessageContent },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "processImage",
            description:
              "Process and analyze an image, including document verification",
            parameters: {
              type: "object",
              properties: {
                imageUrl: {
                  type: "string",
                  description: "URL of the image to process",
                },
              },
              required: ["imageUrl"],
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    const toolCalls = response.choices[0].message.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        let functionResult;
        switch (functionName) {
          case "processImage":
            functionResult = await processImage(
              formData,
              prompt,
              formattedHistory
            );
            break;
          default:
            console.error("Unknown function:", functionName);
            return "Unknown function call.";
        }

        console.log(functionResult);
        return functionResult; // If multiple tool calls, handle differently
      }
    }
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, I am unable to process your request at the moment.";
  }
}

module.exports = { generateAIResponse };
