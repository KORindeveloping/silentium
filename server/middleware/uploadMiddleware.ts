import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Set storage engine
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir); 
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Check file type
function checkFileType(file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const filetypes = /pdf|doc|docx|epub|jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Images and Documents Only!'));
  }
}

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
});

export default upload;
