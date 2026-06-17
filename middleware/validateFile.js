const path = require('path');

const validateFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const file = req.file;
  
  // 1. Validate File Size (15MB max)
  const maxSize = 15 * 1024 * 1024;
  if (file.size > maxSize) {
    return res.status(400).json({ error: 'File size exceeds 15MB limit' });
  }

  // 2. Validate File Type
  // Reject videos
  const videoMimeTypes = ['video/mp4', 'video/x-m4v', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/webm', 'video/x-flv', 'video/x-matroska'];
  const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm'];

  const ext = path.extname(file.originalname).toLowerCase();
  
  if (videoMimeTypes.includes(file.mimetype) || videoExtensions.includes(ext)) {
    return res.status(400).json({ error: 'Video files are not allowed' });
  }

  // Allow Document and Image formats + ZIP
  const allowedMimeTypes = [
    // Documents
    'application/pdf', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
    'application/msword', // doc
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
    'application/vnd.ms-powerpoint', // ppt
    'text/plain',
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    // Archives
    'application/zip',
    'application/x-zip-compressed'
  ];

  const allowedExtensions = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.zip'];

  if (!allowedMimeTypes.includes(file.mimetype) && !allowedExtensions.includes(ext)) {
     return res.status(400).json({ error: 'Invalid file type. Only PDF, DOCX, PPTX, TXT, Images, and ZIP are allowed.' });
  }

  next();
};

module.exports = validateFile;
