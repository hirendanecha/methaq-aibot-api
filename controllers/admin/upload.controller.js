const Embedding = require("../../models/embeddings.modal");
const environment = require("../../utils/environment");
const {
  extractTextFromFile,
  getPaginationData,
  getPagination,
  getCount,
} = require("../../utils/fn");
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

const openai = new OpenAIApi({
  apiKey: environment.openaiApiKey,
});

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

  const { file = [] } = req.files || {};
  try {
    const newFile = new UploadModel({
      ...(file[0] && { file: file[0] }),
      department,
      status: constants.status.statusObj.success,
    });
    await newFile.save();
    let fileContent;

    if (file[0]) {
      fileContent = await extractTextFromFile(file[0]);
    } else {
      return sendErrorResponse(res, error.message);
      // return res.status(400).send("No file or URL provided.");
    }

    fileContent = fileContent.replace(/<script.*?>.*?<\/script>/g, "");
    fileContent = fileContent.replace(/<style.*?>.*?<\/style>/g, "");
    fileContent = fileContent.replace(/<\/?[^>]+(>|$)/g, "");

    let upload = await UploadModel.findByIdAndUpdate(newFile._id, {
      content: fileContent,
    }).populate("department");

    upload = {
      content: fileContent,
      department: {
        _id: upload?.department._id,
        name: upload?.department.name,
        file_id: newFile._id,
      },
    };

    await fetchAndStoreDocuments({ details: upload });

    const chunks = fileContent
      .split("\n\n")
      .filter((chunk) => chunk.trim())
      .slice(0, 100);

    for (const chunk of chunks) {
      // const trimmedChunk = chunk.substring(0, 1000); // Truncate each chunk to 1000 characters to fit within token limits
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
    return sendSuccessResponse(res, { data: newFile }, 201);
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
    const uploadFile = await UploadModel.findByIdAndDelete(id);
    await Embedding.deleteMany({ documentId: id });
    await files
      .deleteFileByPath(
        `${uploadFile?.file?.destination}/${uploadFile?.file?.filename}`
      )
      .catch((err) => console.log(err));
    return sendSuccessResponse(res, "file deleted successfully.");
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};
module.exports = { addDocument, getAllDocument, addUrl, deleteDocument };
