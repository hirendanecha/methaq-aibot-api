const axios = require("axios");
const { ChatOpenAI } = require("@langchain/openai");

const openai = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o-mini", // Or gpt-3.5-turbo, gpt-4-0314, or your preferred model.
  temperature: 0.0, // Set temperature low for more deterministic results.
  timeout: 15000,
  maxRetries: 3,
  // cache: true, // Consider carefully if you want caching; it can lead to stale results.
});

const formatRichText = (richText) => {
  return richText
    .map((item) => {
      if (item.type === "p" || item.type === "li") {
        return item.children.map((child) => child.text || "").join("");
      } else if (item.type === "ul" || item.type === "ol") {
        return item.children
          .map(
            (li) =>
              "- " +
              li.children
                .map((lic) =>
                  lic.children.map((text) => text.text || "").join("")
                )
                .join("")
          )
          .join("\n");
      } else if (item.type === "variable") {
        // Handle the "variable" type by processing its children
        return item.children.map((child) => formatRichText([child])).join("\n");
      }
      return "";
    })
    .join("\n");
};

const getFormattedMessage = (messages) => {
  //console.log("messages", messages);
  //const messages = response.messages;
  return messages
    .map((msg) => {
      if (msg.content && msg.content.richText) {
        return formatRichText(msg.content.richText);
      }
      return "";
    })
    .join("\n");
};
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
  const url =
    "https://typebot-uqjtp-u35950.vm.elestio.app/api/v1/typebots/welcome-bot-tony-x5fq4n9/startChat";
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
  console.log(inputText, "translated");
  const prompt = `
    You are an expert translator with a strong focus on language detection and precise translation. 

    **Task:**
    1. Analyze the provided dataset carefully and identify the language of the **content field**.
    2. Translate the given **input text** into the detected language, ensuring that the meaning remains unchanged.
    3. If the language is **English**, return the input text as-is.
    4. If the language is **not English**, provide the translated text without any extra formatting or information.

    ✅ **User Dataset (Focus only on content field):**
    ${JSON.stringify(finalOutput, null, 2)}

    ✅ **Input Text to Translate:**
    ${inputText}

    ⚠️ **Strict Rules:**
    - Return **only** the translated text without any explanations, variables, or extra formatting.
    - Ensure high accuracy in language detection and translation.
  `;

  const response = await openai.invoke([{ role: "user", content: prompt }]);
  console.log(response.content, "0303040");

  // Translate inputText to detected language

  return response.content; // Return only the translated sentence
}

const continueChat = async (sessionId, message, urls = null) => {
  let interactiveMsg = false;
  let interactiveListButton = false;
  let interactiveListPayload = false;
  let interactivePayload = null;
  console.log("sessionId aaa", sessionId, message, urls);
  const url = `https://typebot-uqjtp-u35950.vm.elestio.app/api/v1/sessions/${sessionId}/continueChat`; // Use the specific URL

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

    const finaloutput = getFormattedMessage(response?.data?.messages);
    console.log("finaloutput333", finaloutput);
    let finaloutputDisplay =
      finaloutput.length > 60 ? finaloutput.slice(0, 50) + "..." : finaloutput;
    ///

    const messageText =
      response?.data?.messages?.[0]?.content?.richText?.[0]?.children?.[0]
        ?.children?.[0]?.text;
    // console.log("Extracted text:", messageText);
    console.log(response?.data?.input?.items, "response?.data?.input?.items");
    if (response?.data?.input?.items && response?.data.input.items.length > 0) {
      if (response?.data?.input?.items.length === 2) {
        const result1 = await translateTextDynamic(
          "Choose an option",
          response?.data?.input.items
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
            text: result1 || "Choose an option", // Example header text
          },
          body: {
            text: result2 || "Please select one of the options below:", // Example body text
          },
          action: {
            buttons: response?.data?.input.items.map((item, index) => ({
              type: "reply",
              reply: {
                id: `option_${index}`,
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
          bodyText: result2 || "Please select one of the following options:",
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
    return "Axle broke!! Abort mission!!";
  }
};

module.exports = {
  getAllTypeBots,
  startChat,
  continueChat,
};
