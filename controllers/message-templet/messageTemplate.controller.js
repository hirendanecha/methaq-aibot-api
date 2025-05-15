const { default: mongoose } = require("mongoose");
const MessageTemplate = require("../../models/message-templets/message.templete");
const {
  sendSuccessResponse,
  sendErrorResponse,
} = require("../../utils/response");
const { getPagination, getPaginationData } = require("../../utils/fn");

// Create
const createTemplate = async (req, res) => {
  try {
    const { name, category, arabicText, englishText } = req.body;
    const createdBy = req.user._id;

    const template = new MessageTemplate({
      name,
      category,
      arabicText,
      englishText,
      createdBy,
    });

    await template.save();
    res.status(201).json(template);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to create template", details: err.message });
  }
};

// Update
const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const template = await MessageTemplate.findByIdAndUpdate(id, updates, {
      new: true,
    });

    if (!template) return res.status(404).json({ error: "Template not found" });

    res.json(template);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update template", details: err.message });
  }
};

// Delete
const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await MessageTemplate.findByIdAndDelete(id);

    if (!deleted) return res.status(404).json({ error: "Template not found" });

    res.json({ message: "Template deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to delete template", details: err.message });
  }
};

// Increment Usage Count (when inserted in chat)
const incrementUsage = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await MessageTemplate.findByIdAndUpdate(
      id,
      { $inc: { usageCount: 1 } },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Template not found" });

    res.json(updated);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to increment usage", details: err.message });
  }
};

const getAllTemplates = async (req, res) => {
  try {
    let { page, size, search = "", category } = req.query;
    search = search?.replace(/^[^a-zA-Z0-9\u0600-\u06FF]+/, "");

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { arabicText: { $regex: search, $options: "i" } },
        { englishText: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.category = Array.isArray(category) ? { $in: category } : category;
    }

    const count = await MessageTemplate.countDocuments(query);

    // If "all" is passed or no pagination is provided, return full list
    let templatesQuery = MessageTemplate.find(query)
      .sort({ usageCount: -1 })
      .populate({
        path: "createdBy",
        select: "fullName",
      });

    if (page && size && page !== "all" && size !== "all") {
      const { limit, offset } = getPagination(page, size);
      templatesQuery = templatesQuery.skip(offset).limit(limit);
    }

    const templates = await templatesQuery.exec();

    return sendSuccessResponse(
      res,
      page && size && page !== "all" && size !== "all"
        ? getPaginationData({ count, docs: templates }, page, size)
        : { data: templates } // Return full list if no pagination
    );
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

module.exports = {
  incrementUsage,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getAllTemplates,
};
