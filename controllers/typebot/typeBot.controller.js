const axios = require("axios");

const formatRichText = (richText) => {
  return richText
    .map((item) => {
      if (item.type === "p" || item.type === "li") {
        return item.children.map((child) => child.text || "").join("");
      } else if (item.type === "ul" || item.type === "ol") {
        return item.children
          .map(
            (li) =>
              "- " +
              li.children
                .map((lic) =>
                  lic.children.map((text) => text.text || "").join("")
                )
                .join("")
          )
          .join("\n");
      } else if (item.type === "variable") {
        // Handle the "variable" type by processing its children
        return item.children.map((child) => formatRichText([child])).join("\n");
      }
      return "";
    })
    .join("\n");
};

const getFormattedMessage = (messages) => {
  //console.log("messages", messages);
  //const messages = response.messages;
  return messages
    .map((msg) => {
      if (msg.content && msg.content.richText) {
        return formatRichText(msg.content.richText);
      }
      return "";
    })
    .join("\n");
};
const getAllTypeBots = async () => {
  const url = `${process.env.TYPEBOT_BASE_URL}/api/v1/typebots?workspaceId=${process.env.TYPEBOT_WORKSPACEID}`; // Set the base URL and endpoint

  try {
    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TYPEBOT_API_TOKEN}`, // Ensure you have the correct token
      },
    });

    const typeBots = response.data; // Assuming the response contains the TypeBots data
    console.log("Fetched TypeBots:", typeBots);

    // Here you can store the typeBots in your database or any storage
    // Example: await saveTypeBotsToDatabase(typeBots);

    return typeBots;
  } catch (error) {
    console.error("Error fetching TypeBots:", error.message);
    return "Axle broke!! Abort mission!!";
  }
};

const startChat = async (botId, message) => {
  // const url = `https://typebot-uqjtp-u35950.vm.elestio.app/api/v1/typebots/${botId}/startChat`; // Use the specific URL
  const url =
    "https://typebot-uqjtp-u35950.vm.elestio.app/api/v1/typebots/welcome-bot-tony-x5fq4n9/startChat";
  try {
    const response = await axios.post(
      url
      // {
      //   message: {
      //     type: "text",
      //     text: message.text || "Hi", // Set the text message
      //     attachedFileUrls: message.attachedFileUrls, // Set the attached file URLs if any
      //   },
      // },
      // {
      //   headers: {
      //     "Content-Type": "application/json",
      //     Authorization: `Bearer ${process.env.TYPEBOT_API_TOKEN}`, // Ensure you have the correct token
      //   },
      // }
    );

    // console.log("Start chat response:", response);
    const finaloutput = getFormattedMessage(response?.data?.messages);
    return { response, finaloutput };
  } catch (error) {
    console.error("Error continuing chat:", error.response.data.message);
    return "Axle broke!! Abort mission!!";
  }
};

const continueChat = async (sessionId, message, urls = null) => {
  let interactiveMsg = false;
  let interactivePayload = null;
  console.log("sessionId aaa", sessionId, message, urls);
  const url = `https://typebot-uqjtp-u35950.vm.elestio.app/api/v1/sessions/${sessionId}/continueChat`; // Use the specific URL

  try {
    const requestBody = {
      textBubbleContentFormat: "richText", // Set the text bubble content format
      message: {
        type: "text", // Set the message type
        text: urls ? "Check this document" : message, // Set the text message
        ...(urls && { attachedFileUrls: urls }), // Conditionally add attachedFileUrls if urls is not null
      },
    };
    console.log("requestBody", requestBody);
    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
        // Authorization: `Bearer ${process.env.TYPEBOT_API_TOKEN}`, // Ensure you have the correct token
      },
    });
    // console.log(response?.data,"response?.data?.messages?.[0]?.content?.richText?.[0]?.children?.[0]");
    // new thing

    const finaloutput = getFormattedMessage(response?.data?.messages);
    console.log("finaloutput", finaloutput);
    let finaloutputDisplay =
      finaloutput.length > 60 ? finaloutput.slice(0, 50) + "..." : finaloutput;
    ///
    const messageText =
      response?.data?.messages?.[0]?.content?.richText?.[0]?.children?.[0]
        ?.children?.[0]?.text;
    // console.log("Extracted text:", messageText);

    if (response?.data?.input?.items && response?.data.input.items.length > 0) {
      interactiveMsg = true;

      // Extracting the first message text if available
      const questionText =
        response?.data?.messages?.[0]?.content?.richText?.[0]?.children?.[0]
          ?.text || "Choose an option";

      interactivePayload = {
        options: response?.data.input.items?.map((item) => {
          const name =
            item?.content.length > 24
              ? item?.content.slice(0, 24) // Adjusted to slice up to 24 characters
              : item?.content;
          return {
            typeBotId: item?.content,
            name,
            description: "",
          };
        }),
        headerText: finaloutputDisplay,
        bodyText: "Please select one of the following options:",
        actionButtonText: "Select",
        actionSectionTitle: "Available Choices",
      };
    }
    console.log(interactiveMsg, interactivePayload, "interactive");
    return { finaloutput, interactiveMsg, interactivePayload };
  } catch (error) {
    console.error("Error continuing chat:", error.message);
    return "Axle broke!! Abort mission!!";
  }
};

module.exports = {
  getAllTypeBots,
  startChat,
  continueChat,
};
