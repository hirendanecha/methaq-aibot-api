const { generateAIResponse } = require("./openai/openai.service");
const environment = require("../utils/environment");
const axios = require("axios");
const { isHumanChatRequest } = require("./openai/tool/transferChat");

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
  userInput
) => {
  console.log("Message Sender:", userInput);

  const isHuman = await isHumanChatRequest(userInput);
  if (isHuman) {
    const data = JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: messageSender,
      context: {
        message_id: messageID,
      },
      type: "text",
      text: {
        preview_url: false,
        body: "Hey, wait! We are working on the Human Interaction feature.",
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
    const response = await generateAIResponse(context, userInput);

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
        body: response,
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
      body:formalMessage,
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

// const getMediaUrl = async (mediaID) => {
//   const mediaUrl = `https://graph.facebook.com/${process.env.WHATSAPP_CLOUD_API_VERSION}/${mediaID}`;
//   try {
//     const response = await axios.get(mediaUrl, config);
//     return { status: "success", data: response.data.url };
//   } catch (e) {
//     console.error("Error fetching url", e);
//     return { status: "error", data: "Error fetching Media Url" };
//   }
// };

// const downloadMedia = async (fileID) => {
//   const media = await getMediaUrl(fileID);
//   if (media.status === "error") {
//     throw new Error("Failed to get media url");
//   }

//   try {
//     const response = await axios.get(media.data, {
//       headers: config.headers,
//       responseType: "arraybuffer",
//     });

//     const fileType = response.headers["content-type"];
//     const fileExtension = fileType.split("/")[1];
//     const fileName = `${fileID}.${fileExtension}`;

//     const folderName = process.env.AUDIO_FILES_FOLDER;
//     const folderPath = path.join(process.cwd(), folderName);
//     const filePath = path.join(folderPath, fileName);

//     if (!existsSync(folderPath)) mkdirSync(folderPath);
//     writeFileSync(filePath, response.data);

//     return { status: "success", data: filePath };
//   } catch (e) {
//     console.error("Error fetching url", e);
//     return { status: "error", data: "Error fetching Media Url" };
//   }
// };

// const sendImageByUrl = async (messageSender, fileName, messageID) => {
//   const imageUrl = `${process.env.SERVER_URL}/${fileName}`;
//   const data = JSON.stringify({
//     messaging_product: "whatsapp",
//     recipient_type: "individual",
//     to: messageSender,
//     context: { message_id: messageID },
//     type: "image",
//     image: { link: imageUrl },
//   });

//   try {
//     const response = axios.post(url, data, config).pipe(
//       map((res) => res.data),
//       catchError((error) => {
//         console.error(error);
//         throw new BadRequestException("Error Posting To WhatsApp Cloud API");
//       })
//     );
//     return `Image sent successfully, response: ${await lastValueFrom(
//       response
//     )}`;
//   } catch (error) {
//     console.error(error);
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
module.exports = {
  sendWhatsAppMessage,
  sendWhatsAppMessageFromalMessage,
  //   getMediaUrl,
  //   downloadMedia,
  //   sendImageByUrl,
  //   sendAudioByUrl,
  //   markMessageAsRead,
};
