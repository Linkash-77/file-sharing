// backend/server.js
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const app = express();
const PORT = process.env.PORT || 5000;

// ---------- In-memory metadata store ----------
const fileStore = new Map();

// ---------- Middleware ----------
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://your-frontend-domain.com",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);
app.use(express.json());

// ---------- Multer setup ----------
const upload = multer({ dest: "uploads/" });

// ---------- Utility functions ----------
function generateKey() {
  return crypto.randomBytes(32); // AES-256
}
function generateIV() {
  return crypto.randomBytes(16); // AES block size
}
function encryptFile(inputPath, outputPath, key, iv) {
  return new Promise((resolve, reject) => {
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);
    input.pipe(cipher).pipe(output);
    output.on("finish", resolve);
    output.on("error", reject);
  });
}
function createDecryptionStream(filePath, key, iv) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const readStream = fs.createReadStream(filePath);
  return readStream.pipe(decipher);
}
function cleanup(meta) {
  try { fs.unlinkSync(meta.encryptedPath); } catch (_) {}
  fileStore.delete(meta.id);
}
function sanitizeFilename(name) {
  return name.replace(/[/\\?%*:|"<>]/g, "_");
}

// ---------- Routes ----------

// Health check
app.get("/", (req, res) => res.json({ message: "Secure File Share API 🚀" }));

// Upload
app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const maxDownloads = Number(req.body.maxDownloads || 1);
  const expiryHours = Number(req.body.expiryHours || 24);

  const fileId = uuidv4();
  const key = generateKey();
  const iv = generateIV();
  const inputPath = req.file.path;
  const encryptedPath = path.join("uploads", `${fileId}.enc`);

  try {
    await encryptFile(inputPath, encryptedPath, key, iv);
    fs.unlinkSync(inputPath); // remove raw file

    const meta = {
      id: fileId,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      encryptedPath,
      key: key.toString("base64"),
      iv: iv.toString("hex"),
      downloadsRemaining: maxDownloads > 0 ? maxDownloads : 1,
      expiresAt: Date.now() + (expiryHours > 0 ? expiryHours : 24) * 3600 * 1000,
      createdAt: Date.now(),
    };

    fileStore.set(fileId, meta);

    const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
    const downloadLink = `${BASE_URL}/download/${fileId}`;

    res.json({
      success: true,
      fileId,
      downloadLink,
      expiresAt: meta.expiresAt,
      downloadsRemaining: meta.downloadsRemaining,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
});

// Download
app.get("/download/:id", (req, res) => {
  const id = req.params.id;
  const meta = fileStore.get(id);
  if (!meta) return res.status(404).json({ error: "Link not found or expired" });

  if (Date.now() > meta.expiresAt) {
    cleanup(meta);
    return res.status(410).json({ error: "Link expired" });
  }

  if (meta.downloadsRemaining <= 0) {
    cleanup(meta);
    return res.status(410).json({ error: "Max downloads reached" });
  }

  if (!fs.existsSync(meta.encryptedPath)) {
    cleanup(meta);
    return res.status(404).json({ error: "File missing" });
  }

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${sanitizeFilename(meta.originalName)}"`
  );

  const key = Buffer.from(meta.key, "base64");
  const iv = Buffer.from(meta.iv, "hex");

  const stream = createDecryptionStream(meta.encryptedPath, key, iv);

  stream.on("end", () => {
    meta.downloadsRemaining -= 1;
    if (meta.downloadsRemaining <= 0) cleanup(meta);
    else fileStore.set(meta.id, meta);
  });

  stream.on("error", (err) => {
    console.error("Decryption error:", err);
    if (!res.headersSent) res.status(500).end("Decryption failed");
  });

  stream.pipe(res);
});

// ---------- Start server ----------
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
