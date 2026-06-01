const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Admin = require("../models/Admin");
const OTP = require("../models/OTP");
const adminAuth = require("../middleware/adminAuth");
const { sendOTPEmail, sendPasswordResetEmail } = require("../utils/emailService");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: admin._id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token, email: admin.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me  (verify token)
router.get("/me", adminAuth, (req, res) => {
  res.json({ email: req.admin.email });
});

// PUT /api/auth/change-password
router.put("/change-password", adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);
    if (!(await admin.comparePassword(currentPassword))) {
      return res.status(401).json({ error: "Current password incorrect" });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      // Don't reveal if email exists for security
      return res.json({ message: "If email exists, OTP sent" });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email: email.toLowerCase(),
      otp,
      type: "admin-reset",
      expiresAt,
    });

    // Send OTP email
    await sendOTPEmail({ to: email.toLowerCase(), otp, purpose: "password-reset" });

    res.json({ message: "If email exists, OTP sent" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
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
      email: email.toLowerCase(),
      otp,
      type: "admin-reset",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Find admin and update password
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin) {
      return res.status(404).json({ error: "Admin not found" });
    }

    admin.password = newPassword;
    await admin.save();

    // Mark token as used
    otpRecord.used = true;
    await otpRecord.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/change-email
router.put("/change-email", adminAuth, async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) {
      return res.status(400).json({ error: "New email and password required" });
    }

    const admin = await Admin.findById(req.admin.id);
    if (!(await admin.comparePassword(password))) {
      return res.status(401).json({ error: "Current password incorrect" });
    }

    // Check if new email already taken
    const existingAdmin = await Admin.findOne({
      email: newEmail.toLowerCase(),
      _id: { $ne: admin._id },
    });
    if (existingAdmin) {
      return res.status(400).json({ error: "Email already in use" });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await OTP.create({
      email: newEmail.toLowerCase(),
      otp,
      type: "change-email",
      expiresAt,
    });

    // Save new email to pendingEmail
    admin.pendingEmail = newEmail.toLowerCase();
    await admin.save();

    // Send OTP to new email
    await sendOTPEmail({ to: newEmail.toLowerCase(), otp, purpose: "change-email" });

    res.json({ message: "OTP sent to new email" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/verify-change-email
router.post("/verify-change-email", adminAuth, async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) {
      return res.status(400).json({ error: "OTP required" });
    }

    const admin = await Admin.findById(req.admin.id);
    if (!admin.pendingEmail) {
      return res.status(400).json({ error: "No pending email change" });
    }

    const otpRecord = await OTP.findOne({
      email: admin.pendingEmail,
      type: "change-email",
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord || otpRecord.otp !== otp) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Update admin email
    admin.email = admin.pendingEmail;
    admin.pendingEmail = undefined;
    await admin.save();

    // Mark OTP as used
    otpRecord.used = true;
    await otpRecord.save();

    res.json({ message: "Email updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
