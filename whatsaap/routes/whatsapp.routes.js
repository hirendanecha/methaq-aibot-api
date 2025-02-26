const express = require('express');
const { WhatsappController } = require('../controllers/whatsapp.controller');

const router = express.Router();
const whatsappController = new WhatsappController();

router.get('/webhook', whatsappController.whatsappVerificationChallenge);
router.post('/webhook', whatsappController.handleIncomingWhatsappMessage);

module.exports = { whatsappRouter: router };