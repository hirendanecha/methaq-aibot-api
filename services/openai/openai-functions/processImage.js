const axios = require("axios");
const { OpenAI } = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function processImage(formData, prompt) {
  try {
    const response22 = await axios.post(
      `${process.env.OCR_API}/validate-document-from-urls`,
      formData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    let extractedText;
   // console.log(response22?.data,"response22response22");
    
    const documentType = response22?.data?.document_types;
    const sideDetection = response22?.data?.side_detections;

    const documentInfo = {
      documentType,
      sideDetection,
    };

    if (documentType === "Unknown") {
      extractedText = "*Invalid document.* Please upload a valid document.";
    } else {
      extractedText =
        `You uploaded a document of type: _${documentType}_.\n` +
        `*Front side:* ${sideDetection.front ? "_Detected ✅_" : "_Not Detected ❌_"
        }.\n` +
        `*Back side:* ${sideDetection.back ? "_Detected ✅_" : "_Not Detected ❌_"
        }.`;
    }
    // const response = await openai.chat.completions.create({
    //   model: "gpt-4o-mini",
    //   messages: [
    //     { role: "system", content: prompt },
    //     { role: "user", content: JSON.stringify(documentInfo) }, // Send as JSON string
    //   ],
    // });
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

module.exports = processImage;
