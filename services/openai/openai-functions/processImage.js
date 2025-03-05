const axios = require("axios");
async function processImage(formData) {
  const response22 = await axios.post(
    `${process.env.OCR_API}/validate-document`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  let extractedText;

  const documentType = response22?.data?.document_type;
  const sideDetection = response22?.data?.side_detection;

  if (documentType === "Unknown") {
    extractedText = "*Invalid document.* Please upload a valid document.";
  } else {
    extractedText =
      `You uploaded a document of type: _${documentType}_.\n` +
      `*Front side:* ${
        sideDetection.front ? "_Detected ✅_" : "_Not Detected ❌_"
      }.\n` +
      `*Back side:* ${
        sideDetection.back ? "_Detected ✅_" : "_Not Detected ❌_"
      }.`;
  }

  return {
    status: "success",
    message: extractedText,
  };
}

module.exports = processImage;
