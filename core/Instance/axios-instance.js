const axios = require("axios");

const facebookAxiosInstance = axios.create({
    baseURL: 'https://graph.facebook.com/v20.0',
    headers: {
      'Content-Type': 'application/json',
    },
});

module.exports = {
    facebookAxiosInstance
  };