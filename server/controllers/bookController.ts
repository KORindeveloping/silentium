import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Readable } from 'node:stream';
import Book from '../models/Book';
import User from '../models/User';
import { uploadToCloudinary } from '../utils/cloudinaryHelper';
import { isCloudinaryConfigured } from '../config/cloudinary';
import fetch from 'node-fetch';

const uploadsDirRoot = () => process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');

const setPdfProxyHeaders = (res: Response) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Security-Policy', 'frame-ancestors *');
  res.setHeader('Access-Control-Allow-Origin', '*');
};

/** PDF.js pulls PDFs cross-origin; some CDNs (e.g. Cloudinary) send frame-ancestors 'self' only. Proxied stream avoids iframe/CSP breakage. */
const extractUploadsRelative = (raw: string): string | null => {
  const normalized = raw.replace(/\\/g, '/').trim();
  const idx = normalized.toLowerCase().indexOf('/uploads/');
  if (idx >= 0) return normalized.slice(idx + '/uploads/'.length);
  if (/^uploads\//i.test(normalized)) return normalized.slice('uploads/'.length);
  if (/^\/uploads\//i.test(normalized)) return normalized.slice('/uploads/'.length);
  return null;
};

// @desc    Create a book
// @route   POST /api/books
// @access  Private/Author
export const createBook = async (req: Request, res: Response) => {
  try {
    const { title, description, category, tags, visibility, content, readingMinutes, pageCount } = req.body;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    if (!files?.['file'] && !content) {
      return res.status(400).json({ message: 'Please provide either a file or write content.' });
    }

    const needsCloudinaryUpload = !!(files?.['file']?.[0] || files?.['coverImage']?.[0]);
    if (needsCloudinaryUpload && !isCloudinaryConfigured()) {
      return res.status(503).json({
        message:
          'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the server environment (e.g. Render dashboard).',
        code: 'CLOUDINARY_NOT_CONFIGURED'
      });
    }

    let fileUrl: string | undefined;
    let fileKey: string | undefined;
    let storageType: 'cloudinary' | 'local' | undefined;
    let coverImageUrl: string | undefined;

    // Upload File (PDF/Doc) - Always use Cloudinary for permanent storage
    if (files?.['file']?.[0]) {
      const file = files['file'][0];
      const fileSizeMB = file.size / (1024 * 1024);

      try {
        const result = await uploadToCloudinary(file.path, 'books/files', 'raw');
        fileUrl = result.secure_url;
        fileKey = result.public_id;
        storageType = 'cloudinary';
        console.log(`File (${fileSizeMB.toFixed(1)}MB) uploaded to Cloudinary. Key: ${fileKey}`);

        // Clean up temporary file
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      } catch (error: any) {
        console.error('Cloudinary upload failed:', error);
        throw new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`);
      }
    }

    // Upload Cover Image
    if (files?.['coverImage']?.[0]) {
      try {
        const result = await uploadToCloudinary(files['coverImage'][0].path, 'books/covers');
        coverImageUrl = result.secure_url;

        // Clean up temp file
        if (fs.existsSync(files['coverImage'][0].path)) {
          fs.unlinkSync(files['coverImage'][0].path);
        }
      } catch (error: any) {
        console.error('Cloudinary cover image upload failed:', error);
        throw new Error(`Cloudinary cover image upload failed: ${error?.message || 'Unknown error'}`);
      }
    }

    const book = new Book({
      title,
      authorId: (req as any).user._id,
      description,
      category,
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : tags) : [],
      fileUrl,
      fileKey,
      storageType,
      coverImage: coverImageUrl,
      content,
      pageCount: pageCount || 0,
      visibility: visibility || 'public',
      status: 'published',
      readingMinutes: readingMinutes || 5,
    });

    const createdBook = await book.save();

    if (fileUrl || content) {
      await User.findByIdAndUpdate((req as any).user._id, {
        $inc: { credits: 3 }
      });
    }

    res.status(201).json(createdBook);
  } catch (error: any) {
    console.error('Upload error details:', {
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    const msg = typeof error?.message === 'string' ? error.message : 'Upload failed';

    // Handle file size limit errors (now 50MB)
    // Handle file size limit errors
    if (msg.includes('File size too large') || msg.includes('file size') || msg.includes('LIMIT_FILE_SIZE')) {
      return res.status(413).json({
        message: 'File size too large. Maximum file size is 50MB.',
        code: 'FILE_TOO_LARGE'
      });
    }

    if (/must supply api_key/i.test(msg)) {
      return res.status(503).json({
        message:
          'Cloudinary rejected the upload (missing credentials). Confirm CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set correctly on Render.',
        code: 'CLOUDINARY_MISSING_API_KEY'
      });
    }

    // Handle specific Cloudinary errors
    if (error?.name === 'Error' && error?.http_code) {
      return res.status(error.http_code).json({
        message: `Cloudinary error: ${msg}`,
        code: 'CLOUDINARY_ERROR',
        details: error
      });
    }

    res.status(400).json({
      message: msg,
      code: 'UPLOAD_ERROR',
      details: error
    });
  }
};

/** @route GET /api/books/:id/file */
export const streamBookFile = async (req: Request, res: Response) => {
  const bookId = req.params.id;
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(bookId)) {
      return res.status(400).json({ message: 'Invalid book id format' });
    }

    const book = await Book.findById(bookId).lean<any>();
    if (!book) return res.status(404).json({ message: 'Book not found' });

    let storageType = book.storageType;
    let fileKey = book.fileKey;
    let fileUrl = book.fileUrl;

    // Legacy Fallback
    if (!storageType && fileUrl) {
      storageType = fileUrl.includes('cloudinary') ? 'cloudinary' : 'local';
    }

    // Standard Streaming Headers
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    const fileName = (book.title || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();

    if (storageType === 'cloudinary') {
      try {
        let targetUrl = fileUrl;
        
        // If we have a fileKey, we can prefer generating a signed URL directly
        if (fileKey && isCloudinaryConfigured()) {
          const { v2: cloudinary } = await import('cloudinary');
          targetUrl = cloudinary.url(fileKey, {
            resource_type: 'raw', // Default for books/files
            secure: true,
            sign_url: true,
            expires_at: Math.floor(Date.now() / 1000) + 3600
          });
          
          // Double check: if the original URL had 'image/upload', we might need to adjust resource_type
          if (fileUrl && fileUrl.includes('/image/upload/')) {
            targetUrl = cloudinary.url(fileKey, {
              resource_type: 'image',
              secure: true,
              sign_url: true,
              expires_at: Math.floor(Date.now() / 1000) + 3600
            });
          }
        }

        if (!targetUrl) return res.status(404).json({ message: 'No file source found' });

        let response = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Silentium-PDF-Proxy', 'Accept': 'application/pdf' },
          redirect: 'follow'
        });

        if (!response.ok) {
           return res.status(response.status).json({ message: 'Cloud storage rejected the request' });
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}.pdf"`);
        
        if (response.body) {
          const readableStream = Readable.fromWeb(response.body as any);
          readableStream.pipe(res);
          res.on('close', () => readableStream.destroy());
        }
      } catch (error: any) {
        if (!res.headersSent) res.status(500).json({ message: 'Cloud stream error', error: error.message });
      }
    } else {
      // Local Storage Logic
      const relativePath = fileKey || extractUploadsRelative(fileUrl || '');
      if (!relativePath) return res.status(404).json({ message: 'File not found' });

      const localPath = path.join(uploadsDirRoot(), relativePath);
      if (fs.existsSync(localPath)) {
        const stat = fs.statSync(localPath);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = (end - start) + 1;
          const file = fs.createReadStream(localPath, { start, end });
          
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Content-Length': chunksize,
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${fileName}.pdf"`,
          });
          file.pipe(res);
        } else {
          res.writeHead(200, {
            'Content-Length': fileSize,
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${fileName}.pdf"`,
          });
          fs.createReadStream(localPath).pipe(res);
        }
      } else {
        res.status(404).json({ message: 'Local file not found' });
      }
    }
  } catch (globalError: any) {
    if (!res.headersSent) res.status(500).json({ message: 'Proxy fatal error', error: globalError.message });
  }
};

// @desc    Get all books
// @route   GET /api/books
// @access  Public
export const getBooks = async (req: Request, res: Response) => {
  const pageSize = Number(req.query.limit) || 12;
  const page = Number(req.query.page) || 1;
  const sortBy = req.query.sort || 'latest';

  const query: any = {};
  if (req.query.q) {
    query.$or = [
      { title: { $regex: req.query.q, $options: 'i' } },
      { description: { $regex: req.query.q, $options: 'i' } },
      { tags: { $regex: req.query.q, $options: 'i' } }
    ];
  }
  if (req.query.category && req.query.category !== 'All') {
    query.category = req.query.category;
  }
  if (req.query.authorId) {
    const authorId = req.query.authorId as string;
    if (/^[0-9a-fA-F]{24}$/.test(authorId)) {
      query.authorId = authorId;
    }
  }
  if (req.query.status) {
    query.status = req.query.status;
  } else if (!req.query.authorId) {
    query.status = 'published';
  }
  if (!req.query.authorId) {
    query.visibility = 'public';
  }

  let sortOptions: any = { createdAt: -1 };
  if (sortBy === 'popular') sortOptions = { views: -1 };
  else if (sortBy === 'trending') sortOptions = { views: -1, createdAt: -1 };

  const count = await Book.countDocuments(query);
  const books = await Book.find(query)
    .populate('authorId', 'name email avatar credits')
    .sort(sortOptions)
    .limit(pageSize)
    .skip(pageSize * (page - 1));

  const formattedBooks = books.map(book => {
    const b = book as any;
    return {
      _id: b._id,
      title: b.title,
      description: b.description,
      category: b.category,
      tags: b.tags,
      author: {
        _id: b.authorId?._id,
        name: b.authorId?.name || b.authorId?.email?.split('@')[0] || 'Unknown',
        avatar: b.authorId?.avatar, // Already full URL
        credits: b.authorId?.credits
      },
      coverImage: b.coverImage, // Already full URL
      fileUrl: b.fileUrl ? `${API_BASE_URL}/api/books/${b._id}/file` : null,
      content: b.content,
      pageCount: b.pageCount,
      views: b.views,
      likes: b.likes?.length || 0,
      readingMinutes: b.readingMinutes,
      status: b.status,
      visibility: b.visibility,
      createdAt: b.createdAt,
    };
  });

  res.json({ books: formattedBooks, page, pages: Math.ceil(count / pageSize), total: count });
};

// @desc    Get book by ID
// @route   GET /api/books/:id
// @access  Public
export const getBookById = async (req: Request, res: Response) => {
  const book = await Book.findById(req.params.id).populate('authorId', 'name email avatar credits');

  if (book) {
    book.views += 1;
    await book.save();

    const b = book as any;
    res.json({
      _id: b._id,
      title: b.title,
      description: b.description,
      category: b.category,
      tags: b.tags,
      author: {
        _id: b.authorId?._id,
        name: b.authorId?.name || b.authorId?.email?.split('@')[0] || 'Unknown',
        avatar: b.authorId?.avatar,
        credits: b.authorId?.credits
      },
      coverImage: b.coverImage,
      fileUrl: b.fileUrl ? `${API_BASE_URL}/api/books/${b._id}/file` : null,
      content: b.content,
      pageCount: b.pageCount,
      views: b.views,
      likes: b.likes?.length || 0,
      isLiked: (req as any).user ? b.likes.includes((req as any).user._id) : false,
      readingMinutes: b.readingMinutes,
      status: b.status,
      visibility: b.visibility,
      createdAt: b.createdAt,
    });
  } else {
    res.status(404).json({ message: 'Book not found' });
  }
};
export const updateBook = async (req: Request, res: Response) => {
  const { title, description, category, tags, visibility, status } = req.body;

  const book = await Book.findById(req.params.id);

  if (book) {
    if (book.authorId.toString() !== (req as any).user._id.toString() && (req as any).user.role !== 'admin') {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    book.title = title || book.title;
    book.description = description || book.description;
    book.category = category || book.category;
    book.tags = tags ? tags.split(',').map((t: string) => t.trim()) : book.tags;
    book.visibility = visibility || book.visibility;
    book.status = status || book.status;

    const updatedBook = await book.save();
    res.json(updatedBook);
  } else {
    res.status(404).json({ message: 'Book not found' });
  }
};

// @desc    Delete a book
// @route   DELETE /api/books/:id
// @access  Private/Author
export const deleteBook = async (req: Request, res: Response) => {
  const book = await Book.findById(req.params.id);

  if (book) {
    if (book.authorId.toString() !== (req as any).user._id.toString() && (req as any).user.role !== 'admin') {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    await book.deleteOne();
    res.json({ message: 'Book removed' });
  } else {
    res.status(404).json({ message: 'Book not found' });
  }
};

// @desc    Toggle Like
// @route   PUT /api/books/:id/like
// @access  Private
export const toggleLike = async (req: Request, res: Response) => {
  try {
    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const userId = (req as any).user._id;

    // Check if already liked
    if (book.likes.includes(userId)) {
      book.likes = book.likes.filter(id => id.toString() !== userId.toString());
    } else {
      book.likes.push(userId);
    }

    await book.save();
    res.json({ likes: book.likes.length, isLiked: book.likes.includes(userId) });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};
