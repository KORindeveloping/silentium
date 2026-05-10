import { Request, Response, NextFunction } from 'express';

const isDev = process.env.NODE_ENV !== 'production';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Ensure we don't crash the error handler itself
  try {
    const statusCode =
      err?.statusCode ||
      err?.status ||
      (res.statusCode === 200 ? 500 : res.statusCode);
    res.status(statusCode).header('Content-Type', 'application/json');

    // Log errors with more context for production debugging
    const errorContext = {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      renderService: process.env.RENDER_SERVICE_ID || 'unknown'
    };

    console.error(`[Server Error] ${req.method} ${req.url}:`, {
      ...errorContext,
      error: err.message,
      stack: err.stack
    });

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(err.errors || {}).map((e: any) => e.message)
      });
    }

    // Mongoose Duplicate Key Error
    if (err.code === 11000) {
      const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'resource';
      return res.status(400).json({
        success: false,
        message: `${field} already exists`,
        field,
        code: 'DUPLICATE_KEY'
      });
    }

    // Mongoose Cast Error (Invalid ObjectId)
    if (err.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        field: err.path,
        value: err.value,
        code: 'INVALID_ID'
      });
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token expired',
        code: 'TOKEN_EXPIRED'
      });
    }

    // Database Connection Errors
    if (err.name === 'MongooseServerSelectionError') {
      return res.status(503).json({
        success: false,
        message: 'Database connection failed',
        code: 'DATABASE_ERROR'
      });
    }

    // Static file not found (e.g., missing uploads in ephemeral storage)
    if (err.code === 'ENOENT' || err.code === 'ENAMETOOLONG') {
      return res.status(404).json({
        success: false,
        message: 'File not found',
        code: 'FILE_NOT_FOUND'
      });
    }

    // Cloudinary/Upload Errors
    if (err.message?.includes('Cloudinary')) {
      return res.status(500).json({
        success: false,
        message: 'File upload service error',
        code: 'UPLOAD_ERROR'
      });
    }

    // Default Error Response
    const response: any = {
      success: false,
      message: err.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    };

    // Include debug info only in development
    if (isDev) {
      response.error = err;
      response.stack = err.stack;
    }

    res.json(response);
  } catch (fatalError) {
    console.error('Fatal Error in Error Handler:', fatalError);
    if (!res.headersSent) {
      res.status(500).header('Content-Type', 'application/json').json({ 
        success: false,
        message: 'Internal Server Error',
        code: 'FATAL_ERROR'
      });
    }
  }
};
