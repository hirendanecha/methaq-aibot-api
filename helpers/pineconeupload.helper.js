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

async function markDocumentsAsDeletedByMetadata({ departmentId }) {
  try {
    console.log(
      `📝 Marking documents as deleted for departmentId: ${departmentId}`
    );
    const pineconeIndex = pinecone.Index(
      environment.pinecone.indexName,
      "https://yyy-u35uogv.svc.aped-4627-b74a.pinecone.io"
    );

    // Retrieve vectors manually
    console.log("🔄 Retrieving vectors manually...");
    const queryResponse = await pineconeIndex.query({
      topK: 10000, // Adjust as needed
      includeMetadata: true,
      includeValues: true, // ✅ Ensure vector values are retrieved
      vector: new Array(1536).fill(0), // Dummy vector for retrieval
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      console.log("⚠ No vectors found.");
      return { success: false, message: "No documents found." };
    }

    // Filter only the ones matching departmentId
    const docsToUpdate = queryResponse.matches.filter(
      (match) => match.metadata?.departmentId === "679dcd5985b7e9177bc700bf"
    );

    if (docsToUpdate.length === 0) {
      return { success: false, message: "No documents found for updating." };
    }

    console.log(`📌 Found ${docsToUpdate.length} documents. Updating...`);

    // Update each document with isDeleted: true
    const batchSize = 100;
    for (let i = 0; i < docsToUpdate.length; i += batchSize) {
      const batch = docsToUpdate.slice(i, i + batchSize);
      const updates = batch.map((doc) => ({
        id: doc.id,
        values: doc.values, // ✅ Ensure we reuse existing vector values
        metadata: { ...doc.metadata, isDeleted: true }, // ✅ Add isDeleted flag
      }));

      await pineconeIndex.upsert({ vectors: updates });
      console.log(`✅ Updated ${batch.length} documents.`);
    }

    return {
      success: true,
      message: "Documents marked as deleted successfully.",
    };
  } catch (error) {
    console.error("❌ Error during document update:", error);
    return { error: "Failed to update documents", details: error.message };
  }
}

async function fetchAndStoreDocuments({ details }) {
  try {
    // console.log("Fetching department details...");
    const documents = [];

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
      console.log("details", details);
      // Use the simple text splitter for more natural splits
      const chunks = splitTextIntoChunks(content, MAX_TOKENS);
      for (const chunk of chunks) {
        documents.push(
          new Document({
            pageContent: chunk,
            metadata: {
              fileId: detailss?.department?.file_id.toString(),
              departmentId: detailss?.department?._id.toString(),
              departmentName: detailss?.department?.name,
              title,
              source,
            },
          })
        );
      }
    }
    console.log("documents", documents);
    if (documents.length > 0) {
      console.log("Embedding and storing documents in Pinecone...");
      const pineconeIndex = pinecone.Index(environment.pinecone.indexName);
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: environment.openaiApiKey,
      });
      await PineconeStore.fromDocuments(documents, embeddings, {
        pineconeIndex,
        namespace: detailss?.department?.name,
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

async function deleteDocumentsByMetadata({ departmentName }) {
  try {
    const pineconeIndex = pinecone.Index(environment.pinecone.indexName);

    const index = pinecone.Index(process.env.PINECONE_INDEX_NAME);
    //index.delete(delete_all=true, namespace='cvcvcv')
    await index.namespace(departmentName).deleteAll();
    // const vectorDimension = 1536;
    // const dummyVector = new Array(vectorDimension).fill(0);
    // const queryResponse222 = await pineconeIndex.query({
    //   vector: dummyVector,
    //   topK: 1000, // Set a high number if your dataset is small; otherwise, implement pagination.
    //   includeMetadata: true,
    //   includeValues: false,
    // });
    // console.log(queryResponse222);
    // const queryResponse = await pineconeIndex.query({
    //   vector: new Array(1536).fill(0),
    //   filter: {
    //     departmentId: { $eq: departmentId }
    //   },
    //   topK: 1000, // Set a high number if your dataset is small; otherwise, implement pagination.
    //   includeMetadata: true,

    // });

    // const ids = queryResponse.matches.map(match => match.id);
    // console.log(ids);
    // await pineconeIndex.deleteMany(ids);
    // 3. Delete records by IDs
    //   await pineconeIndex.delete({
    //     ids: ids,
    //     deleteAll: false,
    //     namespace: ""  // default namespace
    // });
    // const allData = queryResponse.matches || [];
    // const record = allData.find(
    //   (item) => item.metadata && item.metadata.departmentId === departmentId
    // );

    // const recordsToDelete = allData.filter(
    //   (item) => item.metadata && item.metadata.departmentId === departmentId
    // );

    // console.log(recordsToDelete);
    // await ns.deleteOne("e972c241-6f2a-445b-ac29-5d851e1c5ffe");
    // for (const record of recordsToDelete) {
    //   try {
    //     // Pass the record id directly instead of an object.
    //     await ns.deleteOne("e972c241-6f2a-445b-ac29-5d851e1c5ffe");
    //     console.log(`Deleted record with id: ${record.id}`);
    //   } catch (error) {
    //     console.error(`Failed to delete record with id: ${record.id}`, error);
    //   }
    // }

    // Execute the delete operation
    // await pineconeIndex.deleteMany({ filter });

    console.log("Successfully deleted documents from Pinecone");
    return { success: true, message: "Documents deleted successfully" };
  } catch (error) {
    console.error("Error deleting documents:", error.message);
    return { success: false, error: "Deletion failed", details: error.message };
  }
}

// async function deleteDocumentsByMetadata({ departmentId }) {
//   try {
//     console.log(`🗑 Deleting documents from Pinecone for departmentId: ${departmentId}`);

//     const pineconeIndex = pinecone.Index(environment.pinecone.indexName,"https://yyy-u35uogv.svc.aped-4627-b74a.pinecone.io");
//     markDocumentsAsDeletedByMetadata({ departmentId });
//     // Check index stats to see if metadata indexing is enabled
//     const indexStats = await pineconeIndex.describeIndexStats();
//     const metadataIndexed = indexStats.metadataConfig &&
//                             indexStats.metadataConfig.indexed &&
//                             indexStats.metadataConfig.indexed.includes(departmentId);

//     const queryResponse = await pineconeIndex.query({
//       topK: 10000, // Adjust this value if necessary
//       includeMetadata: true,
//       vector: new Array(1536).fill(0), // Dummy vector for retrieval
//     });

//     console.log("🔄 Retrieving vectors manually...",);
//     if (!queryResponse.matches || queryResponse.matches.length === 0) {
//       console.log("⚠ No vectors found.");
//       return { success: false, message: "No documents found." };
//     }

//     const idsToDelete = queryResponse.matches
//       .filter(match => match.metadata?.departmentId === departmentId)
//       .map(match => match.id);

//     if (idsToDelete.length === 0) {
//       return { success: false, message: "No documents found for deletion." };
//     }

//     //console.log(`📌 Found ${idsToDelete.length} documents. Deleting in batches...`);
//     const batchSize = 100;
//     // for (let i = 0; i < idsToDelete.length; i += batchSize) {
//     //   const batch = idsToDelete.slice(i, i + batchSize);
//     //   await pineconeIndex.deleteMany({ ids: batch });
//     //   console.log(`🗑 Deleted ${batch.length} documents.`);
//     // }

//     return { success: true, message: "Documents deleted successfully." };

//   } catch (error) {
//     console.error("❌ Error during document deletion:", error);
//     return { error: "Failed to delete", details: error.message };
//   }
// }

module.exports = { fetchAndStoreDocuments, deleteDocumentsByMetadata };
