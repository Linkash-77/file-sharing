// backend/routes/download.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const store = require("../utils/filestore");
const { createDecryptionStream } = require("../utils/crypto");

const router = express.Router();

// GET /download/:id
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  const meta = store.get(id);

  if (!meta) return res.status(404).json({ error: "Link not found or expired" });

  // Validate expiry
  if (Date.now() > meta.expiresAt) {
    cleanup(meta);
    return res.status(410).json({ error: "Link expired" });
  }

  // Validate remaining downloads
  if (meta.downloadsRemaining <= 0) {
    cleanup(meta);
    return res.status(410).json({ error: "Max downloads reached" });
  }

  // Validate file existence
  if (!fs.existsSync(meta.encryptedPath)) {
    store.remove(id);
    return res.status(404).json({ error: "File missing" });
  }

  // Stream decryption → response
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${sanitizeFilename(meta.originalName)}"`
  );

  const key = Buffer.from(meta.key, "base64");
  const iv = Buffer.from(meta.iv, "hex");

  const readStream = createDecryptionStream(meta.encryptedPath, key, iv);

  // On successful send, decrement counter and optionally cleanup
  readStream.on("end", () => {
    meta.downloadsRemaining -= 1;
    if (meta.downloadsRemaining <= 0) cleanup(meta);
    else store.save(meta); // persist updated counter (in-memory)
  });

  readStream.on("error", (err) => {
    console.error("Decryption/stream error:", err);
    if (!res.headersSent) res.status(500).end("Decryption failed");
  });

  readStream.pipe(res);
});

function sanitizeFilename(name) {
  return name.replace(/[/\\?%*:|"<>]/g, "_");
}

function cleanup(meta) {
  try { fs.unlinkSync(meta.encryptedPath); } catch (_) {}
  store.remove(meta.id);
}

module.exports = router;
