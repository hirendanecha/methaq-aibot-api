const { fetchAndStoreDocuments } = require("../../helpers/pineconeupload.helper");
const QnaModel = require("../../models/qna.model");
const { sendSuccessResponse, sendErrorResponse } = require("../../utils/response");


const getAllQnA = async (req, res) => {
  const { department } = req.query;
  try {
    const qnaList = await QnaModel.find({ department });
    return sendSuccessResponse(res, { data: qnaList });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const addQnA = async (req, res) => {
  const { question, answer, department } = req.body;
  try {
    const newQnA = new QnaModel({ question, answer, department });
    await newQnA.save();
    let populatedQnA = await newQnA.populate('department')
    populatedQnA = {
      content: newQnA.question + newQnA.answer,
      department: {
        _id: populatedQnA?.department._id,
        name: populatedQnA?.department.name,
      },
    };
    console.log("populatedQnA", populatedQnA);

    await fetchAndStoreDocuments({ details: populatedQnA });
    return sendSuccessResponse(res, { data: newQnA });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const updateQnA = async (req, res) => {
  const { id } = req.params;
  const { question, answer, department } = req.body;
  try {
    const updatedQnA = await QnaModel.findByIdAndUpdate(
      id,
      { question, answer, department },
      { new: true }
    );
    return sendSuccessResponse(res, { data: updatedQnA });
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

const deleteQnA = async (req, res) => {
  const { id } = req.params;
  try {
    await QnaModel.findByIdAndDelete(id);
    return sendSuccessResponse(res, "Q&A pair deleted successfully.");
  } catch (error) {
    return sendErrorResponse(res, error.message);
  }
};

module.exports = { getAllQnA, addQnA, updateQnA, deleteQnA };
