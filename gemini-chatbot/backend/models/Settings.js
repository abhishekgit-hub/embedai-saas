const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String },
  updatedAt: { type: Date, default: Date.now },
});

settingsSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Settings", settingsSchema);
