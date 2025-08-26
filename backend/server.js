import express from "express";
import cors from "cors";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Allow frontend (local + future deployed frontend)
app.use(
  cors({
    origin: [
      "http://localhost:5173", // for local dev
      "https://your-frontend-domain.com", // later when deployed
    ],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());

// ✅ Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({
    message: "File uploaded successfully",
    filename: req.file.filename,
  });
});

// ✅ Simple health check route
app.get("/", (req, res) => {
  res.json({ message: "Backend is running fine 🚀" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
