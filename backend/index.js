const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// In-memory store for file codes (Code -> File Info)
const fileStore = new Map();

// Helper to generate a random 6-digit code
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const code = generateCode();
  const fileInfo = {
    originalName: req.file.originalname,
    path: req.file.path,
    expiry: Date.now() + 60 * 1000 // 1 minute
  };

  fileStore.set(code, fileInfo);

  // Set timeout to delete file and entry after 1 minute
  setTimeout(() => {
    if (fs.existsSync(fileInfo.path)) {
      fs.unlinkSync(fileInfo.path);
    }
    fileStore.delete(code);
    console.log(`File with code ${code} expired and deleted.`);
  }, 60 * 1000);

  res.json({ code, expiryIn: 60 });
});

// Download endpoint
app.get('/download/:code', (req, res) => {
  const code = req.params.code;
  const fileInfo = fileStore.get(code);

  if (!fileInfo) {
    return res.status(404).send('Invalid or expired code.');
  }

  if (Date.now() > fileInfo.expiry) {
    fileStore.delete(code);
    return res.status(410).send('File has expired.');
  }

  res.download(fileInfo.path, fileInfo.originalName);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
