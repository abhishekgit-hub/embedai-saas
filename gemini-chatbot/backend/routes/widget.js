const express = require("express");
const rateLimit = require("express-rate-limit");
const Client = require("../models/Client");
const ChatSession = require("../models/ChatSession");
const { generateResponse } = require("../utils/geminiService");
const { checkChatLimit } = require("../utils/planLimits");
const { genSessionId } = require("../utils/ids");
const { clientCanUsePlatform } = require("../utils/clientApproval");

const router = express.Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Please wait a moment." },
  standardHeaders: true,
  legacyHeaders: false,
});

async function getClientByApiKey(apiKey) {
  const client = await Client.findOne({ apiKey });
  if (!client || !clientCanUsePlatform(client)) return null;
  return client;
}

function publicConfig(client) {
  return {
    clientId: client.clientId,
    chatbotName: client.settings.chatbotName,
    welcomeMessage: client.settings.welcomeMessage,
    themeColor: client.settings.themeColor,
    widgetPosition: client.settings.widgetPosition,
    businessName: client.businessName,
  };
}

// GET /api/widget/:apiKey/config
router.get("/:apiKey/config", async (req, res) => {
  try {
    const client = await getClientByApiKey(req.params.apiKey);
    if (!client) return res.status(404).json({ error: "Widget not found" });
    res.json(publicConfig(client));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/widget/client/:clientId/config (for iframe without exposing apiKey in all paths)
router.get("/client/:clientId/config", async (req, res) => {
  try {
    const client = await Client.findOne({ clientId: req.params.clientId });
    if (!client || !clientCanUsePlatform(client)) {
      return res.status(404).json({ error: "Widget not found" });
    }
    res.json(publicConfig(client));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/widget/:apiKey/chat
router.post("/:apiKey/chat", chatLimiter, async (req, res) => {
  try {
    const client = await Client.findOne({ apiKey: req.params.apiKey });
    if (!client || !clientCanUsePlatform(client)) {
      return res.status(403).json({ error: "This chatbot is currently unavailable." });
    }

    const { sessionId, message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    let sid = sessionId;
    let session;
    let isNewSession = false;

    if (sid) {
      session = await ChatSession.findOne({
        sessionId: sid,
        clientId: client.clientId,
      });
    }

    if (!session) {
      const limitErr = await checkChatLimit(client);
      if (limitErr) return res.status(403).json({ error: limitErr });

      sid = genSessionId();
      isNewSession = true;
      session = new ChatSession({
        sessionId: sid,
        clientId: client.clientId,
        messages: [],
      });
    }

    const aiResponse = await generateResponse(
      session.messages,
      message.trim(),
      client.clientId
    );

    session.messages.push({ role: "user", content: message.trim() });
    session.messages.push({ role: "assistant", content: aiResponse });

    if (session.messages.length === 2) {
      session.title =
        message.trim().slice(0, 60) + (message.length > 60 ? "…" : "");
    }

    await session.save();

    await Client.findByIdAndUpdate(client._id, {
      $inc: {
        "stats.totalMessages": 2,
        ...(isNewSession ? { "stats.totalChats": 1 } : {}),
      },
    });

    res.json({ sessionId: sid, response: aiResponse });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/widget/:apiKey/session/:sessionId
router.get("/:apiKey/session/:sessionId", async (req, res) => {
  try {
    const client = await getClientByApiKey(req.params.apiKey);
    if (!client) return res.status(404).json({ error: "Widget not found" });

    const session = await ChatSession.findOne({
      sessionId: req.params.sessionId,
      clientId: client.clientId,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });

    res.json({ messages: session.messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
