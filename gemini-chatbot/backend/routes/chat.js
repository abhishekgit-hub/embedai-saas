const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("crypto").randomUUID ? { v4: () => require("crypto").randomUUID() } : require("crypto");
const ChatSession = require("../models/ChatSession");
const { generateResponse } = require("../utils/geminiService");
const { genSessionId } = require("../utils/ids");
const adminAuth = require("../middleware/adminAuth");

const ADMIN_CLIENT_ID = "admin";

// POST /api/chat/message  — send a message
router.post("/message", async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    let sid = sessionId;
    let session;

    if (sid) {
      session = await ChatSession.findOne({
        sessionId: sid,
        clientId: ADMIN_CLIENT_ID,
      });
    }

    if (!session) {
      sid = genSessionId();
      session = new ChatSession({
        sessionId: sid,
        clientId: ADMIN_CLIENT_ID,
        messages: [],
      });
    }

    const aiResponse = await generateResponse(
      session.messages,
      message.trim(),
      ADMIN_CLIENT_ID
    );

    // Save both messages
    session.messages.push({ role: "user", content: message.trim() });
    session.messages.push({ role: "assistant", content: aiResponse });

    // Auto-title from first user message
    if (session.messages.length === 2) {
      session.title = message.trim().slice(0, 60) + (message.length > 60 ? "…" : "");
    }

    await session.save();

    res.json({
      sessionId: sid,
      response: aiResponse,
      title: session.title,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/sessions  — list all sessions
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await ChatSession.find({ clientId: ADMIN_CLIENT_ID })
      .select("sessionId title createdAt updatedAt")
      .sort({ updatedAt: -1 })
      .limit(50);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/sessions/:id  — get full session
router.get("/sessions/:id", async (req, res) => {
  try {
    const session = await ChatSession.findOne({
      sessionId: req.params.id,
      clientId: ADMIN_CLIENT_ID,
    });
    if (!session) return res.status(404).json({ error: "Session not found" });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/sessions/:id
router.delete("/sessions/:id", async (req, res) => {
  try {
    await ChatSession.deleteOne({
      sessionId: req.params.id,
      clientId: ADMIN_CLIENT_ID,
    });
    res.json({ message: "Session deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/widget-sessions  — get all widget chats (admin only)
router.get("/widget-sessions", adminAuth, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ clientId: { $ne: ADMIN_CLIENT_ID } })
      .select("sessionId clientId title createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/widget-sessions  — delete selected widget chats (admin only)
router.delete("/widget-sessions", adminAuth, async (req, res) => {
  try {
    const { sessionIds } = req.body;
    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ error: "sessionIds array is required" });
    }
    
    const result = await ChatSession.deleteMany({
      sessionId: { $in: sessionIds },
      clientId: { $ne: ADMIN_CLIENT_ID },
    });
    
    res.json({ message: `Deleted ${result.deletedCount} sessions` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/widget-sessions/all  — delete all widget chats (admin only)
router.delete("/widget-sessions/all", adminAuth, async (req, res) => {
  try {
    const result = await ChatSession.deleteMany({
      clientId: { $ne: ADMIN_CLIENT_ID },
    });
    
    res.json({ message: `Deleted ${result.deletedCount} sessions` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/admin-sessions  — get all admin/landing page chats (admin only)
router.get("/admin-sessions", adminAuth, async (req, res) => {
  try {
    const sessions = await ChatSession.find({ clientId: ADMIN_CLIENT_ID })
      .select("sessionId clientId title createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(100);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/admin-sessions  — delete selected admin chats (admin only)
router.delete("/admin-sessions", adminAuth, async (req, res) => {
  try {
    const { sessionIds } = req.body;
    if (!sessionIds || !Array.isArray(sessionIds) || sessionIds.length === 0) {
      return res.status(400).json({ error: "sessionIds array is required" });
    }
    
    const result = await ChatSession.deleteMany({
      sessionId: { $in: sessionIds },
      clientId: ADMIN_CLIENT_ID,
    });
    
    res.json({ message: `Deleted ${result.deletedCount} sessions` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/admin-sessions/all  — delete all admin chats (admin only)
router.delete("/admin-sessions/all", adminAuth, async (req, res) => {
  try {
    const result = await ChatSession.deleteMany({
      clientId: ADMIN_CLIENT_ID,
    });
    
    res.json({ message: `Deleted ${result.deletedCount} sessions` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
