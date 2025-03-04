const { PineconeStore } = require("@langchain/pinecone");
const { Pinecone } = require("@pinecone-database/pinecone");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { Document } = require("langchain/document");
const environment = require("../utils/environment");

const pinecone = new Pinecone({ apiKey: environment.pinecone.apiKey });
const MAX_TOKENS = 500; // Adjust as needed

function splitTextIntoChunks(text, chunkSize) {
  const words = text.split(" ");
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    if (currentChunk.join(" ").length + word.length + 1 > chunkSize) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
    }
    currentChunk.push(word);
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }

  return chunks;
}

async function fetchAndStoreDocuments({ details }) {
  try {
    // console.log("Fetching department details...");
    const documents = [];
    // const detailsUrl = process.env.DEPARTMENT_DETAILS_API_BASE_URL;

    // const detailsResponse = await fetch(detailsUrl);
    // if (!detailsResponse.ok) {
    //   console.warn("Failed to fetch details for department. Skipping.");
    //   return { success: false, message: "Failed to fetch details." };
    // }

    // const details = await detailsResponse.json();
    console.log("details", details);

    const detailss = details;

    const itemsToIndex = [
      //   { content: details?.data?.QNA, title: "General Insurance - Q/A", source: `${detailsUrl}/qAndA` },
      {
        content: JSON.stringify(detailss, null, 2),
        title: `${detailss?.department?.name}`,
        source: `${detailss?.department?.name}/documents`,
      },
      //   { content: details.other, title: "General Insurance - Other", source: `${detailsUrl}/other` },
    ];

    for (const item of itemsToIndex) {
      let { content, title, source } = item;
      if (!content) continue;

      // Convert content to string if it's an array of objects
      if (Array.isArray(content)) {
        content = content.map((obj) => JSON.stringify(obj)).join(" ");
      }

      if (typeof content !== "string") continue;

      // Use the simple text splitter for more natural splits
      const chunks = splitTextIntoChunks(content, MAX_TOKENS);
      for (const chunk of chunks) {
        documents.push(
          new Document({
            pageContent: chunk,
            metadata: {
              departmentId: detailss?.department?._id.toString(),
              departmentName: detailss?.department?.name,
              title,
              source,
            },
          })
        );
      }
    }

    if (documents.length > 0) {
      console.log("Embedding and storing documents in Pinecone...");
      const pineconeIndex = pinecone.Index(environment.pinecone.indexName);
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: environment.openaiApiKey,
      });
      await PineconeStore.fromDocuments(documents, embeddings, {
        pineconeIndex,
      });
      console.log("Successfully stored documents in Pinecone.");
    } else {
      console.log("No documents to store in Pinecone.");
    }

    return { success: true, message: "Stored successfully." };
  } catch (error) {
    console.error("Error during processing:", error.message);
    return { error: "Failed to process", details: error.message };
  }
}

module.exports = { fetchAndStoreDocuments };
