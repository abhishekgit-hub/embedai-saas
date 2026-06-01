const express = require("express");
const router = express.Router();
const Document = require("../models/Document");
const ChatSession = require("../models/ChatSession");
const Client = require("../models/Client");
const adminAuth = require("../middleware/adminAuth");

const ADMIN_DOC_FILTER = {
  $or: [
    { clientId: "admin" },
    { clientId: null },
    { clientId: { $exists: false } },
  ],
};

// GET /api/admin/stats
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const docCount = await Document.countDocuments({
      ...ADMIN_DOC_FILTER,
      isActive: true,
    });
    const totalDocs = await Document.countDocuments(ADMIN_DOC_FILTER);
    const totalChats = await ChatSession.countDocuments({
      $or: [{ clientId: "admin" }, { clientId: null }, { clientId: { $exists: false } }],
    });
    const totalClients = await Client.countDocuments({});
    const pendingClients = await Client.countDocuments({ approvalStatus: "pending" });

    const docs = await Document.find({ ...ADMIN_DOC_FILTER, isActive: true }).select(
      "size content"
    );
    const totalKb = docs.reduce((sum, d) => sum + (d.size || 0), 0);
    const totalChars = docs.reduce((sum, d) => sum + (d.content?.length || 0), 0);

    const recentChats = await ChatSession.find({
      $or: [{ clientId: "admin" }, { clientId: null }, { clientId: { $exists: false } }],
    })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("title updatedAt");

    res.json({
      docCount,
      totalDocs,
      totalChats,
      totalClients,
      pendingClients,
      totalKb: Math.round(totalKb / 1024),
      totalChars,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      recentChats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/clients
router.get("/clients", adminAuth, async (req, res) => {
  try {
    const clients = await Client.find({})
      .select("-password")
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      clients.map(async (c) => {
        const docCount = await Document.countDocuments({ clientId: c.clientId });
        return {
          _id: c._id,
          clientId: c.clientId,
          businessName: c.businessName,
          email: c.email,
          domain: c.domain,
          plan: c.plan,
          isActive: c.isActive,
          approvalStatus: c.approvalStatus || (c.isActive ? "approved" : "pending"),
          docCount,
          totalChats: c.stats?.totalChats ?? 0,
          totalMessages: c.stats?.totalMessages ?? 0,
          createdAt: c.createdAt,
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/clients/pending
router.get("/clients/pending", adminAuth, async (req, res) => {
  try {
    const pending = await Client.find({ approvalStatus: "pending" })
      .select("-password")
      .sort({ createdAt: -1 });
    res.json(
      pending.map((c) => ({
        _id: c._id,
        clientId: c.clientId,
        businessName: c.businessName,
        email: c.email,
        domain: c.domain,
        plan: c.plan,
        createdAt: c.createdAt,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/clients/:id/approve
router.patch("/clients/:id/approve", adminAuth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: "Client not found" });
    client.approvalStatus = "approved";
    client.isActive = true;
    await client.save();
    res.json({
      message: "Client approved",
      approvalStatus: client.approvalStatus,
      isActive: client.isActive,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/clients/:id/reject
router.patch("/clients/:id/reject", adminAuth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: "Client not found" });
    client.approvalStatus = "rejected";
    client.isActive = false;
    await client.save();
    res.json({
      message: "Client rejected",
      approvalStatus: client.approvalStatus,
      isActive: client.isActive,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/clients/:id/toggle
router.patch("/clients/:id/toggle", adminAuth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: "Client not found" });
    if (client.approvalStatus !== "approved") {
      return res.status(400).json({
        error: "Approve the client first before enabling or disabling access.",
      });
    }
    client.isActive = !client.isActive;
    await client.save();
    res.json({ isActive: client.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/clients/:id
router.delete("/clients/:id", adminAuth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: "Client not found" });

    await Document.deleteMany({ clientId: client.clientId });
    await ChatSession.deleteMany({ clientId: client.clientId });
    await client.deleteOne();

    res.json({ message: "Client and all data deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/clients/:id/docs
router.get("/clients/:id/docs", adminAuth, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ error: "Client not found" });

    const docs = await Document.find({ clientId: client.clientId })
      .select("title fileType size uploadedAt isActive")
      .sort({ uploadedAt: -1 });

    res.json({ client: { businessName: client.businessName, clientId: client.clientId }, docs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
