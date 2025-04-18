const Embedding = require("../../models/embeddings.modal");
const environment = require("../../utils/environment");
const {
  extractTextFromFile,
  getPaginationData,
  getPagination,
  getCount,
} = require("../../utils/fn");
const fs = require("fs");
const path = require("path");
const OpenAIApi = require("openai");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../../utils/response");
const UploadModel = require("../../models/uploade.model");
const { default: puppeteer } = require("puppeteer");
const cheerio = require("cheerio");
const files = require("../../helpers/files.helper");
const { status } = require("../../utils/constants");
const constants = require("../../utils/constants");
const {
  fetchAndStoreDocuments,
} = require("../../helpers/pineconeupload.helper");
const DepartmentModel = require("../../models/department.model");
const {
  createVectorStore,
} = require("../../services/openai/controller/threadsController");
// const { openai } = require("../../services/openai-config/openai-config");
const { openai } = require("../../services/openai/openai-config/openai-config");
const {
  enableFIleSearch,
} = require("../../services/openai/controller/openai.assistant.controller");
const QnaModel = require("../../models/qna.model");

const MAX_TOKENS = 500;

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

const getAllDocument = async (req, res) => {
  const { page = 1, size = 10, department } = req.query;
  const { limit, offset } = getPagination(page, size);
  const count = await getCount(UploadModel, { department });
  try {
    const qnaList = await UploadModel.find({ department })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();
    return sendSuccessResponse(
      res,
      getPaginationData({ count, docs: qnaList }, page, limit)
    );
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

// const addDocuments = async (req, res) => {
//   //   const { url } = req.body;
//   //   console.log("url", url);

//   // const { documents = [] } = req.files || {};

//   console.log("req.files", req);

//   try {
//     let fileContent;

//     //   if (url) {
//     //     // const result = await crawlWebsite(url);

//     //     // if (result) {
//     //     //   console.log("Scraped Text:", result);
//     //     // } else {
//     //     //   console.log("Failed to scrape the website.");
//     //     // }
//     //     console.log("Crawling website:", url);
//     //     const allUrls = await crawlWebsite(url);
//     //     console.log("Crawled URLs:", allUrls);

//     //     for (const pageUrl of allUrls) {
//     //       const response = await axios.get(pageUrl);
//     //       const html = response.data;
//     //       const cleanedContent = cleanHTMLContent(html);
//     //       fileContent += cleanedContent + "\n"; // Concatenate all crawled content
//     //     }
//     //     console.log("fileContent", fileContent);
//     //   } else
//     if (req.files && req.files.file) {
//       // Handle file upload
//       const file = req.files.file;
//       fileContent = await extractTextFromFile(file[0]);
//     } else {
//       return res.status(400).send("No file or URL provided.");
//     }

//     // Remove CSS, scripts, and unwanted elements
//     fileContent = fileContent.replace(/<script.*?>.*?<\/script>/g, "");
//     fileContent = fileContent.replace(/<style.*?>.*?<\/style>/g, "");
//     fileContent = fileContent.replace(/<\/?[^>]+(>|$)/g, ""); // Remove HTML tags

//     // Split content into manageable chunks
//     // const chunks = chunkText(fileContent);

//     // Split content into chunks
//     const chunks = fileContent
//       .split("\n\n")
//       .filter((chunk) => chunk.trim())
//       .slice(0, 100); // Limit to the first 100 chunks if needed for efficiency

//     // Generate and store embeddings for the chunks in MongoDB
//     for (const chunk of chunks) {
//       // const trimmedChunk = chunk.substring(0, 1000); // Truncate each chunk to 1000 characters to fit within token limits
//       const embedding = await openai.embeddings.create({
//         model: "text-embedding-ada-002",
//         input: chunk,
//       });

//       await Embedding.create({
//         chunk: chunk,
//         embedding: embedding.data[0].embedding,
//       });
//     }

//     res.status(200).send("Content processed and embeddings generated.");
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Failed to process input.");
//   }
// };

const addDocument = async (req, res) => {
  const { department } = req.body;
  const departmentDetails = await DepartmentModel.findById(department);
  if (!departmentDetails) {
    return sendErrorResponse(res, "Department not found.");
  }
  console.log(req.files, "req.files");

  const { file = [] } = req.files || {};
  try {
    const newVector = await createVectorStore(departmentDetails, file);
    console.log(newVector, "departmentDetails");

    // const updatedAssistant = await updateAssistantVectorStore(departmentDetails?.assistantDetails?.id, newVector?.vectorStore?.id)
    // console.log("updatedAssistant", updatedAssistant);

    // let fileContent;

    // if (file[0]) {
    //   fileContent = await extractTextFromFile(file[0]);
    // } else {
    //   return sendErrorResponse(res, error.message);
    //   // return res.status(400).send("No file or URL provided.");
    // }

    // fileContent = fileContent.replace(/<script.*?>.*?<\/script>/g, "");
    // fileContent = fileContent.replace(/<style.*?>.*?<\/style>/g, "");
    // fileContent = fileContent.replace(/<\/?[^>]+(>|$)/g, "");

    // let upload = await UploadModel.findByIdAndUpdate(newFile._id, {
    //   content: fileContent,
    // }).populate("department");

    // upload = {
    //   content: fileContent,
    //   department: {
    //     _id: upload?.department._id,
    //     name: upload?.department.name,
    //   },
    // };

    // await fetchAndStoreDocuments({ details: upload });

    // const chunks = fileContent
    //   .split("\n\n")
    //   .filter((chunk) => chunk.trim())
    //   .slice(0, 100);

    // for (const chunk of chunks) {
    //   // const trimmedChunk = chunk.substring(0, 1000); // Truncate each chunk to 1000 characters to fit within token limits
    //   const embedding = await openai.embeddings.create({
    //     model: "text-embedding-ada-002",
    //     input: chunk,
    //   });

    //   await Embedding.create({
    //     chunk: chunk,
    //     embedding: embedding.data[0].embedding,
    //     documentId: newFile._id,
    //   });
    // }
    return sendSuccessResponse(
      res,
      { message: "File uploaded successfullys" },
      201
    );
  } catch (error) {
    console.error(error);
    return sendErrorResponse(res, error.message);
  }
};

const addUrl = async (req, res) => {
  const { url, department } = req.body;
  let savedFileId;

  try {
    if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
      return sendErrorResponse(res, "Invalid URL provided.");
    }

    const newFile = new UploadModel({ url, department });
    const savedFile = await newFile.save();
    savedFileId = savedFile._id;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    const visited = new Set();
    const toVisit = [url];
    const scrapedData = [];

    while (toVisit.length <= 1) {
      const currentUrl = toVisit.pop();
      console.log(`Visiting: ${currentUrl}`);
      if (!currentUrl || visited.has(currentUrl)) continue;

      visited.add(currentUrl);

      try {
        console.log(`Visiting: ${currentUrl}`);
        await page.goto(currentUrl, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });

        // Extract text content using Cheerio
        const content = await page.content();
        const $ = cheerio.load(content);

        const pageText = $("body")
          .find("*")
          .not("script, style, nav, footer, header")
          .text()
          .replace(/\s+/g, " ")
          .trim();

        const pageTitle = $("title").text().trim(); // Extract title

        if (pageText) {
          scrapedData.push({ content: pageText, title: pageTitle });
        }

        // Collect internal links
        const pageLinks = await page.evaluate(() =>
          Array.from(document.querySelectorAll("a[href]"))
            .map((link) => link.href)
            .filter(
              (href) => href.startsWith(location.origin) && !href.includes("#")
            )
        );

        pageLinks.forEach((link) => {
          if (!visited.has(link) && !toVisit.includes(link)) {
            toVisit.push(link);
          }
        });
      } catch (err) {
        console.error(`Error visiting ${currentUrl}:`, err.message);
      }
    }

    await browser.close();
    console.log("Crawling complete.");
    const documents = [];

    for (const { content, title } of scrapedData) {
      const upload = await UploadModel.findByIdAndUpdate(newFile._id, {
        content: content,
      }).populate("department");
      upload = {
        content: content,
        department: {
          _id: upload?.department._id,
          name: upload?.department.name,
        },
      };
      await fetchAndStoreDocuments({ details: upload });
      const chunks = splitTextIntoChunks(content, MAX_TOKENS);

      for (const chunk of chunks) {
        const embedding = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: chunk,
        });
        await Embedding.create({
          chunk: chunk,
          embedding: embedding.data[0].embedding,
          documentId: newFile._id,
        });
      }
    }

    await UploadModel.findByIdAndUpdate(savedFile._id, {
      status: constants.status.statusObj.success,
    });

    return sendSuccessResponse(res, { data: [] }, 201);
  } catch (error) {
    console.error(error);
    await UploadModel.findByIdAndUpdate(savedFileId, {
      status: constants.status.statusObj.failed,
    });
    return sendErrorResponse(res, error.message);
  }
};

const deleteDocument = async (req, res) => {
  const { id } = req.params;

  try {
    const openaiClient = await openai; // ✅ init OpenAI client
    const uploadFile = await UploadModel.findById(id);

    if (!uploadFile) {
      return sendErrorResponse(res, "File not found.");
    }

    const assistantDocId = uploadFile?.assistantDocId; // 🧠 OpenAI file ID
    const departmentDetails = await DepartmentModel.findById(
      uploadFile.department
    );
    const vectorId = departmentDetails?.assistantDetails?.vectorId;

    // ✅ 1. Delete file from OpenAI vector store (if attached)
    if (vectorId && assistantDocId) {
      try {
        await openaiClient.beta.vectorStores.files.del(
          vectorId,
          assistantDocId
        );
        console.log(`File ${assistantDocId} detached from Vector Store`);
      } catch (err) {
        console.warn(`Error removing from vector store:`, err.message);
      }
    }

    // ✅ 2. Delete file from OpenAI file storage
    if (assistantDocId) {
      try {
        await openaiClient.files.del(assistantDocId);
        console.log(`OpenAI File ${assistantDocId} deleted`);
      } catch (err) {
        console.warn(`Error deleting OpenAI file:`, err.message);
      }
    }

    // ✅ 3. Delete local file
    await files
      .deleteFileByPath(
        `${uploadFile?.file?.destination}/${uploadFile?.file?.filename}`
      )
      .catch((err) => console.log("Local file delete error:", err));

    // ✅ 4. Delete embeddings (if any)
    await Embedding.deleteMany({ documentId: id });

    // ✅ 5. Delete UploadModel entry
    await UploadModel.findByIdAndDelete(id);

    return sendSuccessResponse(res, "File deleted successfully.");
  } catch (error) {
    console.error("deleteDocument error:", error.message);
    return sendErrorResponse(res, error.message);
  }
};

// ✅ Q/A Add API with upload to Assistant + Vector Store
const addQnaAndUploadToAssistant = async (req, res) => {
  try {
    const { departmentId } = req.body;

    if (!departmentId) {
      return sendErrorResponse(res, "Missing required fields");
    }

    let departmentDetails = await DepartmentModel.findById(departmentId);
    if (!departmentDetails) throw new Error("Department not found");

    const openaiClient = await openai;

    await enableFIleSearch(departmentDetails?.assistantDetails?.id);

    let vectorId = departmentDetails?.assistantDetails?.vectorId;
    if (!vectorId) {
      const vectorStore = await openaiClient.beta.vectorStores.create({
        name: departmentDetails?.name,
      });
      vectorId = vectorStore?.id;

      await openaiClient.beta.assistants.update(
        departmentDetails?.assistantDetails?.id,
        {
          tool_resources: {
            file_search: { vector_store_ids: [vectorId] },
          },
        }
      );

      departmentDetails = await DepartmentModel.findByIdAndUpdate(
        departmentId,
        {
          "assistantDetails.vectorId": vectorId,
        },
        { new: true }
      );
    }

    const qas = await QnaModel.find({ department: departmentId });

    const fileContent = qas
      .map((q) => `Q: ${q.question}\nA: ${q.answer}\n`)
      .join("\n");
    console.log(qas, fileContent, "qasqasqasqasqas");
    const tempDir = path.join(__dirname, "../../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `qa-${Date.now()}.txt`);
    fs.writeFileSync(tempFilePath, fileContent);

    if (departmentDetails?.assistantDetails?.qaFileId) {
      await openaiClient.files
        .del(departmentDetails.assistantDetails.qaFileId)
        .catch(console.log);
    }

    const fileStream = fs.createReadStream(tempFilePath);
    const uploadedFile = await openaiClient.files.create({
      file: fileStream,
      purpose: "assistants",
    });

    await openaiClient.beta.vectorStores.files.createAndPoll(vectorId, {
      file_id: uploadedFile.id,
    });

    const newUpload = await UploadModel.create({
      department: departmentId,
      assistantDocId: uploadedFile.id,
      file: {
        name: `qa-${Date.now()}.txt`,
        size: fileContent.length,
      },
      status: "success",
      content: fileContent,
    });

    await DepartmentModel.findByIdAndUpdate(departmentId, {
      "assistantDetails.qaFileId": uploadedFile.id,
    });
    // fs.unlinkSync(tempFilePath); // Clean up temp
    return sendSuccessResponse(res, {
      message: "Q/A added and synced to Assistant successfully.",
      fileId: uploadedFile.id,
      upload: newUpload,
    });
  } catch (err) {
    console.error("addQnaAndUploadToAssistant Error:", err);
    return sendErrorResponse(res, err.message);
  }
};

module.exports = {
  addDocument,
  getAllDocument,
  addUrl,
  deleteDocument,
  addQnaAndUploadToAssistant,
};
