// server.ts
import dotenv2 from "dotenv";
import express9 from "express";
import { createServer as createViteServer } from "vite";
import path4 from "path";
import cors from "cors";
import helmet from "helmet";
import fs4 from "fs";
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
        const errorMessage = err.message;
        console.error(`Cloud MongoDB connection failed. Error details:`, {
          error: errorMessage,
          mongoUri: mongoUri ? "configured" : "missing",
          environment: process.env.NODE_ENV || "unknown",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log("Falling back to In-Memory MongoDB for production stability...");
        const { MongoMemoryServer } = await import("mongodb-memory-server");
        const mongoServer = await MongoMemoryServer.create();
        const fallbackUri = mongoServer.getUri();
        await mongoose.connect(fallbackUri);
        console.log(`Fallback MongoDB Connected (In-Memory)`);
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
  streak: {
    type: Number,
    default: 1
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastLostStreak: {
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
import path from "path";
var generateToken = (id, rememberMe = false) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret", {
    expiresIn: rememberMe ? "30d" : "24h"
  });
};
var validatePassword = (password) => {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
};
var getFullUrl = (req, filePath) => {
  if (!filePath) return void 0;
  if (filePath.startsWith("http")) return filePath;
  let normalizedPath = filePath;
  if (path.isAbsolute(filePath)) {
    normalizedPath = `uploads/${path.basename(filePath)}`;
  }
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/${normalizedPath.replace(/\\/g, "/").replace(/^\//, "")}`;
};
var registerUser = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    console.log(`Registration attempt: ${email}, role: ${role}`);
    if (!email || !password) {
      console.log("Registration failed: Email or password missing");
      return res.status(400).json({ message: "Please provide email and password" });
    }
    if (!validatePassword(password)) {
      console.log(`Registration failed: Password complexity check failed for ${email}`);
      return res.status(400).json({ message: "Password must be at least 8 characters, include an uppercase letter, a number, and a special character." });
    }
    const userExists = await User_default.findOne({ email });
    if (userExists) {
      console.log(`Registration failed: User already exists (${email})`);
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
      console.log(`User created: ${user.email} (${user._id})`);
      if (user.role === "author") {
        try {
          await Author_default.create({ userId: user._id });
          console.log(`Author profile created for: ${user.email}`);
        } catch (authorError) {
          console.error(`Failed to create author profile for ${user.email}:`, authorError);
        }
      }
      res.status(201).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken(user._id.toString()),
        message: "Registration successful."
      });
    } else {
      console.log("Registration failed: User creation returned null");
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Registration error:", error);
    if (error.code === 11e3) {
      const field = error.keyValue ? Object.keys(error.keyValue)[0] : "resource";
      return res.status(400).json({ message: `${field} already exists` });
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
      const now = /* @__PURE__ */ new Date();
      const lastLogin = user.lastLogin;
      if (lastLogin) {
        const lastLoginDate = new Date(lastLogin);
        const isToday = now.toDateString() === lastLoginDate.toDateString();
        if (!isToday) {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          const isYesterday = yesterday.toDateString() === lastLoginDate.toDateString();
          if (isYesterday) {
            user.streak += 1;
          } else {
            if (user.streak > 1) {
              user.lastLostStreak = user.streak;
            }
            user.streak = 1;
          }
          if (user.streak > user.longestStreak) {
            user.longestStreak = user.streak;
          }
        }
      }
      user.lastLogin = now;
      await user.save();
      await LoginLog_default.create({ userId: user._id, email, status: "success", ipAddress, userAgent });
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        streak: user.streak,
        longestStreak: user.longestStreak,
        lastLostStreak: user.lastLostStreak,
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
        avatar: getFullUrl(req, user.avatar),
        notificationPreferences: user.notificationPreferences,
        streak: user.streak,
        longestStreak: user.longestStreak,
        lastLostStreak: user.lastLostStreak,
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
      user.avatar = `uploads/${req.file.filename}`;
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
      avatar: getFullUrl(req, updatedUser.avatar),
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
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];
  if (!token || token === "undefined" || token === "null") {
    return res.status(401).json({
      message: "Not authorized, no valid token provided",
      code: "NO_TOKEN"
    });
  }
  try {
    const decoded = jwt2.verify(token, process.env.JWT_SECRET || "secret");
    req.user = await User_default.findById(decoded.id).select("-passwordHash");
    if (!req.user) {
      return res.status(401).json({
        message: "Not authorized, user no longer exists in database. Your session may have been cleared if using in-memory storage.",
        code: "USER_NOT_FOUND"
      });
    }
    return next();
  } catch (error) {
    console.error("JWT Error:", error.message, "Token snippet:", token.substring(0, 10) + "...");
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        message: "Not authorized, invalid or malformed token",
        code: "INVALID_TOKEN"
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Not authorized, token expired",
        code: "TOKEN_EXPIRED"
      });
    }
    return res.status(401).json({
      message: "Not authorized, token validation failed",
      code: "AUTH_FAILED"
    });
  }
};
var optionalProtect = async (req, res, next) => {
  console.log(`[DEBUG] Entering optionalProtect for: ${req.path}`);
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : req.query.token;
  if (token) {
    console.log(`[DEBUG] optionalProtect - Token found (first 10 chars): ${token.substring(0, 10)}`);
    try {
      const decoded = jwt2.verify(token, process.env.JWT_SECRET || "secret");
      req.user = await User_default.findById(decoded.id).select("-passwordHash");
      console.log(`[DEBUG] optionalProtect - User found: ${!!req.user}`);
    } catch (err) {
      console.warn("[DEBUG] optionalProtect - Invalid token (proceeding as guest):", err.message);
    }
  } else {
    console.log("[DEBUG] optionalProtect - No token provided (proceeding as guest)");
  }
  return next();
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
import path2 from "path";
import fs from "fs";
var tempDir = "temp_uploads";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}
var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, tempDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path2.extname(file.originalname));
  }
});
var upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  // 50MB limit
  fileFilter: function(req, file, cb) {
    if (file.fieldname === "file" && file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed for the book file."));
    }
    if (file.fieldname === "coverImage" && !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed for the cover image."));
    }
    cb(null, true);
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

// server/controllers/bookController.ts
import path3 from "path";
import fs3 from "fs";

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
    // LEGACY: Do not use for new features. Use proxy endpoint instead.
  },
  fileKey: {
    type: String
    // Cloudinary Public ID or Local Path
  },
  storageType: {
    type: String,
    // 'cloudinary' or 'local'
    enum: ["cloudinary", "local"]
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
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.fileUrl;
      delete ret.fileKey;
      return ret;
    }
  },
  toObject: {
    transform: (doc, ret) => {
      delete ret.fileUrl;
      delete ret.fileKey;
      return ret;
    }
  }
});
BookSchema.index({ title: "text", description: "text", tags: "text" });
var Book = mongoose5.models.Book || mongoose5.model("Book", BookSchema);
var Book_default = Book;

// server/utils/bookFormatter.ts
var formatBookResponse = (req, book) => {
  const b = book._doc || book;
  const protocol = process.env.NODE_ENV === "production" ? "https" : req.protocol;
  const baseUrl = `${protocol}://${req.get("host")}`;
  const getFullUrl2 = (relativePath) => {
    if (!relativePath) return void 0;
    if (relativePath.startsWith("http://")) {
      return relativePath.replace("http://", "https://");
    }
    if (relativePath.startsWith("https://")) return relativePath;
    return `${baseUrl}/${relativePath.replace(/\\/g, "/").replace(/^\//, "")}`;
  };
  return {
    _id: b._id,
    title: b.title,
    description: b.description,
    category: b.category,
    tags: b.tags,
    author: b.authorId ? {
      _id: b.authorId._id || b.authorId,
      name: b.authorId.name || b.authorId.email?.split("@")[0] || "Unknown",
      avatar: getFullUrl2(b.authorId.avatar),
      credits: b.authorId.credits
    } : void 0,
    coverImage: getFullUrl2(b.coverImage),
    // Proxy URL only — never expose raw storage URLs
    fileUrl: `${baseUrl}/api/books/${b._id}/file`,
    fileType: b.fileUrl && typeof b.fileUrl === "string" && b.fileUrl.toLowerCase().endsWith(".pdf") || b.fileKey && typeof b.fileKey === "string" && b.fileKey.toLowerCase().endsWith(".pdf") ? "pdf" : "other",
    // fileKey intentionally omitted — internal storage detail, never expose to client
    content: b.content,
    pageCount: b.pageCount,
    views: b.views,
    likes: b.likes?.length || 0,
    isLiked: req.user && b.likes ? b.likes.some((id) => id.toString() === req.user._id.toString()) : false,
    readingMinutes: b.readingMinutes,
    status: b.status,
    visibility: b.visibility,
    createdAt: b.createdAt
  };
};

// server/utils/cloudinaryHelper.ts
import { v2 as cloudinary2 } from "cloudinary";
import fs2 from "fs";

// server/config/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
var isCloudinaryConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME?.trim() && process.env.CLOUDINARY_API_KEY?.trim() && process.env.CLOUDINARY_API_SECRET?.trim()
);

// server/utils/cloudinaryHelper.ts
var uploadToCloudinary = async (filePath, folder, resourceType = "auto") => {
  try {
    const result = await cloudinary2.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      overwrite: true,
      access_mode: "public"
    });
    console.log(`[Cloudinary] Upload success: ${result.secure_url} (${result.resource_type})`);
    if (fs2.existsSync(filePath)) {
      fs2.unlinkSync(filePath);
    }
    return result;
  } catch (error) {
    console.error("[Cloudinary] Upload error:", error);
    if (fs2.existsSync(filePath)) {
      fs2.unlinkSync(filePath);
    }
    throw new Error(`Cloudinary upload failed: ${error.message || "Unknown error"}`);
  }
};
var getCloudinaryUrl = (publicId, resourceType = "raw") => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME not configured");
  }
  return `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${publicId}`;
};
var getSignedCloudinaryUrl = (publicId, resourceType = "raw") => {
  if (!isCloudinaryConfigured()) {
    return getCloudinaryUrl(publicId, resourceType);
  }
  return cloudinary2.url(publicId, {
    resource_type: resourceType,
    secure: true,
    sign_url: true,
    type: "upload"
  });
};

// server/controllers/bookController.ts
var uploadsDirRoot = () => process.env.UPLOADS_PATH || path3.join(process.cwd(), "uploads");
var extractUploadsRelative = (raw) => {
  const normalized = raw.replace(/\\/g, "/").trim();
  const idx = normalized.toLowerCase().indexOf("/uploads/");
  if (idx >= 0) return normalized.slice(idx + "/uploads/".length);
  if (/^uploads\//i.test(normalized)) return normalized.slice("uploads/".length);
  if (/^\/uploads\//i.test(normalized)) return normalized.slice("/uploads/".length);
  return null;
};
var createBook = async (req, res) => {
  const { title, description, category, tags, visibility, content, readingMinutes, pageCount } = req.body;
  const files = req.files;
  let fileKey;
  let coverImageUrl;
  const storageType = "cloudinary";
  if (files?.["file"]?.[0] || files?.["coverImage"]?.[0]) {
    if (!isCloudinaryConfigured()) {
      throw new Error("Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.");
    }
  }
  if (files?.["file"]?.[0]) {
    const file = files["file"][0];
    const result = await uploadToCloudinary(file.path, "books/files", "raw");
    fileKey = result.public_id;
  }
  if (files?.["coverImage"]?.[0]) {
    const file = files["coverImage"][0];
    const result = await uploadToCloudinary(file.path, "books/covers", "image");
    coverImageUrl = result.secure_url;
  }
  if (!fileKey && !content) {
    return res.status(400).json({ message: "Please provide either a file or write content." });
  }
  const book = new Book_default({
    title,
    authorId: req.user._id,
    description,
    category,
    tags: tags ? typeof tags === "string" ? tags.split(",").map((t) => t.trim()) : tags : [],
    fileKey,
    storageType,
    coverImage: coverImageUrl,
    content,
    pageCount: pageCount || 0,
    visibility: visibility || "public",
    status: "published",
    readingMinutes: readingMinutes || 5
  });
  const createdBook = await book.save();
  if (fileKey || content) {
    await User_default.findByIdAndUpdate(req.user._id, {
      $inc: { credits: 3 }
    });
  }
  res.status(201).json(formatBookResponse(req, createdBook));
};
var streamBookFile = async (req, res) => {
  const bookId = req.params.id;
  console.log(`[DEBUG] >>> streamBookFile HEARTBEAT: Entering for ID: ${bookId}`);
  console.log(`[DEBUG] Received headers:`, JSON.stringify(req.headers, null, 2));
  try {
    if (!/^[a-fA-F0-9]{24}$/.test(bookId)) {
      return res.status(400).json({ message: "Invalid book id format" });
    }
    console.log(`[DEBUG] Looking for book with ID: ${bookId}`);
    const book = await Book_default.findById(bookId).select("fileUrl fileKey title visibility storageType").lean();
    if (book) {
      console.log(`[DEBUG] Book found: ${book.title}`);
      console.log(`[DEBUG] Book metadata - fileUrl: "${book.fileUrl || ""}", fileKey: "${book.fileKey || ""}", storageType: "${book.storageType || ""}"`);
    } else {
      console.log(`[DEBUG] Book NOT found in database: ${bookId}`);
      return res.status(404).json({ message: "Book not found" });
    }
    if (!book.fileUrl && !book.fileKey) {
      console.log(`[DEBUG] Book has no file metadata for ID: ${bookId}`);
      return res.status(404).json({ message: "Book has no file" });
    }
    let fileUrl = book.fileUrl;
    const isCloudinary = book.storageType === "cloudinary" || fileUrl && fileUrl.includes("res.cloudinary.com");
    if (!fileUrl && book.fileKey && book.storageType) {
      if (book.storageType === "cloudinary") {
        fileUrl = getCloudinaryUrl(book.fileKey, "raw");
      }
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Authorization");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");
    const fileName = (book.title || "document").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    res.setHeader("Content-Disposition", `inline; filename="${fileName}.pdf"`);
    if (isCloudinary) {
      const publicId = book.fileKey || "";
      if (!publicId) {
        console.error(`[DEBUG] Missing fileKey for Cloudinary book: ${bookId}`);
        return res.status(404).json({ message: "Cloudinary resource ID missing" });
      }
      console.log(`[DEBUG] Generating signed URL for: ${publicId}`);
      const signedUrl = getSignedCloudinaryUrl(publicId, "raw");
      console.log(`[DEBUG] Redirecting to SIGNED URL: ${signedUrl}`);
      return res.redirect(302, signedUrl);
    } else {
      const relativePath = extractUploadsRelative(fileUrl || "");
      if (relativePath) {
        const localPath = path3.join(uploadsDirRoot(), relativePath);
        if (fs3.existsSync(localPath)) {
          const stat = fs3.statSync(localPath);
          const fileSize = stat.size;
          const range = req.headers.range;
          if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = end - start + 1;
            const file = fs3.createReadStream(localPath, { start, end });
            res.writeHead(206, {
              "Content-Range": `bytes ${start}-${end}/${fileSize}`,
              "Content-Length": chunksize,
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${fileName}.pdf"`
            });
            file.pipe(res);
          } else {
            res.writeHead(200, {
              "Content-Length": fileSize,
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${fileName}.pdf"`
            });
            fs3.createReadStream(localPath).pipe(res);
          }
        } else {
          console.log(`Fallback redirect to: ${fileUrl}`);
          res.redirect(302, fileUrl);
        }
      }
    }
  } catch (globalError) {
    if (!res.headersSent) res.status(500).json({ message: "Proxy fatal error", error: globalError.message });
  }
};
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
  if (sortBy === "popular") sortOptions = { views: -1 };
  else if (sortBy === "trending") sortOptions = { views: -1, createdAt: -1 };
  const count = await Book_default.countDocuments(query);
  const books = await Book_default.find(query).populate("authorId", "name email avatar credits").sort(sortOptions).limit(pageSize).skip(pageSize * (page - 1));
  const formattedBooks = books.map((book) => formatBookResponse(req, book));
  res.json({ books: formattedBooks, page, pages: Math.ceil(count / pageSize), total: count });
};
var getBookById = async (req, res) => {
  const bookId = req.params.id;
  const book = await Book_default.findById(bookId).populate("authorId", "name email avatar credits");
  if (book) {
    console.log(`[DEBUG] getBookById - Book: ${bookId}, title: ${book.title}, fileUrl: ${!!book.fileUrl}, fileKey: ${!!book.fileKey}`);
    book.views += 1;
    await book.save();
    res.json(formatBookResponse(req, book));
  } else {
    res.status(404).json({ message: "Book not found" });
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
    res.json(formatBookResponse(req, updatedBook));
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
router2.get("/:id/file", optionalProtect, asyncHandler(streamBookFile));
router2.route("/").get(asyncHandler(getBooks)).post(
  protect,
  author,
  uploadMiddleware_default.fields([{ name: "file", maxCount: 1 }, { name: "coverImage", maxCount: 1 }]),
  asyncHandler(createBook)
);
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
var getAdminBooks = async (req, res) => {
  const books = await Book_default.find({}).populate("authorId", "name email avatar credits").sort({ createdAt: -1 });
  const formattedBooks = books.map((book) => formatBookResponse(req, book));
  res.json(formattedBooks);
};
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
    res.json(formatBookResponse(req, book));
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
router4.get("/documents", protect, admin, getAdminBooks);
router4.patch("/documents/:id/status", protect, admin, updateBookStatus);
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
    const rawAppUrl = process.env.APP_URL || "http://localhost:3000";
    const appUrl = process.env.NODE_ENV === "production" && rawAppUrl.startsWith("http://") ? rawAppUrl.replace("http://", "https://") : rawAppUrl;
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
      success_url: `${appUrl}/?success=true`,
      cancel_url: `${appUrl}/?canceled=true`,
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
    const getFullUrl2 = (req2, relativePath) => {
      if (!relativePath) return void 0;
      if (relativePath.startsWith("http")) return relativePath;
      const baseUrl = `${req2.protocol}://${req2.get("host")}`;
      return `${baseUrl}/${relativePath.replace(/\\/g, "/").replace(/^\//, "")}`;
    };
    res.json({
      saved: user.savedBooks.map((b) => formatBookResponse(req, b)),
      history: user.history.filter((h) => h.bookId).map((h) => ({
        ...h._doc,
        bookId: formatBookResponse(req, h.bookId)
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
    const statusCode = err?.statusCode || err?.status || (res.statusCode === 200 ? 500 : res.statusCode);
    res.status(statusCode).header("Content-Type", "application/json");
    const errorContext = {
      method: req.method,
      url: req.url,
      userAgent: req.get("User-Agent"),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      renderService: process.env.RENDER_SERVICE_ID || "unknown"
    };
    console.error(`[Server Error] ${req.method} ${req.url}:`, {
      ...errorContext,
      error: err.message,
      stack: err.stack
    });
    if (err.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(err.errors || {}).map((e) => e.message)
      });
    }
    if (err.code === 11e3) {
      const field = err.keyValue ? Object.keys(err.keyValue)[0] : "resource";
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
        field,
        code: "DUPLICATE_KEY"
      });
    }
    if (err.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
        field: err.path,
        value: err.value,
        code: "INVALID_ID"
      });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
        code: "INVALID_TOKEN"
      });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token expired",
        code: "TOKEN_EXPIRED"
      });
    }
    if (err.name === "MongooseServerSelectionError") {
      return res.status(503).json({
        success: false,
        message: "Database connection failed",
        code: "DATABASE_ERROR"
      });
    }
    if (err.code === "ENOENT" || err.code === "ENAMETOOLONG") {
      return res.status(404).json({
        success: false,
        message: "File not found",
        code: "FILE_NOT_FOUND"
      });
    }
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "File too large. Maximum size allowed is 10MB.",
        code: "FILE_TOO_LARGE"
      });
    }
    if (err.message?.includes("Cloudinary")) {
      const isSizeError = err.message.includes("File size too large");
      return res.status(isSizeError ? 413 : 400).json({
        success: false,
        message: err.message,
        code: "UPLOAD_ERROR"
      });
    }
    const response = {
      success: false,
      message: err.message || "Internal Server Error",
      code: "INTERNAL_ERROR"
    };
    if (isDev) {
      response.error = err;
      response.stack = err.stack;
    }
    res.json(response);
  } catch (fatalError) {
    console.error("Fatal Error in Error Handler:", fatalError);
    if (!res.headersSent) {
      res.status(500).header("Content-Type", "application/json").json({
        success: false,
        message: "Internal Server Error",
        code: "FATAL_ERROR"
      });
    }
  }
};

// server.ts
dotenv2.config();
var __filename = fileURLToPath(import.meta.url);
var __dirname = path4.dirname(__filename);
var app = express9();
app.use((req, res, next) => {
  if (req.path.includes("/api/")) {
    console.log(`[DEBUG] Incoming Request: ${req.method} ${req.path} ${JSON.stringify(req.query)}`);
  }
  next();
});
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
        "frame-ancestors": ["'self'", "https://*.vercel.app", "https://silentium-m9z8.onrender.com", "http://localhost:3000"],
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
var allowedOrigins = [
  "https://silentium.vercel.app",
  "https://silentium-m9z8.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000"
];
var corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app") || origin.includes("vercel.app")) {
      return callback(null, true);
    }
    console.error("Blocked by CORS: ", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "X-Auth-Token"
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400
  // 24 hours
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express9.json({ limit: "50mb" }));
app.use(express9.urlencoded({ limit: "50mb", extended: true }));
app.use(asyncHandler(async (req, res, next) => {
  try {
    await ensureConnection();
  } catch (error) {
    console.error("Database connection failed:", error.message);
    return res.status(500).json({
      message: "Database connection failed",
      error: process.env.NODE_ENV !== "production" ? error.message : void 0
    });
  }
  next();
}));
app.get("/", (req, res) => {
  const healthStatus = {
    success: true,
    status: "ok",
    message: "Silentium API is running",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    version: process.env.npm_package_version || "unknown",
    render: {
      serviceId: process.env.RENDER_SERVICE_ID || "not-on-render",
      instanceId: process.env.RENDER_INSTANCE_ID || "not-on-render",
      externalUrl: process.env.RENDER_EXTERNAL_URL || "not-on-render"
    },
    database: {
      connected: isConnected,
      uri: process.env.MONGO_URI ? "configured" : "not-configured"
    }
  };
  res.header("Content-Type", "application/json").json(healthStatus);
});
app.get("/test-upload", (req, res) => {
  try {
    const testFile = path4.join(uploadsDir, "test-sample.pdf");
    const testContent = "Sample PDF content for testing\nCreated: " + (/* @__PURE__ */ new Date()).toISOString();
    fs4.writeFileSync(testFile, testContent);
    res.json({
      message: "Test file created",
      file: "test-sample.pdf",
      url: `${req.protocol}://${req.get("host")}/uploads/test-sample.pdf`,
      uploadsDir
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
var uploadsDir = process.env.UPLOADS_PATH || path4.join(process.cwd(), "uploads");
console.log("Uploads directory:", uploadsDir);
if (!fs4.existsSync(uploadsDir)) {
  fs4.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/api/auth", authRoutes_default);
app.use("/api/books", bookRoutes_default);
app.use("/api/analytics", analyticsRoutes_default);
app.use("/api/admin", adminRoutes_default);
app.use("/api/payments", paymentRoutes_default);
app.use("/api/revenue", revenueRoutes_default);
app.use("/api/users", userRoutes_default);
app.use("/api/comments", commentRoutes_default);
app.get("/api/debug-ping", (req, res) => {
  console.log("[DEBUG] PING received");
  res.json({ pong: true, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/api/user", authRoutes_default);
app.use("/api/documents", bookRoutes_default);
var setupFrontend = async () => {
  console.log("=== Silentium Server Startup [FIX_VER: 1.0.8] ===");
  console.log("Environment:", process.env.NODE_ENV);
  console.log("Platform:", process.platform);
  console.log("Node Version:", process.version);
  console.log("Working Directory:", process.cwd());
  console.log("Render Service:", process.env.RENDER_SERVICE_ID || "Not running on Render");
  console.log("Mongo URI configured:", !!process.env.MONGO_URI);
  console.log("JWT Secret configured:", !!process.env.JWT_SECRET);
  console.log("Cloudinary configured:", !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY));
  console.log("================================");
  process.on("unhandledRejection", (reason, promise) => {
    console.error("[FATAL] Unhandled Rejection at:", promise, "reason:", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[FATAL] Uncaught Exception:", err);
  });
  if (isDev2 && !process.env.VERCEL) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa"
      });
      app.use(vite.middlewares);
      console.log("Vite development server configured");
    } catch (err) {
      console.error("Vite Server Error:", err);
    }
  } else {
    const distPath = path4.join(process.cwd(), "dist");
    if (fs4.existsSync(distPath)) {
      app.use(express9.static(distPath));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
        res.sendFile(path4.join(distPath, "index.html"));
      });
      console.log("Static files serving from:", distPath);
    } else {
      console.warn("Dist directory not found:", distPath);
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api")) return next();
        res.status(404).json({
          success: false,
          message: "The application is still initializing. Please wait a moment.",
          code: "APP_NOT_READY"
        });
      });
    }
  }
  app.use(errorHandler);
  if (!process.env.VERCEL) {
    const PORT = Number(process.env.PORT) || 3e3;
    const HOST = process.env.RENDER ? "0.0.0.0" : "localhost";
    app.listen(PORT, HOST, () => {
      console.log(`=== Server Started Successfully ===`);
      console.log(`URL: http://${HOST}:${PORT}`);
      console.log(`Mode: ${isDev2 ? "Development" : "Production"}`);
      console.log(`Health check available at: http://${HOST}:${PORT}/`);
      console.log(`================================`);
    }).on("error", (err) => {
      console.error("Failed to start server:", err);
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use`);
      }
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
