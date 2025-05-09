const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  storeChat,
  getChatHistory,
  updateHandshakeStatus,
  updateIsHumanStatus,
  uploadDocument,
  deleteDocument,
  whatsappMessages,
  closeChatController,
  completedDocumentController,
  assignDepartmentController,
  assignAgentController,
  getDepartmentAvailability,
  isDocumentReceived,
  getChatReports,
} = require("../../../controllers/chat/chat.controller");
const {
  getAgentChats,
  getSingleUserChat,
} = require("../../../controllers/chat/agentChats.controller");
const { fileUpload } = require("../../../middleware/file-upload");
const environment = require("../../../utils/environment");

const { Pinecone } = require("@pinecone-database/pinecone");
const {
  getToolFunctions,
  addToolToAssistant,
} = require("../../../services/openai/controller/openai.assistant.controller");
const {
  getAllComplaints,
  addComplaint,
  updateComplaint,
  deleteComplaintById,
  assignDepartmentBySessionId,
  transferChatToMainMenu,
  downloadComplaintPdf
} = require("../../../controllers/complain/complain.controller");
const {
  createSettings,
  getSettings,
  updateSettings,
  rewriteMessage,
} = require("../../../controllers/setting/settings.controller");
const { addMotorInquiry, getAllMotorInquiry, deleteMotorInquiryById } = require("../../../controllers/motorInquiry/motor.controller");
const pinecone = new Pinecone({ apiKey: environment.pinecone.apiKey });

const limiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 1, // max 1 request per 10 seconds
  message: "Too many requests, slow down!",
});
// Route to store chat
router.post("/store-chat", storeChat);

// Route to get chat history by userId
router.get("/history/:userId", getChatHistory);

// Route to update handshake
router.post("/update-handshake", updateHandshakeStatus);

// Route to update ishuman
router.post("/update-isHuman", updateIsHumanStatus);

// Route to get agent chats
router.post("/agentChats", getAgentChats);

// Get messages for a specific chat
router.post("/getmessages", getSingleUserChat);

router.post(
  "/uploadDocument",
  fileUpload(
    "file",
    ["pdf", "word", "text", "json", "csv", "image", ""],
    [
      {
        name: "file",
        maxCount: 1000,
      },
    ]
  ),
  uploadDocument
);

router.post("/deleteDocument", deleteDocument);

// router.post('/getwhatsappmessages', (req, res) => {
//   console.log(req, req.body, "details");

//   res.status(200).json({
//     message: "success",
//     data: "http://localhost:3000/api/public/whatsapp"
//   })
// })
router.get("/getwhatsappmessages", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const token = req.query["hub.verify_token"];

  const verificationToken = environment.whatsaap.whatVt;

  if (!mode || !token) {
    return res.status(400).send("Error verifying token");
  }

  if (mode === "subscribe" && token === verificationToken) {
    return res.send(challenge);
  }

  return res.status(400).send("Invalid verification request");
});

router.post("/getwhatsappmessages", whatsappMessages);

router.get("/close-chat/:sessionId", closeChatController);

router.get("/received-document/:sessionId", completedDocumentController);

router.post("/assign-department/:sessionId", assignDepartmentController);

router.get("/check-document-received/:sessionId", isDocumentReceived);

router.get("/assign-agent/:sessionId", assignAgentController);

router.get("/check-department-availability/:sessionId", limiter, getDepartmentAvailability);

router.get("/get-tools", getToolFunctions);

router.post("/addtool", addToolToAssistant);

router.post("/get-complaints", getAllComplaints);

// Route to add a new complaint
router.post("/add-complaints/:sessionId?", addComplaint);

// router.get('/complaint/:id/pdf',downloadComplaintPdf);

router.post("/transfer-to-mainmenu/:sessionId?", transferChatToMainMenu);

// Route to delete a complaint using session ID
router.delete("/delete-complaints/:complainid", deleteComplaintById);

//openai
router.post("/create-settings", createSettings);

// Route to get settings
router.get("/get-settings", getSettings);

// Route to update settings by ID
router.put("/update-setting/:id", updateSettings); // Updated to include ID

// Route to rewrite a message
router.post("/settings/rewrite", rewriteMessage);

///motor inquiry

//add-motor-inquiry
router.post("/add-motor-inquiry/:sessionId?", addMotorInquiry);
//get-all-motor-inquiry
router.get("/get-all-motor-inquiry", getAllMotorInquiry);
//delete-motor-inquiry-by-id

router.delete("/delete-motor-inquiry/:motorInquiryId", deleteMotorInquiryById);


router.post('/assign-departmentbysessionid',assignDepartmentBySessionId);


//

module.exports = router;
