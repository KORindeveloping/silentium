import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Database connection management for Serverless
let isConnected = false;
let connectionPromise: Promise<void> | null = null;

const ensureConnection = async () => {
  if (isConnected) return;
  // Reuse an in-flight connection attempt to avoid race conditions
  if (!connectionPromise) {
    connectionPromise = connectDB()
      .then(() => { isConnected = true; })
      .catch((err) => {
        connectionPromise = null; // Allow retry on next request
        console.error('DB Connection Error:', err);
        throw err;
      });
  }
  return connectionPromise;
};

const isDev = process.env.NODE_ENV !== 'production';

// 1. Security & Body Parsing (Synchronous)
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
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:", "https://*"],
        "frame-src": ["'self'", "blob:"],
        "object-src": ["'self'", "blob:"],
        "connect-src": ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
}

app.use(cors());
app.use(express.json());

// 2. Ensure DB connection for every request
app.use(asyncHandler(async (req: any, res: any, next: any) => {
  await ensureConnection();
  next();
}));

// 3. Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    if (path.extname(filePath).toLowerCase() === '.pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
    }
  }
}));
// 4. API Routes (Synchronous Registration)
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

// Register Error Handler synchronously after API routes
app.use(errorHandler);

import fs from 'fs';

// ... rest of imports ...

// 5. Frontend / Vite (Async part handled separately)
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
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('Production build directory "dist" not found. Falling back to API only mode.');
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.status(404).json({ message: 'The application is still initializing. Please wait a moment.' });
      });
    }
  }

  if (!process.env.VERCEL) {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Professional server running at http://localhost:${PORT}`);
      console.log(`Mode: ${isDev ? 'Development' : 'Production'}`);
    });
  }
};

(async () => {
  try {
    await setupFrontend();
  } catch (err) {
    console.error('Fatal Initialization Error:', err);
  }
})();

export default app;
