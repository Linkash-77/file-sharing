// backend/server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const uploadRoute = require("./routes/upload");
const downloadRoute = require("./routes/download");

const app = express();

// ✅ Allow multiple origins (local + production frontend)
const allowedOrigins = [
  "http://localhost:5173",                  // Vite local dev
  "http://localhost:3000",                  // React default dev
  process.env.FRONTEND_URL,                 // Production frontend (Render/Netlify/Vercel)
].filter(Boolean); // removes undefined

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

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
