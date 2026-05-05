import { Request, Response } from 'express';
import Book from '../models/Book';
import User from '../models/User';
import { uploadToCloudinary } from '../utils/cloudinaryHelper';

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

    let fileUrl: string | undefined;
    let coverImageUrl: string | undefined;

    // Upload File (PDF/Doc)
    if (files?.['file']?.[0]) {
      const result = await uploadToCloudinary(files['file'][0].buffer, 'books/files', 'raw');
      fileUrl = result.secure_url;
    }

    // Upload Cover Image
    if (files?.['coverImage']?.[0]) {
      const result = await uploadToCloudinary(files['coverImage'][0].buffer, 'books/covers', 'image');
      coverImageUrl = result.secure_url;
    }

    const book = new Book({
      title,
      authorId: (req as any).user._id,
      description,
      category,
      tags: tags ? (typeof tags === 'string' ? tags.split(',').map((t: string) => t.trim()) : tags) : [],
      fileUrl,
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
    res.status(400).json({ message: error.message });
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
      fileUrl: b.fileUrl,       // Already full URL
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
      fileUrl: b.fileUrl,
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
