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
} = require("fs");
const DepartmentModel = require("../models/department.model");

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
    console.error(error);
    return "Axle broke!! Abort mission!!";
  }
};

const sendWhatsAppMessage = async (
  messageSender,
  context,
  messageID,
  displayPhoneNumber,
  userInput,
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
        body: userInput,
      },
    });
    await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${environment.whatsaap.whatAuthT}`,
      },
    });
    await markMessageAsRead(messageID);
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
  await markMessageAsRead(messageID);
};
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
async function downloadMedia(fileID) {
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
    console.log("File Extension:", fileExtension); // Log file extension for debugging

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

    const formData = new FormData();
    formData.append("files", createReadStream(filePath), {
      filename: fileName,
      contentType: fileType,
    });

    const response22 = await axios.post(
      `${process.env.OCR_API}/default`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const extractedText = response22?.data?.text;
    console.log("response22", response22?.data?.text);
    const month = new Date().toLocaleString("default", { month: "long" });
    const url = await s3.uploadPublic(
      filePath,
      `${fileName}`,
      `WhatsappImages/${month}`
    );
    console.log(url, "ppppp");
    return { status: "success", data: { url, extractedText } };
  } catch (e) {
    console.error("Error downloading media", e);
    return { status: "error", data: "Error downloading Media" };
  }
}

// exports.sendImageByUrl = async (messageSender, fileName, messageID, imageUrl) => {
//   const config = {
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`,
//     }
//   };


//   console.log("Sending image to:", messageSender);
//   console.log("Image URL:", imageUrl);

//   const data = JSON.stringify({
//     messaging_product: "whatsapp",
//     recipient_type: "individual",
//     to: messageSender,
//     // context: { message_id: messageID },
//     type: "image",
//     image: {
//       link: "https://headsupfortails.com/cdn/shop/files/250gpuppyFront_323e88d4-b432-4d2a-a4cd-60ad98181c9d.jpg?v=1739042541"
//     },
//   });

//   //const url = `https://graph.facebook.com/${process.env.WHATSAPP_CLOUD_API_VERSION}/${process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID}/messages`; // Corrected line

//   try {
//     const response = await axios.post(url, data, config);
//     console.log("Response data:", response.data);
//     return `Image sent successfully, response: ${response.data}`;
//   } catch (error) {
//     console.error("Error sending image:", error.response ? error.response.data : error.message);
//     return "Axle broke!! Error Sending Image!!";
//   }
// };

// const sendAudioByUrl = async (messageSender, fileName) => {
//   const audioUrl = `${process.env.SERVER_URL}/${fileName}`;
//   const data = JSON.stringify({
//     messaging_product: "whatsapp",
//     recipient_type: "individual",
//     to: messageSender,
//     type: "audio",
//     audio: { link: audioUrl },
//   });

//   try {
//     const response = axios.post(url, data, config).pipe(
//       map((res) => res.data),
//       catchError((error) => {
//         console.error(error);
//         throw new BadRequestException("Error Posting To WhatsApp Cloud API");
//       })
//     );
//     return `Audio sent successfully, response: ${await lastValueFrom(
//       response
//     )}`;
//   } catch (error) {
//     console.error(error);
//     return "Axle broke!! Error Sending Audio!!";
//   }
// };

// const markMessageAsRead = async (messageID) => {
//   const data = JSON.stringify({
//     messaging_product: "whatsapp",
//     status: "read",
//     message_id: messageID,
//   });

//   try {
//     const response = axios.post(url, data, config).pipe(
//       map((res) => res.data),
//       catchError((error) => {
//         console.error(error);
//         throw new BadRequestException("Error Marking Message As Read");
//       })
//     );
//     console.log(
//       "Message Marked As Read. Status:",
//       await lastValueFrom(response)
//     );
//   } catch (error) {
//     console.error(error);
//     return "Axle broke!! Abort mission!!";
//   }
// };

// Exporting functions using CommonJS syntax

// const sendImageByUrl = async (messageSender, fileName, messageID, imageUrl) => {
//   const config = {
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`,
//     }
//   };


//   console.log("Sending image to:", messageSender);
//   console.log("Image URL:", imageUrl);

//   const data = JSON.stringify({
//     messaging_product: "whatsapp",
//     recipient_type: "individual",
//     to: "919537222236",
//     // context: { message_id: messageID },
//     type: "image",
//     image: {
//       link: "https://headsupfortails.com/cdn/shop/files/250gpuppyFront_323e88d4-b432-4d2a-a4cd-60ad98181c9d.jpg?v=1739042541"
//     },
//   });

//   //const url = `https://graph.facebook.com/${process.env.WHATSAPP_CLOUD_API_VERSION}/${process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID}/messages`; // Corrected line

//   try {
//     const response = await axios.post(url, data, config);
//     console.log("Response data:", response.data);
//     return `Image sent successfully, response: ${response.data}`;
//   } catch (error) {
//     console.error("Error sending image:", error.response ? error.response.data : error.message);
//     return "Axle broke!! Error Sending Image!!";
//   }
// };

// const sendInteractiveMessage = async (messageSender) => {
//   const config = {
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`,
//   }};

//   const departmentsData = await fetchDepartmentsAndPrompts();
//   // const interactivePayload = {
//   //   type: "button",
//   //   body: {
//   //     text: "*Chat with AI Bot?*\n\nWould you like to interact with our intelligent AI bot?", // Bold text and improved spacing
//   //   },
//   //   action: {
//   //     buttons: [
//   //       {
//   //         type: "reply",
//   //         reply: {
//   //           id: "ai_bot_yes",
//   //           title: "Yes",
//   //         },
//   //       },
//   //       {
//   //         type: "reply",
//   //         reply: {
//   //           id: "ai_bot_no",
//   //           title: "No",
//   //         },
//   //       },
//   //     ],
//   //   },
//   // };
    

//   const dummyDepartments = [
//     {
//       _id: "dummy_1",
//       name: "Dummy Department 1",
//     },
//     {
//       _id: "dummy_2",
//       name: "Dummy Department 2",
//     },
//     {
//       _id: "dummy_3",
//       name: "Dummy Department 3",
//     },
//     {
//       _id: "dummy_4",
//       name: "Dummy Department 4",
//     },
//     {
//       _id: "dummy_5",
//       name: "Dummy Department 5",
//     },
//   ];
//   const combinedDepartments = [...departmentsData.data, ...dummyDepartments];
//   const interactivePayload = {
//     type: "button",
//     body: {
//       text: "Hello! 👋 How can I assist you today with your insurance needs? If you have any questions about our policies or services, feel free to ask!", // Bold text and improved spacing
//     },
//     action: {
//       buttons: combinedDepartments.map(department => ({
//         type: "reply",
//         reply: {
//           id: department._id, // Set _id as reply.id
//           title: department.name, // Set name as title
//         },
//       })),
//     },
//   };

//   const data = JSON.stringify({
//     messaging_product: "whatsapp",
//     recipient_type: "individual",
//     to: messageSender,
//     type: "interactive",
//     interactive: interactivePayload,
//   });

//   //const url = `https://graph.facebook.com/${process.env.WHATSAPP_CLOUD_API_VERSION}/${process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID}/messages`; // Corrected line

//   try {
//     const response = await axios.post(url, data, config);
//     console.log("Response data:", response.data);
//     return `Image sent successfully, response: ${response.data}`;
//   } catch (error) {
//     console.error("Error sending image:", error.response ? error.response.data : error.message);
//     return "Axle broke!! Error Sending Image!!";
//   }
// };
const sendInteractiveMessage = async (messageSender,messageID,payload) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
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

  const interactivePayload = {
    type: "list",
    header: {
      type: "text",
      text: payload?.headerText, // Header for the list
    },
    body: {
      text: payload?.bodyText,
    },
    action: {
      button: payload?.actionButtonText, // Button text to open the list
      sections: [
        {
          title: payload?.actionSectionTitle, // Section title
          rows: payload?.options.map((op) => ({
            id: op?._id,
            title: op?.name,
            description: `let's discuss about ${op?.name}`, // Optional description
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
    const response = await axios.post(
      url,
      data,
      config
    );
    console.log("Interactive list message sent:", response.data);
    await markMessageAsRead(messageID);
    return response.data; // Return the response data
  } catch (error) {
    console.error("Error sending interactive list message:", error);
    throw error; // Rethrow the error to be handled by the caller
  }
};
module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppMessageFromalMessage,
  downloadMedia,
  markMessageAsRead,
  sendInteractiveMessage
  // sendImageByUrl
  //   getMediaUrl,
  //   downloadMedia,
  //   sendImageByUrl,
  //   sendAudioByUrl,
  //   markMessageAsRead,
};
