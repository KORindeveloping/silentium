import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './server/config/db.ts';

import authRoutes from './server/routes/authRoutes.ts';
import bookRoutes from './server/routes/bookRoutes.ts';
import analyticsRoutes from './server/routes/analyticsRoutes.ts';
import adminRoutes from './server/routes/adminRoutes.ts';
import paymentRoutes from './server/routes/paymentRoutes.ts';
import revenueRoutes from './server/routes/revenueRoutes.ts';
import userRoutes from './server/routes/userRoutes.ts';
import commentRoutes from './server/routes/commentRoutes.ts';
import { errorHandler } from './server/middleware/errorMiddleware.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Database connection management for Serverless
let isConnected = false;
const ensureConnection = async () => {
  if (isConnected) return;
  try {
    await connectDB();
    isConnected = true;
  } catch (err) {
    console.error('DB Connection Error:', err);
  }
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
app.use(async (req, res, next) => {
  await ensureConnection();
  next();
});

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

// 5. Frontend / Vite (Async part handled separately)
const setupFrontend = async () => {
  if (isDev && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Final Error Handler - Must be last
  app.use(errorHandler);

  if (!process.env.VERCEL) {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Professional server running at http://localhost:${PORT}`);
      console.log(`Mode: ${isDev ? 'Development' : 'Production'}`);
    });
  }
};

setupFrontend();

export default app;
