const axios = require("axios");

async function documentStatus() {
  try {
    const documentInfo = "all  ducument uploaded successfully";
    return {
      status: "success",
      message: documentInfo,
    };
  } catch (error) {
    console.error("Error processing image:", error.message);
    return {
      status: "error",
      message: "Failed to process the image. Please try again later.",
    };
  }
}

module.exports = documentStatus;
