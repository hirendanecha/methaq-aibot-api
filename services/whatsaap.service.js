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
  isHumanReal
) => {
  console.log(userInput, "isHumanReal");

  // console.log(isHumanReal, "isHumanReal");


  // const isHuman = isHumanReal ? true : await isHumanChatRequest(userInput);
  // console.log(isHuman, "isHuman");

  if (isHumanReal) {
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
  } else {
    // const response = await generateAIResponse(context, userInput);

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
  }
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
module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppMessageFromalMessage,
  downloadMedia,
  markMessageAsRead,
  // sendImageByUrl
  //   getMediaUrl,
  //   downloadMedia,
  //   sendImageByUrl,
  //   sendAudioByUrl,
  //   markMessageAsRead,
};
