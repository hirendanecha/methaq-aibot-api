function isTextMessage(message) {
    return message && message.type === "text" && message.text && typeof message.text.body === "string";
  }
  
  function isInteractiveMessage(message) {
    return message && message.type === "interactive" && message.interactive;
  }
  
  function isButtonMessage(message) {
    return message && message.type === "button" && message.button && typeof message.button.payload === "string";
  }
  
  module.exports = {
    isTextMessage,
    isInteractiveMessage,
    isButtonMessage,
  };
  