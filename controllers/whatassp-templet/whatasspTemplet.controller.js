const axios = require("axios");
const {
  sendErrorResponse,
  sendSuccessResponse,
} = require("../../utils/response");
const { getPaginationData, getPagination } = require("../../utils/fn");
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const TemplateAccessModel = require("../../models/whatsappTemplate-access.model");
const UserModel = require("../../models/user.model");

const WABA_ID = process.env.WhatsApp_Business_Account_ID;
const TOKEN = process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN;
const APPID = process.env.WhatsApp_APPID;


const buildHeaderComponent = (mediaType, mediaUrl) => {
  if (!mediaType || mediaType === "NONE") return null;

  if (mediaType === "TEXT") {
    return {
      type: "HEADER",
      format: "TEXT",
      text: mediaUrl,
    };
  }

  return {
    type: "HEADER",
    format: mediaType, // IMAGE, VIDEO, DOCUMENT,
    example: {
      header_handle: [mediaUrl],
    },
  };
};


const createWhatsappTemplate = async (req, res) => {
  try {
    let {
      name,
      language,
      category,
      mediaType,   // "TEXT", "IMAGE", "VIDEO", "DOCUMENT", "NONE"
      mediaUrl,    // media handle URL or text (for TEXT header)
      bodyText,
      bodyExample,
      footerText,
      buttons,
    } = req.body;

    if (!name || !language || !category || !bodyText) {
      return sendErrorResponse(res, "Missing required fields: name, language, category, bodyText", 400, true, true);
    }

    let parsedButtons = [];
    if (buttons) {
      parsedButtons = JSON.parse(buttons);
    }

    let parsedBodyExample = [];
    if (bodyExample) {
      parsedBodyExample = JSON.parse(bodyExample);
    }


    const files = req.files
    if (files.doc) {
      const fileData = files.doc[0];
      const localPath = fileData.path.replaceAll("\\", "/");
      const fileStat = fs.statSync(localPath);

      const fileName = path.basename(localPath);
      const fileType = fileData.mimetype;
      const fileLength = fileStat.size;

      // Step 1: Get Upload URL
      const uploadMetaRes = await axios.post(
        `https://graph.facebook.com/v22.0/${APPID}/uploads`,
        null,
        {
          params: {
            file_name: fileName,
            file_length: fileLength,
            file_type: fileType,
            access_token: TOKEN,
          },
        }
      );

      const { id } = uploadMetaRes.data;

      // Step 2: Upload the file to Meta's upload_url
      const fileBuffer = fs.readFileSync(localPath);

      const mediaDoc = await axios.post(`https://graph.facebook.com/v22.0/${id}`, fileBuffer, {
        headers: {
          'Authorization': `OAuth ${TOKEN}`,
          'file_offset': '0',
          'Content-Type': fileType,
        },
      });
      mediaUrl = mediaDoc.data.h
      fs.unlinkSync(localPath);

    }

    const components = [];

    const header = buildHeaderComponent(mediaType, mediaUrl);
    if (header) components.push(header);

    if (parsedBodyExample && parsedBodyExample.length > 0) {
      components.push({
        type: "BODY",
        text: bodyText,
        example: { "body_text": [JSON.parse(bodyExample)] }
      })
    }

    if (!parsedBodyExample || parsedBodyExample.length === 0) {
      components.push({
        type: "BODY",
        text: bodyText,
      });
    }

    if (footerText) {
      components.push({
        type: "FOOTER",
        text: footerText,
      });
    }

    if (parsedButtons && parsedButtons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: parsedButtons,
      });
    }

    const payload = {
      name,
      language,
      category,
      components,
    };

    const url = `https://graph.facebook.com/v22.0/${WABA_ID}/message_templates`;

    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    return sendSuccessResponse(res, {
      data: response.data,
      message: "Template created successfully",
    });

  } catch (error) {
    return sendErrorResponse(
      res,
      error?.response?.data?.error?.message || error.message,
      error?.response?.status || 500
    );
  }
};


const getAllWhatsappTemplet = async (req, res) => {
  try {
    const { _id: adminId, role } = req.user;
    const { page = 1, size = 10, search } = req.query;
    const url = `https://graph.facebook.com/v22.0/${WABA_ID}/message_templates`;

    const { limit, offset } = getPagination(page, size);

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    let templates = response.data.data || [];

    if (role === "Agent") {
      const access = await TemplateAccessModel.findOne({ userId: adminId });
      const allowedTemplates = access?.templateNames || [];

      templates = templates.filter(template =>
        allowedTemplates.includes(template.name)
      );
    }

    if (search) {
      const cleanSearch = search.replace(/^[^a-zA-Z0-9]+/, "").toLowerCase();
      templates = templates.filter(template =>
        template.name.toLowerCase().includes(cleanSearch)
      );
    }

    const responcedate = templates.slice(offset, offset + limit);

    return sendSuccessResponse(
      res,
      getPaginationData({ count: templates.length, docs: responcedate }, page, limit)
    );
  } catch (error) {
    return sendErrorResponse(
      res,
      error?.response?.data?.error?.message || error.message
    );
  }
};

const getTemplateByName = async (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return sendErrorResponse(res, "Template name is required", 400, true, true);
    }

    const url = `https://graph.facebook.com/v22.0/${WABA_ID}/message_templates`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const templates = response.data?.data || [];
    const foundTemplate = templates.find(t => t.name === name);

    if (!foundTemplate) {
      return sendErrorResponse(res, "Template not found", 404, true, true);
    }

    return sendSuccessResponse(res, { data: foundTemplate });
  } catch (error) {
    return sendErrorResponse(
      res,
      error?.response?.data?.error?.message || error.message,
      error?.response?.status || 500
    );
  }
};


const getWhatsappTempletNames = async (req, res) => {
  try {
    const url = `https://graph.facebook.com/v22.0/${WABA_ID}/message_templates`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const templates = response.data.data || [];

    const templateNames = templates.map(t => t.name);

    return sendSuccessResponse(res, {
      data: templateNames,
    });
  } catch (error) {
    return sendErrorResponse(
      res,
      error?.response?.data?.error?.message || error.message
    );
  }
};

// Delete WhatsApp Template by name
const deleteWhatsappTemplet = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return sendErrorResponse(res, "Template name is required");
    }

    const url = `https://graph.facebook.com/v22.0/${WABA_ID}/message_templates?name=${encodeURIComponent(name)}`;

    const response = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    return sendSuccessResponse(res, response.data);
  } catch (error) {
    return sendErrorResponse(
      res,
      error?.response?.data?.error?.message || error.message
    );
  }
};

const assignTemplatesToUser = async (req, res) => {
  try {
    const { _id: adminId } = req.user;
    const { userId, templateNames, departmentId } = req.body;

    if (!Array.isArray(templateNames) || templateNames.length === 0) {
      return sendErrorResponse(res, "templateNames is required", 400, true, true);
    }

    if (userId) {
      await upsertTemplateAccess(userId, templateNames, adminId);
      return sendSuccessResponse(res, { message: "Templates assigned to user" });
    }

    if (departmentId) {
      const agents = await UserModel.find(
        { role: "Agent", department: departmentId },
        { _id: 1 }
      );

      const bulkOps = agents.map(agent => ({
        updateOne: {
          filter: { userId: agent._id },
          update: {
            $addToSet: { templateNames: { $each: templateNames } },
            $setOnInsert: { assignedBy: adminId },
          },
          upsert: true,
        }
      }));

      await TemplateAccessModel.bulkWrite(bulkOps);

      return sendSuccessResponse(res, {
        message: `Templates assigned to ${agents.length} agents in the department`,
      });
    }

    return sendErrorResponse(res, "Either userId or departmentId is required", 400, true, true);
  } catch (error) {
    return sendErrorResponse(res, error.message || "Assignment failed");
  }
};

const upsertTemplateAccess = async (userId, templateNames, assignedBy) => {
  const existingAccess = await TemplateAccessModel.findOne({ userId });

  if (existingAccess) {
    await TemplateAccessModel.updateOne(
      { userId },
      { $addToSet: { templateNames: { $each: templateNames } } }
    );
  } else {
    await TemplateAccessModel.create({
      userId,
      templateNames,
      assignedBy,
    });
  }
};


module.exports = {
  createWhatsappTemplate,
  getAllWhatsappTemplet,
  deleteWhatsappTemplet,
  getWhatsappTempletNames,
  getTemplateByName,
  assignTemplatesToUser
};
