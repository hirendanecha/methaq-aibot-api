const { facebookAxiosInstance } = require("../core/Instance/axios-instance");
const environment = require("../utils/environment");

const sendWhatsAppMessage = async (phoneNumberId, message) => {
  try {
    const accessToken = environment.whatsaap.whatAt;

    await facebookAxiosInstance.post(
      `/${phoneNumberId}/messages?access_token=${accessToken}`,
      message,
    );
    console.log('Message sent successfully.');

  } catch (error) {
    console.error("Failed to send message:", error.response?.data || error.message);
  }
};

module.exports = {
  sendWhatsAppMessage,
};
