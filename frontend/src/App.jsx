import { useState } from "react";
import "./index.css";

export default function App() {
  const [file, setFile] = useState(null);
  const [maxDownloads, setMaxDownloads] = useState(1);
  const [expiryHours, setExpiryHours] = useState(24);
  const [downloadLink, setDownloadLink] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Please select a file");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("maxDownloads", String(maxDownloads));
    formData.append("expiryHours", String(expiryHours));

    try {
      setLoading(true);
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const res = await fetch(`${backendUrl}/upload`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Upload failed");
      setDownloadLink(data.downloadLink);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>🔐 Secure File Share</h1>

        <label className="field">
          <span>Choose file</span>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        </label>

        <div className="row">
          <label className="field half">
            <span>Max downloads</span>
            <input
              type="number"
              min="1"
              value={maxDownloads}
              onChange={(e) => setMaxDownloads(Number(e.target.value))}
            />
          </label>
          <label className="field half">
            <span>Expiry (hours)</span>
            <input
              type="number"
              min="1"
              value={expiryHours}
              onChange={(e) => setExpiryHours(Number(e.target.value))}
            />
          </label>
        </div>

        <button onClick={handleUpload} disabled={loading}>
          {loading ? "Uploading..." : "Upload"}
        </button>

        {downloadLink && (
          <div className="download-link">
            <p>✅ Uploaded! Share this link:</p>
            <a href={downloadLink} target="_blank" rel="noreferrer">
              {downloadLink}
            </a>
            <button
              className="copy-btn"
              onClick={() => navigator.clipboard.writeText(downloadLink)}
            >
              Copy
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
