const { sendWhatsAppMessage } = require("./sendWhatsappMsg.service");

const handleTextMessage = async (message, from, phoneNumberId) => {
  try {
    const msgToSend = {
      messaging_product: "whatsapp",
      to: from,
      type: "text",
      text: {
        body: `Hello! This is an automated response.`,
      },
    };

    await sendWhatsAppMessage(phoneNumberId, msgToSend);
  } catch (error) {
    console.error("Error handling text message:", error.message);
  }
};

module.exports = { handleTextMessage };
