const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "assistant"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const chatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  clientId: { type: String, index: true, default: "admin" },
  title: { type: String, default: "New Chat" },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

chatSessionSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

chatSessionSchema.index({ clientId: 1, createdAt: -1 });

module.exports = mongoose.model("ChatSession", chatSessionSchema);
