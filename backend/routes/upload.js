// backend/routes/upload.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { generateKey, encryptFile } = require("../utils/crypto");
const store = require("../utils/filestore");

const router = express.Router();

// Multer temp storage (we encrypt and then delete the temp file)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 100 } // 100 MB demo limit; change as needed
});

// POST /upload
// body: multipart/form-data (file, maxDownloads?, expiryHours?)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const maxDownloads = Number(req.body.maxDownloads || 1);
    const expiryHours = Number(req.body.expiryHours || 24);

    const fileId = uuidv4();
    const key = generateKey();               // 32 bytes Buffer
    const iv = cryptoRandomIV();             // 16 bytes Buffer
    const inputPath = req.file.path;         // temp raw file
    const encryptedPath = path.join(path.dirname(inputPath), `${fileId}.enc`);

    // Encrypt the uploaded file to encryptedPath
    await encryptFile(inputPath, encryptedPath, key, iv);

    // Delete the raw uploaded temp file
    safeUnlink(inputPath);

    // Save metadata in memory (no DB)
    const meta = {
      id: fileId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      encryptedPath,
      key: key.toString("base64"),
      iv: iv.toString("hex"),
      downloadsRemaining: Number.isFinite(maxDownloads) && maxDownloads > 0 ? maxDownloads : 1,
      expiresAt: Date.now() + (Number.isFinite(expiryHours) && expiryHours > 0 ? expiryHours : 24) * 60 * 60 * 1000,
      createdAt: Date.now()
    };
    store.save(meta);

    // Shareable link: server handles decryption (key stays server-side for this demo)
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const downloadLink = `${BASE_URL}/download/${fileId}`;

    res.json({
      success: true,
      fileId,
      downloadLink,
      expiresAt: meta.expiresAt,
      downloadsRemaining: meta.downloadsRemaining
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

function safeUnlink(p) {
  try { fs.unlinkSync(p); } catch (_) {}
}

function cryptoRandomIV() {
  const crypto = require("crypto");
  return crypto.randomBytes(16);
}

module.exports = router;
