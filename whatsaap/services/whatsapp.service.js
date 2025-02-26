const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { logger } = require('../../utils/logger');
const { OpenAIService } = require('./openai.service');

const openaiService = new OpenAIService();

class WhatsappService {
  constructor() {
    this.logger = logger;
    this.url = `https://graph.facebook.com/${process.env.WHATSAPP_CLOUD_API_VERSION}/${process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID}/messages`;
    this.config = {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN}`,
      },
    };
  }

  async sendWhatsAppMessage(messageSender, userInput, messageID) {
    try {
      const aiResponse = await openaiService.generateAIResponse(
        messageSender,
        userInput,
      );

      const data = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: messageSender,
        context: {
          message_id: messageID,
        },
        type: 'text',
        text: {
          preview_url: false,
          body: aiResponse,
        },
      };

      const response = await axios.post(this.url, data, this.config);
      this.logger.info('Message Sent. Status:', response.data);
      return response.data;
    } catch (error) {
      this.logger.error(error);
      return 'Axle broke!! Abort mission!!';
    }
  }

  async getMediaUrl(mediaID) {
    try {
      const url = `https://graph.facebook.com/${process.env.WHATSAPP_CLOUD_API_VERSION}/${mediaID}`;
      const response = await axios.get(url, this.config);
      return { status: 'success', data: response.data.url };
    } catch (error) {
      this.logger.error('Error fetching url', error);
      return { status: 'error', data: 'Error fetching Media Url' };
    }
  }

  // ... rest of the methods remain similar, just converted to regular async functions
}

module.exports = { WhatsappService };