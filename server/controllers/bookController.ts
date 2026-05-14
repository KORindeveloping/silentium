import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Readable } from 'node:stream';
import Book from '../models/Book';
import User from '../models/User';
import { formatBookResponse } from '../utils/bookFormatter.js';
import { uploadToCloudinary, getCloudinaryUrl, getSignedCloudinaryUrl } from '../utils/cloudinaryHelper';
import { isCloudinaryConfigured } from '../config/cloudinary';

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
  const { title, description, category, tags, visibility, content, readingMinutes, pageCount } = req.body;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  let fileKey: string | undefined;
  let coverImageUrl: string | undefined;
  const storageType = 'cloudinary';

  // Check if Cloudinary is configured if files are provided
  if (files?.['file']?.[0] || files?.['coverImage']?.[0]) {
    if (!isCloudinaryConfigured()) {
      throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
    }
  }

  // Upload files to Cloudinary
  if (files?.['file']?.[0]) {
    const file = files['file'][0];
    const result = await uploadToCloudinary(file.path, 'books/files', 'raw');
    fileKey = result.public_id;
  }

  if (files?.['coverImage']?.[0]) {
    const file = files['coverImage'][0];
    const result = await uploadToCloudinary(file.path, 'books/covers', 'image');
    coverImageUrl = result.secure_url;
  }


  if (!fileKey && !content) {
    return res.status(400).json({ message: 'Please provide either a file or write content.' });
  }

  const book = new Book({
    title,
    authorId: (req as any).user._id,
    description,
    category,
    tags: tags ? (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : tags) : [],
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

  if (fileKey || content) {
    await User.findByIdAndUpdate((req as any).user._id, {
      $inc: { credits: 3 }
    });
  }

  res.status(201).json(formatBookResponse(req, createdBook));
};

/** @route GET /api/books/:id/file */
export const streamBookFile = async (req: Request, res: Response) => {
  const bookId = req.params.id;
  console.log(`[DEBUG] >>> streamBookFile HEARTBEAT: Entering for ID: ${bookId}`);
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(bookId)) {
      return res.status(400).json({ message: 'Invalid book id format' });
    }

    console.log(`[DEBUG] Looking for book with ID: ${bookId}`);
    
    // Simplified query - avoid '+' prefix if fields are not select:false, and ensure we get what we need
    const book = await Book.findById(bookId)
      .select('fileUrl fileKey title visibility storageType')
      .lean<{ fileUrl?: string, title?: string, visibility?: string, fileKey?: string, storageType?: string }>();

    if (book) {
      console.log(`[DEBUG] Book found: ${book.title}`);
      console.log(`[DEBUG] Book metadata - fileUrl: "${book.fileUrl || ''}", fileKey: "${book.fileKey || ''}", storageType: "${book.storageType || ''}"`);
    } else {
      console.log(`[DEBUG] Book NOT found in database: ${bookId}`);
      return res.status(404).json({ message: 'Book not found' });
    }
    
    // Check if book has any file information
    if (!book.fileUrl && !book.fileKey) {
      console.log(`[DEBUG] Book has no file metadata for ID: ${bookId}`);
      return res.status(404).json({ message: 'Book has no file' });
    }

    // PDF files should be publicly accessible - no auth check needed
    let fileUrl = book.fileUrl;
    const isCloudinary = book.storageType === 'cloudinary' || (fileUrl && fileUrl.includes('res.cloudinary.com'));
    
    // If no fileUrl but we have fileKey and storageType, construct URL
    if (!fileUrl && book.fileKey && book.storageType) {
      if (book.storageType === 'cloudinary') {
        fileUrl = getCloudinaryUrl(book.fileKey, 'raw');
      }
    }

    // Set comprehensive CORS headers for PDF.js compatibility
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    
    // Optional: Set filename for downloads
    const fileName = (book.title || 'document').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    res.setHeader('Content-Disposition', `inline; filename="${fileName}.pdf"`);

    if (isCloudinary) {
      try {
        const publicId = book.fileKey || '';
        if (!publicId) {
          console.error(`[DEBUG] Missing fileKey for Cloudinary book: ${bookId}`);
          return res.status(404).json({ message: 'Cloudinary resource ID missing' });
        }

        console.log(`[DEBUG] Generating signed URL for: ${publicId}`);
        const signedUrl = getSignedCloudinaryUrl(publicId, 'raw');
        
        console.log(`[DEBUG] Proxying signed URL: ${signedUrl}`);

        const response = await fetch(signedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Silentium-PDF-Viewer)',
            'Accept': 'application/pdf,*/*'
          }
        });
        
        if (!response.ok) {
          console.error(`[DEBUG] Cloudinary signed fetch failed: ${response.status} ${response.statusText}`);
          return res.status(response.status).json({ 
            message: `Failed to fetch secure file (${response.status})`,
            error: response.statusText
          });
        }
        
        if (response.body) {
          console.log(`[DEBUG] Successfully streaming signed file for book ${bookId}`);
          res.status(response.status);
          response.body.pipe(res);
        } else {
          console.error(`[DEBUG] Cloud storage response has no body for book ${bookId}`);
          res.status(500).json({ message: 'Cloud storage response has no body' });
        }
      } catch (error: any) {
        console.error('[DEBUG] Cloudinary Signed Proxy Error:', error);
        if (!res.headersSent) {
          res.status(500).json({ 
            message: 'Error streaming from cloud storage',
            error: error.message 
          });
        }
      }
    } else {
      // Local Storage Fallback
      const relativePath = extractUploadsRelative(fileUrl || '');
      if (relativePath) {
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
          console.log(`Fallback redirect to: ${fileUrl}`);
          res.redirect(302, fileUrl);
        }
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

  const formattedBooks = books.map(book => formatBookResponse(req, book));

  res.json({ books: formattedBooks, page, pages: Math.ceil(count / pageSize), total: count });
};

// @desc    Get book by ID
// @route   GET /api/books/:id
// @access  Public
export const getBookById = async (req: Request, res: Response) => {
  const bookId = req.params.id;
  const book = await Book.findById(bookId).populate('authorId', 'name email avatar credits');

  if (book) {
    console.log(`[DEBUG] getBookById - Book: ${bookId}, title: ${book.title}, fileUrl: ${!!book.fileUrl}, fileKey: ${!!book.fileKey}`);
    book.views += 1;
    await book.save();

    res.json(formatBookResponse(req, book));
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
    res.json(formatBookResponse(req, updatedBook));
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
