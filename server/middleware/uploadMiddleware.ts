import multer from 'multer';
import path from 'path';

// Use memory storage for Cloudinary uploads
const storage = multer.memoryStorage();

// Check file type
function checkFileType(file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const filetypes = /pdf|doc|docx|epub|jpg|jpeg|png|webp/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDFs, Documents, and Images are allowed.'));
  }
}

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

export default upload;
