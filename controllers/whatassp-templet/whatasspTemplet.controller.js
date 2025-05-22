const axios = require('axios');
require('dotenv').config();



const WABA_ID = process.env.WABA_ID;
const TOKEN   = process.env.WABA_TOKEN;
const BASE    = 'https://graph.facebook.com/v22.0';

// 2. Delete Template (by name or ID)
exports.deleteTemplate = async (req, res) => {
    const { id, name } = req.params;
    const url = id
      ? `${BASE}/${id}`
      : `${BASE}/${WABA_ID}/message_templates`;
    const config = {
      headers: { Authorization: `Bearer ${TOKEN}` },
      params: name ? { name } : undefined
    };
    try {
      const { data } = await axios.delete(url, config);
      res.json({ success: true, result: data });
    } catch (e) {
      res.status(500).json({ success: false, error: e.response?.data || e.message });
    }
  };