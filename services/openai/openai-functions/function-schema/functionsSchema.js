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

  // Add more function schemas here
};