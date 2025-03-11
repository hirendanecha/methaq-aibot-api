exports.toolFunctions = {
  processImage: {
    type: "function",
    function: {
      name: "processImage",
      description:
        "Process and analyze an image, including document verification",
      strict: true,
      parameters: {
        type: "object",
        required: ["imageUrl"],
        properties: {
          imageUrl: {
            type: "string",
            description: "URL of the image to process",
          },
        },
        additionalProperties: false,
      },
    },
  },
  closeChat: {
    type: "function",
    function: {
      name: "closeChat",
      description: "Closes the chat session.",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
        required: [],
      },
    },
  },
  checkUserUploadedAllDocs: {
    type: "function",
    function: {
      name: "checkUserUploadedAllDocs",
      description:
        "Retrieves all documents and prepares them for further processing",
      strict: true,
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
        required: [],
      },
    },
  },

  // Add more function schemas here
};
