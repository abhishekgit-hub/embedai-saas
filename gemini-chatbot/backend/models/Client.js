const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const clientSchema = new mongoose.Schema(
  {
    clientId: { type: String, unique: true, required: true, index: true },
    businessName: { type: String, required: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    password: { type: String, required: true },
    domain: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    pendingEmail: { type: String },
    plan: {
      type: String,
      enum: ["free", "starter", "pro"],
      default: "free",
    },
    isActive: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    apiKey: { type: String, unique: true, required: true, index: true },
    settings: {
      chatbotName: { type: String, default: "AI Assistant" },
      welcomeMessage: {
        type: String,
        default: "Hello! How can I help you today?",
      },
      themeColor: { type: String, default: "#6c63ff" },
      widgetPosition: {
        type: String,
        enum: ["bottom-right", "bottom-left"],
        default: "bottom-right",
      },
    },
    stats: {
      totalChats: { type: Number, default: 0 },
      totalMessages: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

clientSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

clientSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

clientSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("Client", clientSchema);
