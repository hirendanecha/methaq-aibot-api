const axios = require("axios");
const { ChatOpenAI } = require("@langchain/openai");
const ChatModel = require("../../models/chat.model");

const openai = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o-mini", // Or gpt-3.5-turbo, gpt-4-0314, or your preferred model.
  temperature: 0.0, // Set temperature low for more deterministic results.
  timeout: 15000,
  maxRetries: 3,
  // cache: true, // Consider carefully if you want caching; it can lead to stale results.
});
const convertNodeToMarkdown = (node) => {
  if (!node) return "";

  let md = "";

  // Switch based on the node type
  switch (node.type) {
    case "p": {
      // Process children and add two line breaks at the end for a new paragraph.
      const content = node.children
        ? node.children.map(convertNodeToMarkdown).join("")
        : node.text || "";
      md += content + "\n\n";
      break;
    }
    case "li": {
      // For list items, prefix with a dash and a space.
      const content = node.children
        ? node.children.map(convertNodeToMarkdown).join("")
        : node.text || "";
      md += `- ${content}\n`;
      break;
    }
    case "ul":
    case "ol": {
      // Process each child (expected to be list items) and join them.
      md += node.children
        ? node.children.map(convertNodeToMarkdown).join("")
        : "";
      md += "\n";
      break;
    }
    case "variable":
    case "inline-variable": {
      // Treat these as containers – simply process their children.
      md += node.children
        ? node.children.map(convertNodeToMarkdown).join("")
        : "";
      break;
    }
    case "text":
    default: {
      // For plain text nodes (or unknown types), check for formatting flags.
      // If you want to support bold text, assume a property 'bold' is used.
      if (node.bold) {
        md += `**${node.text || ""}**`;
      } else {
        md += node.text || "";
      }
      // Also process any children recursively.
      if (node.children && Array.isArray(node.children)) {
        md += node.children.map(convertNodeToMarkdown).join("");
      }
      break;
    }
  }
  return md;
};

// Convert an array of rich text nodes into Markdown text.
const formatRichTextToMarkdown = (richText) => {
  return richText.map(convertNodeToMarkdown).join("");
};

const getFormattedMessage = (messages) => {
  return messages
    .map((msg) => {
      if (msg.content && msg.content.richText) {
        return formatRichTextToMarkdown(msg.content.richText);
      }
      return "";
    })
    .join("\n")
    .replace(/^\{\}\n*/, ''); // Remove standalone {} at the start of the string
};

// const getFormattedMessage = (messages) => {
//   return messages
//     .map((msg) => {
//       if (msg.content && msg.content.richText) {
//         return formatRichText(msg.content.richText);
//       }
//       return "";
//     })
//     .join("\n");
// };
const getAllTypeBots = async () => {
  const url = `${process.env.TYPEBOT_BASE_URL}/api/v1/typebots?workspaceId=${process.env.TYPEBOT_WORKSPACEID}`; // Set the base URL and endpoint

  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TYPEBOT_API_TOKEN}`, // Ensure you have the correct token
      },
    });

    const typeBots = response.data; // Assuming the response contains the TypeBots data
    console.log("Fetched TypeBots:", typeBots);

    // Here you can store the typeBots in your database or any storage
    // Example: await saveTypeBotsToDatabase(typeBots);

    return typeBots;
  } catch (error) {
    console.error("Error fetching TypeBots:", error.message);
    return "Axle broke!! Abort mission!!";
  }
};

const startChat = async (botId, message) => {
  // const url = `https://typebot-uqjtp-u35950.vm.elestio.app/api/v1/typebots/${botId}/startChat`; // Use the specific URL
  const url = `https://botauto.vionextech.com/api/v1/typebots/${process.env.TYPEBOT_BOT_ID_WELCOME}/startChat`;
    console.log(process.env.TYPEBOT_BOT_ID_WELCOME);
  try {
    const response = await axios.post(
      url
      // {
      //   message: {
      //     type: "text",
      //     text: message.text || "Hi", // Set the text message
      //     attachedFileUrls: message.attachedFileUrls, // Set the attached file URLs if any
      //   },
      // },
      // {
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${process.env.TYPEBOT_API_TOKEN}`, // Ensure you have the correct token
      //   },
      // }
    );

    // console.log("Start chat response:", response);
    const finaloutput = getFormattedMessage(response?.data?.messages);
    return { response, finaloutput };
  } catch (error) {
    console.error("Error continuing chat:", error.response.data.message);
    return "Axle broke!! Abort mission!!";
  }
};

async function translateTextDynamic(inputText, finalOutput) {
  // Detect language from finalOutput
  //console.log(finalOutput, "translated");
  // const prompt = `
  //   You are an expert translator with a strong focus on language detection and precise translation.

  //   **Task:**
  //   1. Analyze the provided dataset carefully and identify the language of the **content field**.
  //   2. Translate the given **input text** into the detected language, ensuring that the meaning remains unchanged.
  //   3. If the language is **English**, return the input text as-is.
  //   4. If the language is **not English**, provide the translated text without any extra formatting or information.

  //   ✅ **User Dataset (Focus only on content field):**
  //   ${JSON.stringify(finalOutput, null, 2)}

  //   ✅ **Input Text to Translate:**
  //   ${inputText}

  //   ⚠️ **Strict Rules:**
  //   - Return **only** the translated text without any explanations, variables, or extra formatting.
  //   - Ensure high accuracy in language detection and translation.
  // `;
  const prompt = `
  You are an expert translator with a strong focus on language detection and precise translation.
  
  **Task:**
  1. Analyze the provided dataset carefully and identify the language of the **content** field from each item in the dataset.
  2. Translate the given **inputText** into the detected language, ensuring that the meaning remains unchanged.
  3. If the detected language is **English**, return the inputText as-is.
  4. If the detected language is **not English**, translate the inputText accurately without altering its meaning.
  
  ✅ **User Dataset (Focus only on content field):**
  ${JSON.stringify(finalOutput, null, 2)}
  
  ✅ **Input Text to Translate:**
  ${inputText}
  
  ⚠️ **Strict Rules:**
  - Return **only** the translated text with no additional formatting, explanations, or extra information.
  - Do **not** return any JSON, variables, or unnecessary text.
  - Ensure high accuracy in language detection and translation.
  
  🎯 **Example Dataset and Expected Output:**
  
  **Dataset:**
  [
    {
      "id": "xag2zin6zxjlsg04q7hxtb7s",
      "outgoingEdgeId": "uoziftew4byhim10vyynn44k",
      "content": "تأمين جديد"
    },
    {
      "id": "odtfsuwzcw53fqwo6w0ioak5",
      "outgoingEdgeId": "zqp1a5ufrja0wcvokggwayol",
      "content": "تجديد تأميني"
    }
  ]
  
  **Input Text:**
  "Please select one of the following options:"
  
  ✅ **Detected Language:** Arabic
  
  ✅ **Output Translation:**
  "يرجى اختيار أحد الخيارات التالية:"
  
  ---
  
  **Dataset:**
  [
    {
      "id": "abc123",
      "outgoingEdgeId": "xyz456",
      "content": "Welcome to the portal"
    }
  ]
  
  **Input Text:**
  "Please select one of the following options:"
  
  ✅ **Detected Language:** English
  
  ✅ **Output Translation:**
  "Please select one of the following options:"
  `;
  const response = await openai.invoke([{ role: "user", content: prompt }]);
  // console.log(response, "0303040");

  // // Translate inputText to detected language

  return response.content; // Return only the translated sentence
}

const continueChat = async (sessionId, message, urls = null) => {
  let interactiveMsg = false;
  let interactiveListButton = false;
  let interactiveListPayload = false;
  let interactivePayload = null;
  console.log("sessionId aaa", sessionId, message, urls);
  const url = `https://botauto.vionextech.com/api/v1/sessions/${sessionId}/continueChat`; // Use the specific URL

  try {
    const requestBody = {
      textBubbleContentFormat: "richText", // Set the text bubble content format
      message: {
        type: "text", // Set the message type
        text: urls ? "Check this document" : message, // Set the text message
        ...(urls && {
          attachedFileUrls: urls.length === 1 ? [urls[0], urls[0]] : urls, // Duplicate the URL if only one is provided
        }),
      },
    };

    console.log("requestBody", requestBody);
    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${process.env.TYPEBOT_API_TOKEN}`, // Ensure you have the correct token
      },
    });
    // console.log(response?.data,"response?.data?.messages?.[0]?.content?.richText?.[0]?.children?.[0]");
    // new thing

    console.log(
      "response?.data?.messages",
      response?.data?.messages?.[0]?.content?.richText
    );
    const finaloutput = getFormattedMessage(response?.data?.messages);
    console.log("finaloutput333", finaloutput);
    let finaloutputDisplay =
      finaloutput.length > 60 ? finaloutput.slice(0, 50) + "..." : finaloutput;
    ///

    // const messageText =
    //   response?.data?.messages?.[0]?.content?.richText?.[0]?.children?.[0]
    //     ?.children?.[0]?.text;
    // console.log("Extracted text:", messageText);
    // console.log(response?.data?.input?.items, "response?.data?.input?.items");
    if (
      response &&
      response.data &&
      response.data.input &&
      response?.data?.input?.items &&
      response?.data?.input?.items?.length > 0
    ) {
      if (response?.data?.input?.items?.length === 2) {
        // console.log(response?.data?.input.items, "iirirt");
        let payload1 = response?.data?.input.items;
        const result1 = await translateTextDynamic(
          "Choose an option",
          payload1
        );
        console.log(result1, "ppppppppppp");

        const result2 = await translateTextDynamic(
          "Please select one of the options below:",
          response?.data?.input.items
        );

        interactiveListButton = true;
        interactiveListPayload = {
          type: "button",
          header: {
            type: "text",
            text: "  ", // Example header text
          },
          body: {
            text: result2 ? result2 : "Please select one of the options below:", // Example body text
          },
          action: {
            buttons: response?.data?.input.items.map((item, index) => ({
              type: "reply",
              reply: {
                id: `${item.content}`,
                title: item.content, // Use the item content as the button title
              },
            })),
          },
        };
      } else {
        interactiveMsg = true;

        // Extracting the first message text if available
        const result2 = await translateTextDynamic(
          "Please select one of the options below:",
          response?.data?.input.items
        );

        interactivePayload = {
          options: response?.data.input.items?.map((item) => {
            const name =
              item?.content.length > 24
                ? item?.content.slice(0, 24) // Adjusted to slice up to 24 characters
                : item?.content;
            return {
              depId: item?.content?.split("-")[0],
              name,
              description: "",
            };
          }),
          headerText: " ",
          bodyText: result2
            ? result2
            : "Please select one of the following options:",
          actionButtonText: "Select",
          actionSectionTitle: "Available Choices",
        };
      }
    }
    console.log(
      interactiveMsg,
      interactivePayload,
      interactiveListButton,
      interactiveListPayload,
      "interactive"
    );
    return {
      finaloutput,
      interactiveMsg,
      interactivePayload,
      interactiveListButton,
      interactiveListPayload,
    };
  } catch (error) {
    console.error("Error continuing chat:", error.response.data.message);
    const updatedChat = await ChatModel.findOneAndUpdate(
      { currentSessionId: sessionId },
      {
        //status: "archived",
        currentSessionId: null,
        //adminId: null,
        //isHuman: false,
        department: null,
      },
      { new: true }
    ).lean();
    return "Axle broke!! Abort mission!!";
  }
};

module.exports = {
  getAllTypeBots,
  startChat,
  continueChat,
};
