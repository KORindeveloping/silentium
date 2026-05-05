// server.ts
import dotenv from "dotenv";
import express9 from "express";
import { createServer as createViteServer } from "vite";
import path2 from "path";
import cors from "cors";
import helmet from "helmet";
import fs2 from "fs";
import { fileURLToPath } from "url";

// server/config/db.ts
import mongoose from "mongoose";
var connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;
    if (!mongoUri || mongoUri === "mongodb://localhost:27017/silentium") {
      if (process.env.VERCEL) {
        throw new Error("CONFIGURATION_ERROR: The MONGO_URI environment variable is not defined in Vercel. Please add it to your Project Settings > Environment Variables.");
      }
      try {
        await mongoose.connect(mongoUri || "mongodb://localhost:27017/silentium", { serverSelectionTimeoutMS: 2e3 });
        console.log(`MongoDB Connected (Local)`);
      } catch (err) {
        console.log("Local MongoDB not found. Starting In-Memory MongoDB...");
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        const mongoServer = await MongoMemoryServer.create();
        mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        console.log(`Virtual MongoDB Connected (In-Memory)`);
      }
    } else {
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8e3 });
        console.log(`MongoDB Connected (Cloud)`);
      } catch (err) {
        if (process.env.VERCEL || process.env.NODE_ENV === "production") {
          throw new Error(`DATABASE_CONNECTION_FAILED: Could not connect to your cloud MongoDB Atlas. Please check your MONGO_URI and Network Access (whitelist 0.0.0.0/0) in Atlas. Details: ${err.message}`);
        }
        console.error("Cloud MongoDB connection failed. Falling back to In-Memory MongoDB...", err.message);
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        const mongoServer = await MongoMemoryServer.create();
        mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
        console.log(`Virtual MongoDB Connected (In-Memory)`);
      }
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error;
  }
};
var db_default = connectDB;

// server/routes/authRoutes.ts
import express from "express";
import rateLimit from "express-rate-limit";

// server/controllers/authController.ts
import jwt from "jsonwebtoken";
import crypto from "crypto";

// server/models/User.ts
import mongoose2, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
var UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["reader", "author", "admin"],
    default: "reader"
  },
  credits: {
    type: Number,
    default: 0
  },
  name: String,
  username: {
    type: String,
    unique: true,
    sparse: true
  },
  phone: String,
  bio: String,
  location: String,
  avatar: String,
  notificationPreferences: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    activity: { type: Boolean, default: true }
  },
  savedBooks: [{
    type: mongoose2.Schema.Types.ObjectId,
    ref: "Book"
  }],
  history: [{
    bookId: { type: mongoose2.Schema.Types.ObjectId, ref: "Book" },
    progress: { type: Number, default: 0 },
    // Percentage or page number
    lastRead: { type: Date, default: Date.now }
  }],
  following: [{
    type: mongoose2.Schema.Types.ObjectId,
    ref: "User"
  }],
  followers: [{
    type: mongoose2.Schema.Types.ObjectId,
    ref: "User"
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    required: true,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true
});
UserSchema.pre("save", async function() {
  if (!this.isModified("passwordHash")) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};
var User = mongoose2.models.User || mongoose2.model("User", UserSchema);
var User_default = User;

// server/models/Author.ts
import mongoose3, { Schema as Schema2 } from "mongoose";
var AuthorSchema = new Schema2({
  userId: {
    type: mongoose3.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  bio: {
    type: String,
    default: ""
  },
  profilePic: {
    type: String,
    default: ""
  },
  earnings: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});
var Author = mongoose3.models.Author || mongoose3.model("Author", AuthorSchema);
var Author_default = Author;

// server/models/LoginLog.ts
import mongoose4, { Schema as Schema3 } from "mongoose";
var LoginLogSchema = new Schema3({
  userId: { type: mongoose4.Schema.Types.ObjectId, ref: "User" },
  email: { type: String, required: true },
  status: { type: String, enum: ["success", "failed"], required: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  reason: { type: String },
  timestamp: { type: Date, default: Date.now }
});
var LoginLog = mongoose4.models.LoginLog || mongoose4.model("LoginLog", LoginLogSchema);
var LoginLog_default = LoginLog;

// server/controllers/authController.ts
var generateToken = (id, rememberMe = false) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret", {
    expiresIn: rememberMe ? "30d" : "24h"
  });
};
var validatePassword = (password) => {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
};
var registerUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }
    if (!validatePassword(password)) {
      return res.status(400).json({ message: "Password must be at least 8 characters, include an uppercase letter, a number, and a special character." });
    }
    const userExists = await User_default.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const user = await User_default.create({
      email,
      passwordHash: password,
      role: role || "reader",
      verificationToken
    });
    if (user) {
      if (user.role === "author") {
        await Author_default.create({ userId: user._id });
      }
      res.status(201).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id.toString()),
        message: "Registration successful."
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    if (error.code === 11e3) {
      return res.status(400).json({ message: "User already exists" });
    }
    next(error);
  }
};
var loginUser = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    const ipAddress = req.ip || req.headers["x-forwarded-for"];
    const userAgent = req.headers["user-agent"];
    const user = await User_default.findOne({ email });
    if (!user) {
      await LoginLog_default.create({ email, status: "failed", reason: "User not found", ipAddress, userAgent });
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.lockUntil && user.lockUntil > /* @__PURE__ */ new Date()) {
      return res.status(403).json({ message: "Account is temporarily locked. Try again later." });
    }
    if (await user.matchPassword(password)) {
      user.loginAttempts = 0;
      user.lockUntil = void 0;
      user.lastLogin = /* @__PURE__ */ new Date();
      await user.save();
      await LoginLog_default.create({ userId: user._id, email, status: "success", ipAddress, userAgent });
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id.toString(), rememberMe)
      });
    } else {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1e3);
      }
      await user.save();
      await LoginLog_default.create({ userId: user._id, email, status: "failed", reason: "Invalid password", ipAddress, userAgent });
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    next(error);
  }
};
var forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User_default.findOne({ email });
    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 1 * 60 * 60 * 1e3);
      await user.save();
    }
    res.json({ message: "If a user with that email exists, a reset link has been sent." });
  } catch (error) {
    next(error);
  }
};
var getUserProfile = async (req, res, next) => {
  try {
    const user = await User_default.findById(req.user._id);
    if (user) {
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        username: user.username,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
        avatar: user.avatar,
        notificationPreferences: user.notificationPreferences,
        createdAt: user.createdAt
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    next(error);
  }
};
var updateUserProfile = async (req, res, next) => {
  try {
    const user = await User_default.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const allowedFields = ["name", "username", "phone", "bio", "location"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== void 0) {
        user[field] = req.body[field];
      }
    });
    if (req.file) {
      user.avatar = req.file.path.replace(/\\/g, "/");
    }
    if (req.body.notificationPreferences) {
      try {
        const prefs = typeof req.body.notificationPreferences === "string" ? JSON.parse(req.body.notificationPreferences) : req.body.notificationPreferences;
        user.notificationPreferences = {
          ...user.notificationPreferences,
          ...prefs
        };
      } catch (e) {
        console.error("Failed to parse notificationPreferences", e);
      }
    }
    if (req.body.password) {
      if (!validatePassword(req.body.password)) {
        return res.status(400).json({ message: "New password must meet complexity requirements." });
      }
      user.passwordHash = req.body.password;
    }
    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name,
      username: updatedUser.username,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      location: updatedUser.location,
      avatar: updatedUser.avatar,
      notificationPreferences: updatedUser.notificationPreferences,
      token: generateToken(updatedUser._id.toString())
    });
  } catch (error) {
    if (error.code === 11e3) {
      return res.status(400).json({ message: "Username already taken" });
    }
    next(error);
  }
};
var deleteUserProfile = async (req, res, next) => {
  try {
    const user = await User_default.findById(req.user._id);
    if (user) {
      if (user.role === "author") {
        await Author_default.findOneAndDelete({ userId: user._id });
      }
      await User_default.findByIdAndDelete(user._id);
      res.json({ message: "User removed successfully" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    next(error);
  }
};

// server/middleware/authMiddleware.ts
import jwt2 from "jsonwebtoken";
var protect = async (req, res, next) => {
  if (typeof next !== "function") {
    console.error("Fatal: next is not a function in protect middleware");
    return res.status(500).json({ message: "Internal Server Error (next is not a function)" });
  }
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt2.verify(token, process.env.JWT_SECRET || "secret");
      req.user = await User_default.findById(decoded.id).select("-passwordHash");
      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};
var admin = (req, res, next) => {
  if (typeof next !== "function") return res.status(500).json({ message: "next is not a function" });
  if (req.user && req.user.role === "admin") {
    return next();
  } else {
    return res.status(401).json({ message: "Not authorized as an admin" });
  }
};
var author = (req, res, next) => {
  if (typeof next !== "function") return res.status(500).json({ message: "next is not a function" });
  if (req.user && (req.user.role === "author" || req.user.role === "admin")) {
    return next();
  } else {
    return res.status(401).json({ message: "Not authorized as an author" });
  }
};

// server/middleware/uploadMiddleware.ts
import multer from "multer";
import path from "path";
import fs from "fs";
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOADS_PATH || path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});
function checkFileType(file, cb) {
  const filetypes = /pdf|doc|docx|epub|jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Images and Documents Only!"));
  }
}
var upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  }
});
var uploadMiddleware_default = upload;

// server/routes/authRoutes.ts
var router = express.Router();
var authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: 10,
  // Limit each IP to 10 requests per windowMs
  message: { message: "Too many requests from this IP, please try again after 15 minutes" }
});
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.get("/me", protect, getUserProfile);
router.put("/profile", protect, uploadMiddleware_default.single("avatar"), updateUserProfile);
router.delete("/profile", protect, deleteUserProfile);
var authRoutes_default = router;

// server/routes/bookRoutes.ts
import express2 from "express";

// server/models/Book.ts
import mongoose5, { Schema as Schema4 } from "mongoose";
var BookSchema = new Schema4({
  title: {
    type: String,
    required: true,
    trim: true
  },
  authorId: {
    type: mongoose5.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  textSnippet: {
    type: String,
    default: ""
  },
  pageCount: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  fileUrl: {
    type: String
    // Can be optional now
  },
  coverImage: {
    type: String,
    default: ""
  },
  content: {
    type: String
    // For stories written directly in the editor
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "draft", "archived", "published"],
    default: "published"
    // Changed default to published for smoother MVP flow
  },
  visibility: {
    type: String,
    enum: ["public", "private"],
    default: "public"
  },
  views: {
    type: Number,
    default: 0
  },
  readingMinutes: {
    type: Number,
    default: 0
  },
  likes: [{
    type: mongoose5.Schema.Types.ObjectId,
    ref: "User"
  }]
}, {
  timestamps: true
});
BookSchema.index({ title: "text", description: "text", tags: "text" });
var Book = mongoose5.models.Book || mongoose5.model("Book", BookSchema);
var Book_default = Book;

// server/controllers/bookController.ts
var getBooks = async (req, res) => {
  const pageSize = Number(req.query.limit) || 12;
  const page = Number(req.query.page) || 1;
  const sortBy = req.query.sort || "latest";
  const query = {};
  if (req.query.q) {
    query.$or = [
      { title: { $regex: req.query.q, $options: "i" } },
      { description: { $regex: req.query.q, $options: "i" } },
      { tags: { $regex: req.query.q, $options: "i" } }
    ];
  }
  if (req.query.category && req.query.category !== "All") {
    query.category = req.query.category;
  }
  if (req.query.authorId) {
    const authorId = req.query.authorId;
    if (/^[0-9a-fA-F]{24}$/.test(authorId)) {
      query.authorId = authorId;
    }
  }
  if (req.query.status) {
    query.status = req.query.status;
  } else if (!req.query.authorId) {
    query.status = "published";
  }
  if (!req.query.authorId) {
    query.visibility = "public";
  }
  let sortOptions = { createdAt: -1 };
  if (sortBy === "popular") {
    sortOptions = { views: -1 };
  } else if (sortBy === "trending") {
    sortOptions = { views: -1, createdAt: -1 };
  }
  const count = await Book_default.countDocuments(query);
  const books = await Book_default.find(query).populate("authorId", "name email avatar credits").sort(sortOptions).limit(pageSize).skip(pageSize * (page - 1));
  const getFullUrl = (req2, relativePath) => {
    if (!relativePath) return void 0;
    if (relativePath.startsWith("http")) return relativePath;
    const baseUrl = `${req2.protocol}://${req2.get("host")}`;
    return `${baseUrl}/${relativePath.replace(/\\/g, "/").replace(/^\//, "")}`;
  };
  const formattedBooks = books.map((book) => {
    const b = book;
    return {
      _id: b._id,
      title: b.title,
      description: b.description,
      category: b.category,
      tags: b.tags,
      author: {
        _id: b.authorId?._id,
        name: b.authorId?.name || b.authorId?.email?.split("@")[0] || "Unknown",
        avatar: getFullUrl(req, b.authorId?.avatar),
        credits: b.authorId?.credits
      },
      coverImage: getFullUrl(req, b.coverImage),
      fileUrl: getFullUrl(req, b.fileUrl),
      content: b.content,
      pageCount: b.pageCount,
      views: b.views,
      likes: b.likes?.length || 0,
      readingMinutes: b.readingMinutes,
      status: b.status,
      visibility: b.visibility,
      createdAt: b.createdAt
    };
  });
  res.json({ books: formattedBooks, page, pages: Math.ceil(count / pageSize), total: count });
};
var getBookById = async (req, res) => {
  const book = await Book_default.findById(req.params.id).populate("authorId", "name email avatar credits");
  if (book) {
    book.views += 1;
    await book.save();
    const getFullUrl = (req2, relativePath) => {
      if (!relativePath) return void 0;
      if (relativePath.startsWith("http")) return relativePath;
      const baseUrl = `${req2.protocol}://${req2.get("host")}`;
      return `${baseUrl}/${relativePath.replace(/\\/g, "/").replace(/^\//, "")}`;
    };
    const b = book;
    res.json({
      _id: b._id,
      title: b.title,
      description: b.description,
      category: b.category,
      tags: b.tags,
      author: {
        _id: b.authorId?._id,
        name: b.authorId?.name || b.authorId?.email?.split("@")[0] || "Unknown",
        avatar: getFullUrl(req, b.authorId?.avatar),
        credits: b.authorId?.credits
      },
      coverImage: getFullUrl(req, b.coverImage),
      fileUrl: getFullUrl(req, b.fileUrl),
      content: b.content,
      pageCount: b.pageCount,
      views: b.views,
      likes: b.likes?.length || 0,
      isLiked: req.user ? b.likes.includes(req.user._id) : false,
      readingMinutes: b.readingMinutes,
      status: b.status,
      visibility: b.visibility,
      createdAt: b.createdAt
    });
  } else {
    res.status(404).json({ message: "Book not found" });
  }
};
var createBook = async (req, res) => {
  try {
    const { title, description, category, tags, visibility, content, readingMinutes, pageCount } = req.body;
    const files = req.files;
    if (!files?.["file"] && !content) {
      return res.status(400).json({ message: "Please provide either a file or write content." });
    }
    const coverImage = files?.["coverImage"]?.[0]?.path?.replace(/\\/g, "/");
    const fileUrl = files?.["file"]?.[0]?.path?.replace(/\\/g, "/");
    const book = new Book_default({
      title,
      authorId: req.user._id,
      description,
      category,
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      fileUrl,
      coverImage,
      content,
      pageCount: pageCount || 0,
      visibility: visibility || "public",
      status: "published",
      // Auto-publish for MVP
      readingMinutes: readingMinutes || 5
      // Default or calculated on frontend
    });
    const createdBook = await book.save();
    if (fileUrl || content) {
      await User_default.findByIdAndUpdate(req.user._id, {
        $inc: { credits: 3 }
      });
    }
    res.status(201).json(createdBook);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var updateBook = async (req, res) => {
  const { title, description, category, tags, visibility, status } = req.body;
  const book = await Book_default.findById(req.params.id);
  if (book) {
    if (book.authorId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    book.title = title || book.title;
    book.description = description || book.description;
    book.category = category || book.category;
    book.tags = tags ? tags.split(",").map((t) => t.trim()) : book.tags;
    book.visibility = visibility || book.visibility;
    book.status = status || book.status;
    const updatedBook = await book.save();
    res.json(updatedBook);
  } else {
    res.status(404).json({ message: "Book not found" });
  }
};
var deleteBook = async (req, res) => {
  const book = await Book_default.findById(req.params.id);
  if (book) {
    if (book.authorId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      res.status(401).json({ message: "Not authorized" });
      return;
    }
    await book.deleteOne();
    res.json({ message: "Book removed" });
  } else {
    res.status(404).json({ message: "Book not found" });
  }
};
var toggleLike = async (req, res) => {
  try {
    const book = await Book_default.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ message: "Book not found" });
    }
    const userId = req.user._id;
    if (book.likes.includes(userId)) {
      book.likes = book.likes.filter((id) => id.toString() !== userId.toString());
    } else {
      book.likes.push(userId);
    }
    await book.save();
    res.json({ likes: book.likes.length, isLiked: book.likes.includes(userId) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// server/middleware/asyncHandler.ts
var asyncHandler = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch((err) => {
    console.log("AsyncHandler caught error. Type of next:", typeof next);
    if (typeof next === "function") {
      next(err);
    } else {
      console.error("Fatal: next is not a function in asyncHandler", err);
    }
  });
};

// server/routes/bookRoutes.ts
var router2 = express2.Router();
router2.route("/").get(asyncHandler(getBooks)).post(protect, author, uploadMiddleware_default.fields([{ name: "file", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]), asyncHandler(createBook));
router2.route("/:id").get(asyncHandler(getBookById)).put(protect, author, asyncHandler(updateBook)).delete(protect, author, asyncHandler(deleteBook));
router2.route("/:id/like").put(protect, asyncHandler(toggleLike));
var bookRoutes_default = router2;

// server/routes/analyticsRoutes.ts
import express3 from "express";

// server/models/Analytics.ts
import mongoose6, { Schema as Schema5 } from "mongoose";
var AnalyticsSchema = new Schema5({
  bookId: {
    type: mongoose6.Schema.Types.ObjectId,
    ref: "Book",
    required: true
  },
  userId: {
    type: mongoose6.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  minutesRead: {
    type: Number,
    required: true,
    default: 0
  },
  pagesRead: {
    type: Number,
    required: true,
    default: 0
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});
AnalyticsSchema.index({ bookId: 1, timestamp: -1 });
AnalyticsSchema.index({ userId: 1, bookId: 1 });
var Analytics = mongoose6.models.Analytics || mongoose6.model("Analytics", AnalyticsSchema);
var Analytics_default = Analytics;

// server/models/Payout.ts
import mongoose7, { Schema as Schema6 } from "mongoose";
var PayoutSchema = new Schema6({
  authorId: {
    type: mongoose7.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "paid", "failed"],
    default: "pending"
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});
var Payout = mongoose7.models.Payout || mongoose7.model("Payout", PayoutSchema);
var Payout_default = Payout;

// server/controllers/analyticsController.ts
var trackReading = async (req, res) => {
  const { bookId, minutes, pages } = req.body;
  const book = await Book_default.findById(bookId);
  if (!book) {
    res.status(404).json({ message: "Book not found" });
    return;
  }
  book.readingMinutes = (book.readingMinutes || 0) + (minutes || 0);
  await book.save();
  await Analytics_default.create({
    bookId,
    userId: req.user._id,
    minutesRead: minutes || 0,
    pagesRead: pages || 0,
    timestamp: /* @__PURE__ */ new Date()
  });
  const earningsPerMinute = 0.05;
  const authorProfile = await Author_default.findOne({ userId: book.authorId });
  if (authorProfile) {
    authorProfile.earnings += (minutes || 0) * earningsPerMinute;
    await authorProfile.save();
  }
  res.json({ success: true });
};
var getAuthorStats = async (req, res) => {
  const userId = req.user._id;
  let authorProfile = await Author_default.findOne({ userId });
  if (!authorProfile && req.user.role === "author") {
    authorProfile = await Author_default.create({ userId });
  }
  if (!authorProfile) {
    res.status(404).json({ message: "Author profile not found" });
    return;
  }
  const books = await Book_default.find({ authorId: userId });
  const bookIds = books.map((b) => b._id);
  const totalReads = books.reduce((acc, b) => acc + (b.views || 0), 0);
  const totalMinutes = books.reduce((acc, b) => acc + (b.readingMinutes || 0), 0);
  const uniqueReadersResult = await Analytics_default.aggregate([
    { $match: { bookId: { $in: bookIds } } },
    { $group: { _id: null, uniqueUsers: { $addToSet: "$userId" } } },
    { $project: { count: { $size: "$uniqueUsers" } } }
  ]);
  const uniqueReaders = uniqueReadersResult.length > 0 ? uniqueReadersResult[0].count : 0;
  const payoutHistory = await Payout_default.find({ authorId: userId }).sort({ createdAt: -1 });
  res.json({
    totalReads,
    totalMinutes,
    uniqueReaders,
    earnings: authorProfile.earnings || 0,
    bookCount: books.length,
    payoutHistory: payoutHistory.map((p) => ({
      id: p._id,
      amount: p.amount,
      status: p.status,
      date: p.date.toLocaleDateString()
    }))
  });
};
var requestPayout = async (req, res) => {
  const userId = req.user._id;
  const authorProfile = await Author_default.findOne({ userId });
  if (!authorProfile || authorProfile.earnings < 1) {
    return res.status(400).json({ message: "Minimum payout is $1.00" });
  }
  const amount = authorProfile.earnings;
  await Payout_default.create({
    authorId: userId,
    amount,
    status: "pending",
    date: /* @__PURE__ */ new Date()
  });
  authorProfile.earnings = 0;
  await authorProfile.save();
  res.json({ message: "Payout requested successfully", amount });
};

// server/routes/analyticsRoutes.ts
var router3 = express3.Router();
router3.post("/track", protect, trackReading);
router3.get("/stats", protect, author, getAuthorStats);
router3.post("/payout", protect, author, requestPayout);
var analyticsRoutes_default = router3;

// server/routes/adminRoutes.ts
import express4 from "express";

// server/models/Revenue.ts
import mongoose8, { Schema as Schema7 } from "mongoose";
var RevenueSchema = new Schema7({
  month: {
    type: Date,
    required: true,
    unique: true
  },
  adsRevenue: {
    type: Number,
    default: 0
  },
  subscriptionRevenue: {
    type: Number,
    default: 0
  },
  totalRevenue: {
    type: Number,
    default: 0
  },
  authorPool: {
    type: Number,
    default: 0
  },
  platformShare: {
    type: Number,
    default: 0
  },
  authorPoolPercentage: {
    type: Number,
    default: 60
    // Configurable default
  },
  processed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});
RevenueSchema.pre("save", async function() {
  this.totalRevenue = (this.adsRevenue || 0) + (this.subscriptionRevenue || 0);
  this.authorPool = this.totalRevenue * (this.authorPoolPercentage || 60) / 100;
  this.platformShare = this.totalRevenue - this.authorPool;
});
var Revenue = mongoose8.models.Revenue || mongoose8.model("Revenue", RevenueSchema);
var Revenue_default = Revenue;

// server/controllers/adminController.ts
var getAdminStats = async (req, res) => {
  const totalUsers = await User_default.countDocuments();
  const totalBooks = await Book_default.countDocuments();
  const pendingBooks = await Book_default.countDocuments({ status: "pending" });
  const revenueAgg = await Revenue_default.aggregate([
    { $group: { _id: null, total: { $sum: "$totalRevenue" } } }
  ]);
  const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;
  res.json({
    totalUsers,
    totalBooks,
    pendingBooks,
    totalRevenue
  });
};
var updateBookStatus = async (req, res) => {
  const { status } = req.body;
  const book = await Book_default.findById(req.params.id);
  if (book) {
    book.status = status;
    await book.save();
    res.json(book);
  } else {
    res.status(404).json({ message: "Book not found" });
  }
};
var getPayouts = async (req, res) => {
  const payouts = await Payout_default.find({}).populate("authorId", "email");
  res.json(payouts);
};

// server/routes/adminRoutes.ts
var router4 = express4.Router();
router4.get("/stats", protect, admin, getAdminStats);
router4.patch("/books/:id/status", protect, admin, updateBookStatus);
router4.get("/payouts", protect, admin, getPayouts);
var adminRoutes_default = router4;

// server/routes/paymentRoutes.ts
import express5 from "express";

// server/controllers/paymentController.ts
import Stripe from "stripe";
var stripe;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
}
var createCheckoutSession = async (req, res) => {
  if (!stripe) {
    res.status(500).json({ message: "Stripe not configured" });
    return;
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: "Silentium Premium" },
          unit_amount: 999,
          // $9.99
          recurring: { interval: "month" }
        },
        quantity: 1
      }],
      mode: "subscription",
      success_url: `${process.env.APP_URL || "http://localhost:3000"}/?success=true`,
      cancel_url: `${process.env.APP_URL || "http://localhost:3000"}/?canceled=true`,
      customer_email: req.user.email
    });
    res.json({ id: session.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// server/routes/paymentRoutes.ts
var router5 = express5.Router();
router5.post("/create-checkout-session", protect, createCheckoutSession);
var paymentRoutes_default = router5;

// server/routes/revenueRoutes.ts
import express6 from "express";

// server/controllers/revenueController.ts
var calculateMonthlyPayouts = async (req, res) => {
  const { month, adsRevenue, subscriptionRevenue } = req.body;
  const targetMonth = new Date(month);
  targetMonth.setUTCDate(1);
  targetMonth.setUTCHours(0, 0, 0, 0);
  let revenueRecord = await Revenue_default.findOne({ month: targetMonth });
  if (!revenueRecord) {
    revenueRecord = new Revenue_default({ month: targetMonth });
  }
  revenueRecord.adsRevenue = adsRevenue;
  revenueRecord.subscriptionRevenue = subscriptionRevenue;
  await revenueRecord.save();
  const startOfMonth = new Date(targetMonth);
  const endOfMonth = new Date(targetMonth);
  endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1);
  const totalMinutesResult = await Analytics_default.aggregate([
    { $match: { timestamp: { $gte: startOfMonth, $lt: endOfMonth } } },
    { $group: { _id: null, total: { $sum: "$minutesRead" } } }
  ]);
  const totalPlatformMinutes = totalMinutesResult.length > 0 ? totalMinutesResult[0].total : 0;
  if (totalPlatformMinutes === 0) {
    res.status(400).json({ message: "No reading activity for this month" });
    return;
  }
  const authorStats = await Analytics_default.aggregate([
    { $match: { timestamp: { $gte: startOfMonth, $lt: endOfMonth } } },
    {
      $lookup: {
        from: "books",
        localField: "bookId",
        foreignField: "_id",
        as: "book"
      }
    },
    { $unwind: "$book" },
    {
      $group: {
        _id: "$book.authorId",
        authorMinutes: { $sum: "$minutesRead" }
      }
    }
  ]);
  const authorPool = revenueRecord.authorPool;
  const payoutLogs = [];
  for (const stats of authorStats) {
    const authorId = stats._id;
    const authorMinutes = stats.authorMinutes;
    const share = authorMinutes / totalPlatformMinutes * authorPool;
    if (share >= 50) {
      const payout = await Payout_default.create({
        authorId,
        amount: share,
        status: "pending",
        date: /* @__PURE__ */ new Date()
      });
      payoutLogs.push(payout);
      await Author_default.findOneAndUpdate(
        { userId: authorId },
        { $inc: { earnings: share } }
      );
    }
  }
  revenueRecord.processed = true;
  await revenueRecord.save();
  res.json({
    message: "Monthly payouts calculated",
    totalPlatformMinutes,
    authorPool,
    payoutsCreated: payoutLogs.length,
    payoutLogs
  });
};
var getMyEarnings = async (req, res) => {
  const authorId = req.user._id;
  const payouts = await Payout_default.find({ authorId }).sort({ date: -1 });
  const authorProfile = await Author_default.findOne({ userId: authorId });
  res.json({
    currentBalance: authorProfile?.earnings || 0,
    payoutHistory: payouts
  });
};
var getMonthlyAnalytics = async (req, res) => {
  const targetMonth = new Date(req.params.month);
  const startOfMonth = new Date(targetMonth);
  const endOfMonth = new Date(targetMonth);
  endOfMonth.setUTCMonth(endOfMonth.getUTCMonth() + 1);
  const stats = await Analytics_default.aggregate([
    { $match: { timestamp: { $gte: startOfMonth, $lt: endOfMonth } } },
    {
      $group: {
        _id: "$bookId",
        minutes: { $sum: "$minutesRead" },
        pages: { $sum: "$pagesRead" },
        uniqueReaders: { $addToSet: "$userId" }
      }
    },
    {
      $lookup: {
        from: "books",
        localField: "_id",
        foreignField: "_id",
        as: "book"
      }
    },
    { $unwind: "$book" },
    {
      $project: {
        bookId: "$_id",
        title: "$book.title",
        minutes: 1,
        pages: 1,
        uniqueReadersCount: { $size: "$uniqueReaders" }
      }
    }
  ]);
  res.json(stats);
};

// server/routes/revenueRoutes.ts
var router6 = express6.Router();
router6.post("/calculate", protect, admin, calculateMonthlyPayouts);
router6.get("/my-earnings", protect, author, getMyEarnings);
router6.get("/analytics/:month", protect, admin, getMonthlyAnalytics);
var revenueRoutes_default = router6;

// server/routes/userRoutes.ts
import express7 from "express";

// server/controllers/userController.ts
var toggleSaveBook = async (req, res) => {
  try {
    const user = await User_default.findById(req.user._id);
    const bookId = req.params.id;
    if (!user) return res.status(404).json({ message: "User not found" });
    const book = await Book_default.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });
    const isSaved = user.savedBooks.some((id) => id.toString() === bookId);
    if (isSaved) {
      user.savedBooks = user.savedBooks.filter((id) => id.toString() !== bookId);
    } else {
      user.savedBooks.push(bookId);
    }
    await user.save();
    res.json({ savedBooks: user.savedBooks, isSaved: !isSaved });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var toggleFollowUser = async (req, res) => {
  try {
    const currentUser = await User_default.findById(req.user._id);
    const targetUserId = req.params.id;
    if (currentUser?._id.toString() === targetUserId) {
      return res.status(400).json({ message: "You cannot follow yourself" });
    }
    const targetUser = await User_default.findById(targetUserId);
    if (!currentUser || !targetUser) return res.status(404).json({ message: "User not found" });
    const isFollowing = currentUser.following.some((id) => id.toString() === targetUserId);
    if (isFollowing) {
      currentUser.following = currentUser.following.filter((id) => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter((id) => id.toString() !== currentUser._id.toString());
    } else {
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUser._id);
    }
    await Promise.all([currentUser.save(), targetUser.save()]);
    res.json({ following: currentUser.following, isFollowing: !isFollowing });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var getUserLibrary = async (req, res) => {
  try {
    const user = await User_default.findById(req.user._id).populate({
      path: "savedBooks",
      populate: { path: "authorId", select: "name email avatar" }
    }).populate({
      path: "history.bookId",
      populate: { path: "authorId", select: "name email avatar" }
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    const getFullUrl = (req2, relativePath) => {
      if (!relativePath) return void 0;
      if (relativePath.startsWith("http")) return relativePath;
      const baseUrl = `${req2.protocol}://${req2.get("host")}`;
      return `${baseUrl}/${relativePath.replace(/\\/g, "/").replace(/^\//, "")}`;
    };
    const formatBook = (book) => ({
      ...book._doc,
      coverImage: getFullUrl(req, book.coverImage),
      fileUrl: getFullUrl(req, book.fileUrl),
      authorId: book.authorId ? {
        ...book.authorId._doc,
        avatar: getFullUrl(req, book.authorId.avatar)
      } : void 0
    });
    res.json({
      saved: user.savedBooks.map((b) => formatBook(b)),
      history: user.history.filter((h) => h.bookId).map((h) => ({
        ...h._doc,
        bookId: formatBook(h.bookId)
      })).sort((a, b) => new Date(b.lastRead).getTime() - new Date(a.lastRead).getTime())
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// server/routes/userRoutes.ts
var router7 = express7.Router();
router7.put("/library/:id", protect, toggleSaveBook);
router7.get("/library", protect, getUserLibrary);
router7.put("/follow/:id", protect, toggleFollowUser);
var userRoutes_default = router7;

// server/routes/commentRoutes.ts
import express8 from "express";

// server/models/Comment.ts
import mongoose9, { Schema as Schema8 } from "mongoose";
var CommentSchema = new Schema8({
  bookId: {
    type: mongoose9.Schema.Types.ObjectId,
    ref: "Book",
    required: true
  },
  userId: {
    type: mongoose9.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  content: {
    type: String,
    required: true
  },
  parentId: {
    type: mongoose9.Schema.Types.ObjectId,
    ref: "Comment",
    default: null
  },
  likes: [{
    type: mongoose9.Schema.Types.ObjectId,
    ref: "User"
  }]
}, {
  timestamps: true
});
var Comment = mongoose9.models.Comment || mongoose9.model("Comment", CommentSchema);
var Comment_default = Comment;

// server/controllers/commentController.ts
var getComments = async (req, res) => {
  try {
    const comments = await Comment_default.find({ bookId: req.params.bookId }).populate("userId", "name email avatar").sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var addComment = async (req, res) => {
  try {
    const { content, parentId } = req.body;
    const comment = await Comment_default.create({
      bookId: req.params.bookId,
      userId: req.user._id,
      content,
      parentId: parentId || null
    });
    const populatedComment = await Comment_default.findById(comment._id).populate("userId", "name email avatar");
    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
var deleteComment = async (req, res) => {
  try {
    const comment = await Comment_default.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    if (comment.userId.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(401).json({ message: "Not authorized" });
    }
    await comment.deleteOne();
    res.json({ message: "Comment removed" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// server/routes/commentRoutes.ts
var router8 = express8.Router();
router8.route("/:bookId").get(getComments).post(protect, addComment);
router8.delete("/:id", protect, deleteComment);
var commentRoutes_default = router8;

// server/middleware/errorMiddleware.ts
var isDev = process.env.NODE_ENV !== "production";
var errorHandler = (err, req, res, next) => {
  try {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    console.error(`[Server Error] ${req.method} ${req.url}:`, err);
    if (err.name === "ValidationError") {
      return res.json({
        message: "Validation failed",
        errors: Object.values(err.errors || {}).map((e) => e.message)
      });
    }
    if (err.code === 11e3) {
      const field = err.keyValue ? Object.keys(err.keyValue)[0] : "resource";
      return res.status(400).json({
        message: `${field} already exists (duplicate key error)`,
        field
      });
    }
    res.json({
      message: err.message || "Internal Server Error",
      error: isDev ? err : void 0,
      stack: isDev ? err.stack : void 0
    });
  } catch (fatalError) {
    console.error("Fatal Error in Error Handler:", fatalError);
    if (!res.headersSent) {
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

// server.ts
dotenv.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path2.dirname(__filename);
var app = express9();
var isConnected = false;
var connectionPromise = null;
var ensureConnection = async () => {
  if (isConnected) return;
  if (!connectionPromise) {
    connectionPromise = db_default().then(() => {
      isConnected = true;
    }).catch((err) => {
      connectionPromise = null;
      console.error("DB Connection Error:", err);
      throw err;
    });
  }
  return connectionPromise;
};
var isDev2 = process.env.NODE_ENV !== "production" && !process.env.RENDER && !process.env.VERCEL;
if (isDev2) {
  app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * ws: wss:;");
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });
} else {
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "blob:"],
        "worker-src": ["'self'", "blob:", "https://unpkg.com"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:", "https://*"],
        "frame-src": ["'self'", "blob:", "*"],
        // Allow framing from anywhere if needed
        "object-src": ["'self'", "blob:"],
        "connect-src": ["'self'", "blob:", "https://unpkg.com", "*"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Allow cross-origin access to resources
    crossOriginOpenerPolicy: false
  }));
}
app.use(cors({
  origin: "*",
  // Allow all origins
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express9.json());
app.use(asyncHandler(async (req, res, next) => {
  await ensureConnection();
  next();
}));
var uploadsPath = process.env.UPLOADS_PATH || path2.join(process.cwd(), "uploads");
if (!process.env.VERCEL && !fs2.existsSync(uploadsPath)) {
  try {
    fs2.mkdirSync(uploadsPath, { recursive: true });
  } catch (err) {
    console.error("Error creating uploads directory:", err);
  }
}
app.use("/uploads", express9.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    if (path2.extname(filePath).toLowerCase() === ".pdf") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
    }
  }
}));
app.get("/api/debug/uploads", (req, res) => {
  fs2.readdir(uploadsPath, (err, files) => {
    if (err) return res.status(500).json({ error: err.message, path: uploadsPath, env: process.env.UPLOADS_PATH });
    res.json({ path: uploadsPath, env: process.env.UPLOADS_PATH, files });
  });
});
app.use("/uploads", (req, res) => {
  console.error(`404: File not found at ${path2.join(uploadsPath, req.path)}`);
  res.status(404).send("File not found on server");
});
app.use("/api/auth", authRoutes_default);
app.use("/api/books", bookRoutes_default);
app.use("/api/analytics", analyticsRoutes_default);
app.use("/api/admin", adminRoutes_default);
app.use("/api/payments", paymentRoutes_default);
app.use("/api/revenue", revenueRoutes_default);
app.use("/api/users", userRoutes_default);
app.use("/api/comments", commentRoutes_default);
app.use("/api/user", authRoutes_default);
app.use("/api/documents", bookRoutes_default);
var setupFrontend = async () => {
  if (isDev2 && !process.env.VERCEL) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Vite Server Error:", err);
    }
  } else {
    const distPath = path2.join(process.cwd(), "dist");
    if (fs2.existsSync(distPath)) {
      app.use(express9.static(distPath));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
        res.sendFile(path2.join(distPath, "index.html"));
      });
    } else {
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        res.status(404).json({ message: "The application is still initializing. Please wait a moment." });
      });
    }
  }
  app.use(errorHandler);
  if (!process.env.VERCEL) {
    const PORT = Number(process.env.PORT) || 3e3;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Professional server running at http://localhost:${PORT}`);
      console.log(`Mode: ${isDev2 ? "Development" : "Production"}`);
    });
  }
};
setupFrontend().catch((err) => {
  console.error("Fatal Initialization Error:", err);
});
var server_default = app;
export {
  server_default as default
};
