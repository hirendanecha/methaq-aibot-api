const { WhatsappService } = require('../services/whatsapp.service');
// const { StabilityAIService } = require('../services/stabilityai.service');
// const { AudioService } = require('../services/audio.service');
const { OpenAIService } = require('../services/openai.service');

class WhatsappController {
  constructor() {
    this.whatsappService = new WhatsappService();
    // this.stabilityaiService = new StabilityAIService();
    // this.audioService = new AudioService();
    this.openaiService = new OpenAIService();
  }

  ///its a miidle ware for verifaction token of whatsaap toekn
  whatsappVerificationChallenge(req, res) {
    const mode = req.query['hub.mode'];
    const challenge = req.query['hub.challenge'];
    const token = req.query['hub.verify_token'];

    const verificationToken = process.env.WHATSAPP_CLOUD_API_WEBHOOK_VERIFICATION_TOKEN;

    if (!mode || !token) {
      return res.status(400).send('Error verifying token');
    }

    if (mode === 'subscribe' && token === verificationToken) {
      return res.send(challenge);
    }

    return res.status(400).send('Invalid verification request');
  }

  async handleIncomingWhatsappMessage(req, res) {
    const { messages } = req?.body?.entry?.[0]?.changes?.[0].value ?? {};
    if (!messages) return res.sendStatus(200);

    const message = messages[0];
    const messageSender = message.from;
    const messageID = message.id;

    await this.whatsappService.markMessageAsRead(messageID);

    switch (message.type) {
      case 'text':
        const text = message.text.body;
        // const imageGenerationCommand = '/imagine';
        // if (text.toLowerCase().includes(imageGenerationCommand)) {
        //   const response = await this.stabilityaiService.textToImage(
        //     text.replaceAll(imageGenerationCommand, ''),
        //   );

        //   if (Array.isArray(response)) {
        //     await this.whatsappService.sendImageByUrl(
        //       messageSender,
        //       response[0],
        //       messageID,
        //     );
        //   }
        //   return res.sendStatus(200);
        // }

        await this.whatsappService.sendWhatsAppMessage(
          messageSender,
          text,
          messageID,
        );
        break;

    //   case 'audio':
    //     // ... audio handling logic remains the same
    //     break;
    }

    return res.send('Message processed');
  }
}

module.exports = { WhatsappController };