const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

app.use(cors());
app.use(express.json());

// Use memory storage to avoid filesystem issues on Vercel serverless
const storage = multer.memoryStorage();
const upload = multer({ storage });

// In-memory store for file codes (Code -> File Info)
// NOTE: On Vercel this resets between cold starts, but works for quick transfers
const fileStore = new Map();

// Helper to generate a random 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Upload endpoint - multer v2 requires async/await
app.post('/api/upload', async (req, res) => {
  try {
    // multer v2: call as a promise
    await new Promise((resolve, reject) => {
      upload.single('file')(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const code = generateCode();
    const fileInfo = {
      originalName: req.file.originalname,
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      expiry: Date.now() + 60 * 1000, // 1 minute
    };

    fileStore.set(code, fileInfo);

    // Set timeout to delete entry after 1 minute
    setTimeout(() => {
      fileStore.delete(code);
      console.log(`File with code ${code} expired and deleted.`);
    }, 60 * 1000);

    res.json({ code, expiryIn: 60 });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// Download endpoint
app.get('/api/download/:code', (req, res) => {
  const code = req.params.code;
  const fileInfo = fileStore.get(code);

  if (!fileInfo) {
    return res.status(404).send('Invalid or expired code.');
  }

  if (Date.now() > fileInfo.expiry) {
    fileStore.delete(code);
    return res.status(410).send('File has expired.');
  }

  res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
  res.setHeader('Content-Type', fileInfo.mimetype || 'application/octet-stream');
  res.send(fileInfo.buffer);
});

// Export for Vercel
module.exports = app;
