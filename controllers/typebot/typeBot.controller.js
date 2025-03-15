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
  const url = `${process.env.TYPEBOT_BASE_URL}/api/v1/typebots/typebots/${botname}/startChat`; // Set the base URL and endpoint

  try {
    const response = await axios.post(
      url,
      {
        message: {
          type: "text",
          text: message.text || "Hi", // Set the text message
          attachedFileUrls: message.attachedFileUrls, // Set the attached file URLs if any
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TYPEBOT_API_TOKEN}`, // Ensure you have the correct token
        },
      }
    );

    console.log("Start chat response:", response);
    return response;
  } catch (error) {
    console.error("Error fetching TypeBots:", error.message);
    return "Axle broke!! Abort mission!!";
  }
};

const continueChat = async (sessionId, message) => {
    const url = `${process.env.TYPEBOT_BASE_URL}/api/v1/sessions/${sessionId}/continueChat`; // Set the base URL and endpoint
  
    try {
      const response = await axios.post(
        url,
        {
          message: {
            type: "text",
            text: message.text || "Hi", // Set the text message
            attachedFileUrls: message.attachedFileUrls, // Set the attached file URLs if any
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.TYPEBOT_API_TOKEN}`, // Ensure you have the correct token
          },
        }
      );
  
      console.log("Start chat response:", response);
      return response;
    } catch (error) {
      console.error("Error fetching TypeBots:", error.message);
      return "Axle broke!! Abort mission!!";
    }
  };

module.exports = {
  getAllTypeBots,
  startChat,
  continueChat
};
