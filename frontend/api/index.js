const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();

app.use(cors());

// Use memory storage - works on Vercel serverless (no persistent filesystem)
const upload = multer({ storage: multer.memoryStorage() });

// In-memory file store: code -> { originalName, buffer, mimetype, expiry }
const fileStore = new Map();

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const code = generateCode();
  fileStore.set(code, {
    originalName: req.file.originalname,
    buffer: req.file.buffer,
    mimetype: req.file.mimetype,
    expiry: Date.now() + 60 * 1000,
  });

  setTimeout(() => fileStore.delete(code), 60 * 1000);

  res.json({ code, expiryIn: 60 });
});

// Download endpoint
app.get('/api/download/:code', (req, res) => {
  const fileInfo = fileStore.get(req.params.code);

  if (!fileInfo) return res.status(404).send('Invalid or expired code.');
  if (Date.now() > fileInfo.expiry) {
    fileStore.delete(req.params.code);
    return res.status(410).send('File has expired.');
  }

  res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
  res.setHeader('Content-Type', fileInfo.mimetype || 'application/octet-stream');
  res.send(fileInfo.buffer);
});

module.exports = app;
