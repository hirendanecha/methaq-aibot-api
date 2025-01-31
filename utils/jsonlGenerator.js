function generateJSONL(data) {
  // return data
  //   .map((item) => JSON.stringify({ prompt: item.question, completion: item.answer }))
  //   .join("\n");
  return data
    .map((item) =>
      JSON.stringify({
        messages: [
          { role: "user", content: item.question },
          { role: "assistant", content: item.answer },
        ],
      })
    )
    .join("\n");
}

module.exports = { generateJSONL };
