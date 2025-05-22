const axios = require("axios");
const {
  sendErrorResponse,
  sendSuccessResponse,
} = require("../../utils/response");
const { getPaginationData, getPagination } = require("../../utils/fn");
require("dotenv").config();

const WABA_ID = process.env.WhatsApp_Business_Account_ID;
const TOKEN = process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN;

// 2. Delete Template (by name or ID)

const getAllWhatsappTemplet = async (req, res) => {
    try {
      const { page = 1, size = 10, search } = req.query;
      const url = `https://graph.facebook.com/v22.0/${WABA_ID}/message_templates`;
  
      const { limit, offset } = getPagination(page, size);
  
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      });
  
      let templates = response.data.data || [];
  
      // Filter by search
      if (search) {
        const cleanSearch = search.replace(/^[^a-zA-Z0-9]+/, "").toLowerCase();
        templates = templates.filter((template) =>
          template.name.toLowerCase().includes(cleanSearch)
        );
      }
  
      // Manual pagination
      const responcedate = templates.slice(offset, offset + limit);
  
      return sendSuccessResponse(
        res,
        getPaginationData({ count: templates.length, docs: responcedate }, page, limit)
      );
    } catch (error) {
      return sendErrorResponse(
        res,
        error?.response?.data?.error?.message || error.message
      );
    }
  };

module.exports = {
  getAllWhatsappTemplet,
};
