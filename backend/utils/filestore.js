// backend/utils/fileStore.js
// Simple in-memory store (reset on server restart).
// Each record: { id, originalName, mimeType, size, encryptedPath, key, iv, downloadsRemaining, expiresAt, createdAt }

const store = new Map();

function save(meta) {
  store.set(meta.id, meta);
}

function get(id) {
  return store.get(id);
}

function remove(id) {
  store.delete(id);
}

function cleanupExpired() {
  const now = Date.now();
  for (const [id, meta] of store.entries()) {
    if (now > meta.expiresAt || meta.downloadsRemaining <= 0) {
      try { require("fs").unlinkSync(meta.encryptedPath); } catch (_) {}
      store.delete(id);
    }
  }
}

// Periodic cleanup every 10 minutes
setInterval(cleanupExpired, 10 * 60 * 1000).unref();

module.exports = { save, get, remove };
