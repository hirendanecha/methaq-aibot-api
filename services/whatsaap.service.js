const { generateAIResponse } = require("./openai/openai.service");
const environment = require("../utils/environment");
const axios = require("axios");
const { isHumanChatRequest } = require("./openai/tool/transferChat");
const s3 = require("../helpers/s3.helper");
const path = require("path");
const FormData = require("form-data");
const {
  existsSync,
  mkdirSync,
  writeFileSync,
  createReadStream,
  readFileSync,
  unlinkSync,
} = require("fs");
const DepartmentModel = require("../models/department.model");
const { handleUserMessage } = require("./openai/controller/threadsController");
const { openai } = require("./openai/openai-config/openai-config");
const processImage = require("./openai/openai-functions/processImage");

url = `https://graph.facebook.com/${process.env.WHATSAPP_CLOUD_API_VERSION}/${process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID}/messages`;

const markMessageAsRead = async (messageID) => {
  const data = JSON.stringify({
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageID,
  });

  try {
    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${environment.whatsaap.whatAuthT}`,
      },
    });

    console.log("Message Marked As Read. Status:", response.data);
  } catch (error) {
    console.error(error.message);
    return "Axle broke!! Abort mission!!";
  }
};

const sendWhatsAppMessage = async (
  messageSender,
  context,
  messageID,
  displayPhoneNumber,
  userInput
) => {
  const data = JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: messageSender,
    // ...(messageID ? { context: { message_id: messageID } } : {}),
    type: "text",
    text: {
      preview_url: false,
      body: userInput,
    },
  });
  await axios.post(url, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${environment.whatsaap.whatAuthT}`,
    },
  });
  // messageID && (await markMessageAsRead(messageID));
};

const sendWhatsAppMessageFromalMessage = async (
  messageSender,
  messageID,
  formalMessage
) => {
  const data = JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: messageSender,
    // context: {
    //   message_id: messageID,
    // },
    type: "text",
    text: {
      preview_url: false,
      body: formalMessage,
    },
  });
  await axios.post(url, data, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${environment.whatsaap.whatAuthT}`,
    },
  });
  //await markMessageAsRead(messageID);
};

//convert pdf to image//

async function getMediaUrl(mediaID) {
  const url = `https://graph.facebook.com/${process.env.WHATSAPP_CLOUD_API_VERSION}/${mediaID}`;
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`,
      },
    });
    return { status: "success", data: response.data.url };
  } catch (e) {
    console.error("Error fetching url", e);
    return { status: "error", data: "Error fetching Media Url" };
  }
}
async function downloadMedia(fileID, existingChat) {
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`,
    },
    responseType: "arraybuffer",
  };

  try {
    const urlResult = await getMediaUrl(fileID);
    if (urlResult.status === "error") {
      throw new Error("Failed to get media url");
    }

    const response = await axios.get(urlResult.data, config);
    const fileType = response?.headers["content-type"];
    console.log("File Type:", fileType); // Log file type for debugging

    const fileExtension = fileType?.split("/")[1];

    if (!fileExtension) {
      throw new Error("File extension could not be determined");
    }

    const fileName = `${fileID}.${fileExtension}`;
    const folderName = "images"; // Set the folder name to 'images'

    const folderPath = path.join(process.cwd(), folderName);
    const filePath = path.join(folderPath, fileName);

    // Check if the images folder exists, if not create it
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath);
    }

    // return response.data;
    writeFileSync(filePath, response.data);

    const month = new Date().toLocaleString("default", { month: "long" });
    const url = await s3.uploadPublic(
      filePath,
      fileType,
      `${fileName}`,
      `WhatsappImages/${month}`
    );
    console.log(url, "ppppp");
    unlinkSync(filePath);
    return {
      status: "success",
      data: { url, filePath, fileType, file: response.data },
    };
  } catch (e) {
    console.error("Error downloading media", e);
    return { status: "error", data: "Error downloading Media" };
  }
}

const sendImageByUrl = async (messageSender, fileName, messageID, imageUrl) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`,
    },
  };

  console.log("Sending image to:", messageSender);
  console.log("Image URL:", imageUrl);

  const data = JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: messageSender,
    // context: { message_id: messageID },
    type: "image",
    image: {
      link: imageUrl,
    },
  });

  try {
    const response = await axios.post(url, data, config);
    console.log("Response data:", response.data);
    return `Image sent successfully, response: ${response.data}`;
  } catch (error) {
    console.error(
      "Error sending image:",
      error.response ? error.response.data : error.message
    );
    return "Axle broke!! Error Sending Image!!";
  }
};

const sendDocumentByUrl = async (
  messageSender,
  fileName,
  messageID,
  imageUrl
) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`,
    },
  };

  console.log("Sending image to:", messageSender);
  console.log("Image URL:", imageUrl);

  const data = JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: messageSender,
    // context: { message_id: messageID },
    type: "document",
    document: {
      // id: "<MEDIA_ID>" /* Only if using uploaded media */,
      link: imageUrl /* Only if linking to your media */,
      // caption: "<DOCUMENT_CAPTION>",
      // filename: "<DOCUMENT_FILENAME>",
    },
  });

  try {
    const response = await axios.post(url, data, config);
    console.log("document data:", response.data);
    return `document sent successfully, response: ${response.data}`;
  } catch (error) {
    console.error(
      "Error sending document:",
      error.response ? error.response.data : error.message
    );
    return "Axle broke!! Error Sending document!!";
  }
};

const sendListMessage = async (messageSender, messageID, buttonPayload) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`,
    },
  };

  const buttonInteractivePayload = {
    type: "button",
    header: {
      type: "text",
      text: "Change Department", // Static header text
    },
    body: {
      text: "Choose the option Yes/No or to go to the main menu, choose Main-Menu.", // Updated body text
    },
    action: {
      buttons: [
        {
          type: "reply",
          reply: {
            id: "yes_option",
            title: "Yes", // New button title
          },
        },
        {
          type: "reply",
          reply: {
            id: "no_option",
            title: "No", // New button title
          },
        },
        {
          type: "reply",
          reply: {
            id: "main_menu_option",
            title: "Main-Menu", // New button title
          },
        },
      ],
    },
  };

  const data = JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: messageSender,
    type: "interactive",
    interactive: buttonPayload,
  });

  try {
    const response = await axios.post(url, data, config);
    console.log("Button interactive message sent:", response.data);
    // messageID && (await markMessageAsRead(messageID));
    return response.data; // Return the response data
  } catch (error) {
    console.error(
      "Error sending button interactive message:",
      error.response.data.message
    );
    throw error; // Rethrow the error to be handled by the caller
  }
};

const sendInteractiveMessage = async (messageSender, messageID, payload) => {
  const config = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`,
    },
  };

  // const departmentsData = await fetchDepartmentsAndPrompts(); // Assuming this fetches data correctly
  // const dummyDepartments = [
  //   { _id: "dummy_1", name: "Dummy Department 1" },
  //   { _id: "dummy_2", name: "Dummy Department 2" },
  //   { _id: "dummy_3", name: "Dummy Department 3" },
  //   { _id: "dummy_4", name: "Dummy Department 4" },
  //   { _id: "dummy_5", name: "Dummy Department 5" },
  // ];
  // const combinedDepartments = [...departmentsData.data];

  // console.log(payload, "yyypayload");

  const interactivePayload = {
    type: "list",
    header: {
      type: "text",
      text: payload?.headerText || "Default body text", // Header for the list
    },
    body: {
      text: payload?.bodyText || "Default body text",
    },
    action: {
      button: payload?.actionButtonText || "Default body text", // Button text to open the list
      sections: [
        {
          title: payload?.actionSectionTitle, // Section title
          rows: payload?.options?.map((op) => ({
            id: op?.depId || "y5laof1",
            title: op?.name,
            description: `${op?.description ?? ""}`, // Optional description
          })),
        },
      ],
    },
  };

  const data = JSON.stringify({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: messageSender,
    type: "interactive",
    interactive: interactivePayload,
  });

  try {
    const response = await axios.post(url, data, config);
    console.log("Interactive list message sent:", response.data);
    // await markMessageAsRead(messageID);
    return response.data; // Return the response data
  } catch (error) {
    console.error("Error sending interactive list message:", error.message);
    throw error; // Rethrow the error to be handled by the caller
  }
};

const sendTypingIndicator = async (messageSender, messageID) => {
  const data = JSON.stringify({
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageID,
    typing_indicator: {
      type: "text",
    },
  });

  try {
    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${environment.whatsaap.whatAuthT}`,
      },
    });

    console.log("Typing indicator sent. Status:", response.data);
  } catch (error) {
    console.error("Error sending typing indicator:", error.message);
    throw error; // Rethrow the error to be handled by the caller
  }
};

module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppMessageFromalMessage,
  downloadMedia,
  markMessageAsRead,
  sendInteractiveMessage,
  sendImageByUrl,
  sendDocumentByUrl,
  sendListMessage,
  sendTypingIndicator,
};
