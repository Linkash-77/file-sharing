// backend/server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const uploadRoute = require("./routes/upload");
const downloadRoute = require("./routes/download");

const app = express();

// ✅ Allowed origins: local dev + deployed frontend
const allowedOrigins = [
  "http://localhost:5173",           // Vite dev server
  "https://file-sharing.onrender.com", // your backend domain (optional)
  process.env.FRONTEND_URL            // production frontend (if you set it)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  credentials: true
}));

app.use(express.json());

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Routes
app.use("/upload", uploadRoute);
app.use("/download", downloadRoute);

// Health check
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
