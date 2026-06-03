const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Client = require("../models/Client");
const Document = require("../models/Document");
const OTP = require("../models/OTP");
const clientAuth = require("../middleware/clientAuth");
const { generateClientId, generateApiKey } = require("../utils/ids");
const { sanitizeText, sanitizeTitle, validateDomain } = require("../utils/sanitize");
const { checkDocLimit, DOC_LIMITS } = require("../utils/planLimits");
const { extractTextFromFile } = require("../utils/documentExtract");
const { clientCanUsePlatform, clientApprovalMessage } = require("../utils/clientApproval");
const { sendOTPEmail, sendPasswordResetEmail } = require("../utils/emailService");

const storage = multer.diskStorage({
  destination: (req, file, cb) =>
    cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".txt", ".md", ".csv"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only PDF, TXT, MD, CSV files allowed"));
  },
});

function signClientToken(client) {
  return jwt.sign(
    { id: client._id, clientId: client.clientId, email: client.email },
    process.env.CLIENT_JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function clientResponse(client) {
  return {
    token: signClientToken(client),
    client: client.toPublicJSON(),
  };
}

// POST /api/clients/signup
router.post("/signup", async (req, res) => {
  try {
    const { businessName, email, password, domain } = req.body;
    if (!businessName?.trim() || !email?.trim() || !password || !domain?.trim()) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const cleanDomain = validateDomain(domain);
    if (!cleanDomain) {
      return res.status(400).json({ error: "Invalid domain (e.g. example.com)" });
    }

    const exists = await Client.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      if (exists.approvalStatus === "pending") {
        return res.status(400).json({
          error: "A signup request with this email is already pending admin approval.",
        });
      }
      return res.status(400).json({ error: "Email already registered" });
    }

    const client = await Client.create({
      clientId: generateClientId(),
      businessName: sanitizeTitle(businessName, "Business"),
      email: email.toLowerCase().trim(),
      password,
      domain: cleanDomain,
      apiKey: generateApiKey(),
      approvalStatus: "pending",
      isActive: false,
      isEmailVerified: false,
    });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email: client.email,
      otp,
      type: "verify-email",
      expiresAt,
    });

    // Send OTP email
    console.log(`[Signup] Sending OTP email to: ${client.email}`);
    const emailResult = await sendOTPEmail({ to: client.email, otp, purpose: "verify-email" });
    console.log(`[Signup] Email send result:`, emailResult);
    
    if (!emailResult.success) {
      console.error(`[Signup] Failed to send OTP email to ${client.email}:`, emailResult.error);
      return res.status(500).json({ error: `Failed to send OTP email: ${emailResult.error}` });
    }

    res.status(201).json({
      message: "OTP sent to email",
      email: client.email,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const client = await Client.findOne({ email: email.toLowerCase().trim() });
    if (!client || !(await client.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    if (!clientCanUsePlatform(client)) {
      const msg = clientApprovalMessage(client);
      return res.status(403).json({ error: msg });
    }

    // Check if email is verified
    if (!client.isEmailVerified) {
      // Generate new OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await OTP.create({
        email: client.email,
        otp,
        type: "verify-email",
        expiresAt,
      });

      // Send OTP email
      await sendOTPEmail({ to: client.email, otp, purpose: "verify-email" });

      return res.json({
        requiresVerification: true,
        email: client.email,
      });
    }

    res.json(clientResponse(client));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/verify-email
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP required" });
    }

    const otpRecord = await OTP.findOne({
      email: email.toLowerCase().trim(),
      type: "verify-email",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Mark OTP as used
    otpRecord.used = true;
    await otpRecord.save();

    // Mark client email as verified
    const client = await Client.findOne({ email: email.toLowerCase().trim() });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    client.isEmailVerified = true;
    await client.save();

    // Only return token if client is approved, otherwise return success message
    if (client.approvalStatus === "approved") {
      res.json(clientResponse(client));
    } else {
      res.json({ 
        message: "Email verified successfully. Please wait for admin approval.",
        requiresApproval: true 
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/resend-otp
router.post("/resend-otp", async (req, res) => {
  try {
    const { email, type } = req.body;
    if (!email || !type) {
      return res.status(400).json({ error: "Email and type required" });
    }

    const client = await Client.findOne({ email: email.toLowerCase().trim() });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // Delete any existing unused OTPs of same type for this email
    await OTP.deleteMany({
      email: email.toLowerCase().trim(),
      type,
      used: false,
    });

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email: email.toLowerCase().trim(),
      otp,
      type,
      expiresAt,
    });

    // Send OTP email
    await sendOTPEmail({ to: email.toLowerCase().trim(), otp, purpose: type });

    res.json({ message: "New OTP sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const client = await Client.findOne({ email: email.toLowerCase().trim() });
    if (!client) {
      // Don't reveal if email exists for security
      return res.json({ message: "If email exists, OTP sent" });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email: email.toLowerCase().trim(),
      otp,
      type: "client-reset",
      expiresAt,
    });

    // Send OTP email
    await sendOTPEmail({ to: email.toLowerCase().trim(), otp, purpose: "password-reset" });

    res.json({ message: "If email exists, OTP sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP, and new password required" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const otpRecord = await OTP.findOne({
      email: email.toLowerCase().trim(),
      otp,
      type: "client-reset",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Find client and update password
    const client = await Client.findOne({ email: email.toLowerCase().trim() });
    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    client.password = newPassword;
    await client.save();

    // Mark OTP as used
    otpRecord.used = true;
    await otpRecord.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/change-email
router.put("/change-email", clientAuth, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) {
      return res.status(400).json({ error: "New email and password required" });
    }

    const client = await Client.findById(req.client._id);
    if (!(await client.comparePassword(password))) {
      return res.status(401).json({ error: "Current password incorrect" });
    }

    // Check if new email already taken
    const existingClient = await Client.findOne({
      email: newEmail.toLowerCase().trim(),
      _id: { $ne: client._id },
    });
    if (existingClient) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email: newEmail.toLowerCase().trim(),
      otp,
      type: "change-email",
      expiresAt,
    });

    // Save new email to pendingEmail
    client.pendingEmail = newEmail.toLowerCase().trim();
    await client.save();

    // Send OTP to new email
    await sendOTPEmail({ to: newEmail.toLowerCase().trim(), otp, purpose: "change-email" });

    res.json({ message: "OTP sent to new email" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/verify-change-email
router.post("/verify-change-email", clientAuth, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ error: "OTP required" });
    }

    const client = await Client.findById(req.client._id);
    if (!client.pendingEmail) {
      return res.status(400).json({ error: "No pending email change" });
    }

    const otpRecord = await OTP.findOne({
      email: client.pendingEmail,
      type: "change-email",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Update client email
    client.email = client.pendingEmail;
    client.pendingEmail = undefined;
    await client.save();

    // Mark OTP as used
    otpRecord.used = true;
    await otpRecord.save();

    res.json({ message: "Email updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/me
router.get("/me", clientAuth, (req, res) => {
  const obj = req.client.toObject();
  delete obj.password;
  res.json(obj);
});

// PUT /api/clients/profile
router.put("/profile", clientAuth, async (req, res) => {
  try {
    const client = await Client.findById(req.client._id);
    const { businessName, domain, settings } = req.body;

    if (businessName?.trim()) {
      client.businessName = sanitizeTitle(businessName);
    }
    if (domain?.trim()) {
      const cleanDomain = validateDomain(domain);
      if (!cleanDomain) {
        return res.status(400).json({ error: "Invalid domain format" });
      }
      client.domain = cleanDomain;
    }
    if (settings) {
      if (settings.chatbotName !== undefined) {
        client.settings.chatbotName = sanitizeTitle(settings.chatbotName, "AI Assistant");
      }
      if (settings.welcomeMessage !== undefined) {
        client.settings.welcomeMessage = sanitizeText(settings.welcomeMessage, 500);
      }
      if (settings.themeColor !== undefined) {
        const color = settings.themeColor.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) client.settings.themeColor = color;
      }
      if (settings.widgetPosition !== undefined) {
        if (["bottom-right", "bottom-left"].includes(settings.widgetPosition)) {
          client.settings.widgetPosition = settings.widgetPosition;
        }
      }
    }

    await client.save();
    res.json(client.toPublicJSON());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/change-password
router.put("/change-password", clientAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const client = await Client.findById(req.client._id);
    if (!(await client.comparePassword(currentPassword))) {
      return res.status(401).json({ error: "Current password incorrect" });
    }
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters" });
    }
    client.password = newPassword;
    await client.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/account
router.delete("/account", clientAuth, async (req, res) => {
  try {
    const clientId = req.client.clientId;
    await Document.deleteMany({ clientId });
    await require("../models/ChatSession").deleteMany({ clientId });
    await Client.findByIdAndDelete(req.client._id);
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/stats
router.get("/stats", clientAuth, async (req, res) => {
  try {
    const clientId = req.client.clientId;
    const docCount = await Document.countDocuments({ clientId });
    const activeDocs = await Document.countDocuments({ clientId, isActive: true });
    const client = await Client.findById(req.client._id);
    const docLimit = DOC_LIMITS[client.plan] ?? DOC_LIMITS.free;

    res.json({
      docCount,
      activeDocs,
      docLimit: Number.isFinite(docLimit) ? docLimit : null,
      totalChats: client.stats.totalChats,
      totalMessages: client.stats.totalMessages,
      plan: client.plan,
      businessName: client.businessName,
      apiKey: client.apiKey,
      clientId: client.clientId,
      settings: client.settings,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Client documents ─────────────────────────────────────────────────────────

router.post("/docs/upload", clientAuth, upload.single("file"), async (req, res) => {
  try {
    const limitErr = await checkDocLimit(req.client);
    if (limitErr) return res.status(403).json({ error: limitErr });
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
    const text = await extractTextFromFile(req.file.path);

    if (!text?.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Could not extract text from file" });
    }

    const doc = await Document.create({
      clientId: req.client.clientId,
      title: sanitizeTitle(req.body.title, req.file.originalname),
      fileName: req.file.filename,
      fileType: ext === "md" ? "md" : ext,
      content: sanitizeText(text),
      size: req.file.size,
    });

    fs.unlinkSync(req.file.path);

    res.status(201).json({
      _id: doc._id,
      title: doc.title,
      fileType: doc.fileType,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      isActive: doc.isActive,
      charCount: text.length,
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

router.post("/docs/text", clientAuth, async (req, res) => {
  try {
    const limitErr = await checkDocLimit(req.client);
    if (limitErr) return res.status(403).json({ error: limitErr });

    const title = sanitizeTitle(req.body.title);
    const content = sanitizeText(req.body.content);
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const doc = await Document.create({
      clientId: req.client.clientId,
      title,
      fileType: "text",
      content,
      size: Buffer.byteLength(content, "utf8"),
    });

    res.status(201).json({
      _id: doc._id,
      title: doc.title,
      fileType: doc.fileType,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      isActive: doc.isActive,
      charCount: content.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/docs", clientAuth, async (req, res) => {
  try {
    const docs = await Document.find({ clientId: req.client.clientId })
      .select("title fileName fileType size uploadedAt isActive")
      .sort({ uploadedAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/docs/:id", clientAuth, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      clientId: req.client.clientId,
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });
    await doc.deleteOne();
    res.json({ message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/docs/:id/toggle", clientAuth, async (req, res) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.id,
      clientId: req.client.clientId,
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });
    doc.isActive = !doc.isActive;
    await doc.save();
    res.json({ isActive: doc.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
