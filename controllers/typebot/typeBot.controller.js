const axios = require("axios");
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

const startChat = async (botname, message) => {
  const url =
    "https://typebot-uqjtp-u35950.vm.elestio.app/api/v1/typebots/open-ai-assistant-chat-y5laof1/startChat"; // Use the specific URL

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

    console.log("Start chat response:", response);
    return response;
  } catch (error) {
    console.error("Error fetching TypeBots:", error.message);
    return "Axle broke!! Abort mission!!";
  }
};

const continueChat = async (sessionId, message, urls = null) => {
  console.log("sessionId aaa", sessionId, message, urls);
  const url = `https://typebot-uqjtp-u35950.vm.elestio.app/api/v1/sessions/${sessionId}/continueChat`; // Use the specific URL

  try {
    const requestBody = {
      textBubbleContentFormat: "richText", // Set the text bubble content format
      message: {
        type: "text", // Set the message type
        text: urls ? "check this document" : message, // Set the text message
        ...(urls && { attachedFileUrls: urls }), // Conditionally add attachedFileUrls if urls is not null
      },
    };
    console.log("requestBody", requestBody);
    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${process.env.TYPEBOT_API_TOKEN}`, // Ensure you have the correct token
      },
    });

    const messageText =
      response?.data?.messages?.[0]?.content?.richText?.[0]?.children?.[0]
        ?.children?.[0]?.text;
    console.log("Extracted text:", messageText);
    return messageText;
  } catch (error) {
    console.error("Error continuing chat:", error.message);
    return "Axle broke!! Abort mission!!";
  }
};

module.exports = {
  getAllTypeBots,
  startChat,
  continueChat,
};
