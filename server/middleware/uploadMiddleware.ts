import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { Request } from 'express';

const tempDir = 'temp_uploads';

// Ensure temporary directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Multer storage configuration for temporary local storage
const storage = multer.diskStorage({
  destination: function (req: Request, file: Express.Multer.File, cb: (error: null, destination: string) => void) {
    cb(null, tempDir);
  },
  filename: function (req: Request, file: Express.Multer.File, cb: (error: null, filename: string) => void) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: function (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    // Accept only PDF files for 'file' field
    if (file.fieldname === 'file' && file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed for the book file.'));
    }
    // Accept only image files for 'coverImage' field
    if (file.fieldname === 'coverImage' && !file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed for the cover image.'));
    }
    cb(null, true);
  }
});

export default upload;

