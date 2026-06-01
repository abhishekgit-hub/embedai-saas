const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Document = require("../models/Document");
const adminAuth = require("../middleware/adminAuth");

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".txt", ".md", ".csv"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only PDF, TXT, MD, CSV files allowed"));
  },
});

// Extract text from uploaded file
async function extractText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    const pdfParse = require("pdf-parse");
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  // Plain text types
  return fs.readFileSync(filePath, "utf-8");
}

// POST /api/docs/upload  (admin only)
router.post("/upload", adminAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");
    const text = await extractText(req.file.path, req.file.mimetype);

    if (!text?.trim()) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Could not extract text from file" });
    }

    const doc = await Document.create({
      clientId: "admin",
      title: req.body.title || req.file.originalname,
      fileName: req.file.filename,
      fileType: ext === "md" ? "md" : ext,
      content: text,
      size: req.file.size,
    });

    // Clean up uploaded file after extraction (text is stored in DB)
    fs.unlinkSync(req.file.path);

    res.status(201).json({
      _id: doc._id,
      title: doc.title,
      fileType: doc.fileType,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      charCount: text.length,
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/docs/text  (paste text, admin only)
router.post("/text", adminAuth, async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const doc = await Document.create({
      clientId: "admin",
      title: title.trim(),
      fileType: "text",
      content: content.trim(),
      size: Buffer.byteLength(content, "utf8"),
    });

    res.status(201).json({
      _id: doc._id,
      title: doc.title,
      fileType: doc.fileType,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      charCount: content.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/docs  (admin only)
router.get("/", adminAuth, async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [
        { clientId: "admin" },
        { clientId: null },
        { clientId: { $exists: false } },
      ],
    })
      .select("title fileName fileType size uploadedAt isActive")
      .sort({ uploadedAt: -1 });
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/docs/:id  (admin only)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: "Document deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/docs/:id/toggle  (enable/disable)
router.patch("/:id/toggle", adminAuth, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: "Document not found" });
    doc.isActive = !doc.isActive;
    await doc.save();
    res.json({ isActive: doc.isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
