const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
  clientId: { type: String, index: true, default: "admin" },
  title: { type: String, required: true },
  fileName: { type: String },
  fileType: {
    type: String,
    enum: ["pdf", "txt", "md", "csv", "text"],
    required: true,
  },
  content: { type: String, required: true },
  size: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

documentSchema.index({ content: "text", title: "text" });
documentSchema.index({ clientId: 1, isActive: 1 });

module.exports = mongoose.model("Document", documentSchema);
