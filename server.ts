import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import { fileURLToPath } from 'url';
import connectDB from './server/config/db';

import authRoutes from './server/routes/authRoutes';
import bookRoutes from './server/routes/bookRoutes';
import analyticsRoutes from './server/routes/analyticsRoutes';
import adminRoutes from './server/routes/adminRoutes';
import paymentRoutes from './server/routes/paymentRoutes';
import revenueRoutes from './server/routes/revenueRoutes';
import userRoutes from './server/routes/userRoutes';
import commentRoutes from './server/routes/commentRoutes';
import { errorHandler } from './server/middleware/errorMiddleware';
import { asyncHandler } from './server/middleware/asyncHandler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Database connection management for Serverless/Cloud
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

const ensureConnection = async () => {
  if (isConnected) return;
  if (!connectionPromise) {
    connectionPromise = connectDB()
      .then(() => { isConnected = true; })
      .catch((err) => {
        connectionPromise = null;
        console.error('DB Connection Error:', err);
        throw err;
      });
  }
  return connectionPromise;
};

const isDev = process.env.NODE_ENV !== 'production' && !process.env.RENDER && !process.env.VERCEL;

// 1. Security & Body Parsing
if (isDev) {
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
        "frame-src": ["'self'", "blob:", "*"], // Allow framing from anywhere if needed
        "object-src": ["'self'", "blob:"],
        "connect-src": ["'self'", "blob:", "https://unpkg.com", "*"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin access to resources
    crossOriginOpenerPolicy: false,
  }));
}

app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// 2. Ensure DB connection for every request
app.use(asyncHandler(async (req: any, res: any, next: any) => {
  await ensureConnection();
  next();
}));

// Root route for health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Silentium API is running',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to create a sample file
app.get('/test-upload', (req, res) => {
  try {
    const testFile = path.join(uploadsDir, 'test-sample.pdf');
    const testContent = 'Sample PDF content for testing\nCreated: ' + new Date().toISOString();
    fs.writeFileSync(testFile, testContent);
    
    res.json({
      message: 'Test file created',
      file: 'test-sample.pdf',
      url: `${req.protocol}://${req.get('host')}/uploads/test-sample.pdf`,
      uploadsDir: uploadsDir
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Static Files (Cloudinary used for books, local disk for avatars)
const uploadsDir = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
console.log('Uploads directory:', uploadsDir);
console.log('Current working directory:', process.cwd());
console.log('Environment UPLOADS_PATH:', process.env.UPLOADS_PATH);

// Ensure uploads directory exists with proper permissions
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('Created uploads directory:', uploadsDir);
  } else {
    console.log('Uploads directory exists');
  }
  
  // Test directory access
  const testFile = path.join(uploadsDir, 'test-access.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('Uploads directory is writable');
  
  // List files if any exist
  try {
    const files = fs.readdirSync(uploadsDir);
    console.log('Files in uploads:', files.length > 0 ? files : '(empty)');
  } catch (err) {
    console.log('Cannot read uploads directory:', err.message);
  }
} catch (error) {
  console.error('Error setting up uploads directory:', error);
}

// Serve uploads with proper headers and caching
app.use('/uploads', (req, res, next) => {
  console.log('Upload request:', req.path, 'Full URL:', req.originalUrl);
  next();
}, express.static(uploadsDir, {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  fallthrough: false
}));

// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);

// Compatibility aliases
app.use('/api/user', authRoutes);
app.use('/api/documents', bookRoutes);

// 5. Frontend / Vite
const setupFrontend = async () => {
  if (isDev && !process.env.VERCEL) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error('Vite Server Error:', err);
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.status(404).json({ message: 'The application is still initializing. Please wait a moment.' });
      });
    }
  }

  // Error Handler must be after ALL routes (including Vite middlewares)
  app.use(errorHandler);

  if (!process.env.VERCEL) {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Professional server running at http://localhost:${PORT}`);
      console.log(`Mode: ${isDev ? 'Development' : 'Production'}`);
    });
  }
};

setupFrontend().catch((err) => {
  console.error('Fatal Initialization Error:', err);
});

export default app;
