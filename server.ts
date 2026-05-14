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

// Global Request Logger for Debugging
app.use((req, res, next) => {
  if (req.path.includes('/api/')) {
    console.log(`[DEBUG] Incoming Request: ${req.method} ${req.path} ${JSON.stringify(req.query)}`);
  }
  next();
});

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
        "frame-ancestors": ["'self'", "https://*.vercel.app", "https://silentium-m9z8.onrender.com", "http://localhost:3000"],
        "object-src": ["'self'", "blob:"],
        "connect-src": ["'self'", "blob:", "https://unpkg.com", "*"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin access to resources
    crossOriginOpenerPolicy: false,
  }));
}

const allowedOrigins = [
  "https://silentium.vercel.app",
  "https://silentium-m9z8.onrender.com",
  "http://localhost:5173",
  "http://localhost:3000"
];

const corsOptions: cors.CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      origin.includes("vercel.app")
    ) {
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
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests for all routes explicitly with the same config
app.options("*", cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 2. Ensure DB connection for every request
app.use(asyncHandler(async (req: any, res: any, next: any) => {
  try {
    await ensureConnection();
  } catch (error: any) {
    console.error('Database connection failed:', error.message);
    return res.status(500).json({
      message: 'Database connection failed',
      error: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
  next();
}));

// Root route for health check
app.get('/', (req, res) => {
  const healthStatus = {
    success: true,
    status: 'ok', 
    message: 'Silentium API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    version: process.env.npm_package_version || 'unknown',
    render: {
      serviceId: process.env.RENDER_SERVICE_ID || 'not-on-render',
      instanceId: process.env.RENDER_INSTANCE_ID || 'not-on-render',
      externalUrl: process.env.RENDER_EXTERNAL_URL || 'not-on-render'
    },
    database: {
      connected: isConnected,
      uri: process.env.MONGO_URI ? 'configured' : 'not-configured'
    }
  };

  res.header('Content-Type', 'application/json').json(healthStatus);
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

// 3. Static Files (Cloudinary used for books, local disk for avatars/legacy)
const uploadsDir = process.env.UPLOADS_PATH || path.join(process.cwd(), 'uploads');
console.log('Uploads directory:', uploadsDir);

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Note: New uploads are stored in Cloudinary, local support removed for books.


// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);

app.get('/api/debug-ping', (req, res) => {
  console.log('[DEBUG] PING received');
  res.json({ pong: true, timestamp: new Date().toISOString() });
});

// Compatibility aliases
app.use('/api/user', authRoutes);
app.use('/api/documents', bookRoutes);

// 5. Frontend / Vite
const setupFrontend = async () => {
  // Log startup information for debugging
  console.log('=== Silentium Server Startup [FIX_VER: 1.0.8] ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Platform:', process.platform);
  console.log('Node Version:', process.version);
  console.log('Working Directory:', process.cwd());
  console.log('Render Service:', process.env.RENDER_SERVICE_ID || 'Not running on Render');
  console.log('Mongo URI configured:', !!process.env.MONGO_URI);
  console.log('JWT Secret configured:', !!process.env.JWT_SECRET);
  console.log('Cloudinary configured:', !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY));
  console.log('================================');

  // Global error handlers
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
  });

  if (isDev && !process.env.VERCEL) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite development server configured');
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
      console.log('Static files serving from:', distPath);
    } else {
      console.warn('Dist directory not found:', distPath);
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.status(404).json({ 
          success: false,
          message: 'The application is still initializing. Please wait a moment.',
          code: 'APP_NOT_READY'
        });
      });
    }
  }

  // Error Handler must be after ALL routes (including Vite middlewares)
  app.use(errorHandler);

  if (!process.env.VERCEL) {
    const PORT = Number(process.env.PORT) || 3000;
    const HOST = process.env.RENDER ? '0.0.0.0' : 'localhost';
    
    app.listen(PORT, HOST, () => {
      console.log(`=== Server Started Successfully ===`);
      console.log(`URL: http://${HOST}:${PORT}`);
      console.log(`Mode: ${isDev ? 'Development' : 'Production'}`);
      console.log(`Health check available at: http://${HOST}:${PORT}/`);
      console.log(`================================`);
    }).on('error', (err: any) => {
      console.error('Failed to start server:', err);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
      }
    });
  }
};

setupFrontend().catch((err) => {
  console.error('Fatal Initialization Error:', err);
});

export default app;
