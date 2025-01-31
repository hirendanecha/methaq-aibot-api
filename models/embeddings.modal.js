const mongoose = require("mongoose");

const embeddingSchema = new mongoose.Schema({
  documentId: { type: mongoose.Types.ObjectId, ref: "uploads" },
  chunk: { type: String, required: true },
  embedding: { type: [Number], required: true }, // Array of numbers representing the embedding
});

const Embedding = mongoose.model("Embedding", embeddingSchema);

module.exports = Embedding;
