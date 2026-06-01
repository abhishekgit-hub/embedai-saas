const express = require("express");
const router = express.Router();
const Settings = require("../models/Settings");
const adminAuth = require("../middleware/adminAuth");
const { getApiKey } = require("../utils/geminiService");

// GET /api/settings  (admin only)
router.get("/", adminAuth, async (req, res) => {
  try {
    const apiKeySetting = await Settings.findOne({ key: "gemini_api_key" });
    const chatbotName = await Settings.findOne({ key: "chatbot_name" });
    const welcomeMsg = await Settings.findOne({ key: "welcome_message" });

    res.json({
      gemini_api_key: apiKeySetting?.value ? "***configured***" : null,
      chatbot_name: chatbotName?.value || "AI Assistant",
      welcome_message: welcomeMsg?.value || "Hello! How can I help you today?",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings  (admin only)
router.put("/", adminAuth, async (req, res) => {
  try {
    const { gemini_api_key, chatbot_name, welcome_message } = req.body;

    const upsert = async (key, value) => {
      if (value !== undefined) {
        await Settings.findOneAndUpdate(
          { key },
          { value, updatedAt: new Date() },
          { upsert: true, new: true }
        );
      }
    };

    await upsert("gemini_api_key", gemini_api_key);
    await upsert("chatbot_name", chatbot_name);
    await upsert("welcome_message", welcome_message);

    res.json({ message: "Settings saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/public  (no auth needed - for chat UI)
router.get("/public", async (req, res) => {
  try {
    const chatbotName = await Settings.findOne({ key: "chatbot_name" });
    const welcomeMsg = await Settings.findOne({ key: "welcome_message" });
    res.json({
      chatbot_name: chatbotName?.value || "AI Assistant",
      welcome_message: welcomeMsg?.value || "Hello! How can I help you today?",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
