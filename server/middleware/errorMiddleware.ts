import { Request, Response, NextFunction } from 'express';

const isDev = process.env.NODE_ENV !== 'production';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Ensure we don't crash the error handler itself
  try {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).header('Content-Type', 'application/json');

    console.error(`[Server Error] ${req.method} ${req.url}:`, err);

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
      return res.json({
        message: 'Validation failed',
        errors: Object.values(err.errors || {}).map((e: any) => e.message)
      });
    }

    // Mongoose Duplicate Key Error
    if (err.code === 11000) {
      const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'resource';
      return res.status(400).json({
        message: `${field} already exists (duplicate key error)`,
        field
      });
    }

    // JWT Errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token',
        error: 'Authentication failed'
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired',
        error: 'Authentication failed'
      });
    }

    // Default Error Response
    res.json({
      message: err.message || 'Internal Server Error',
      error: isDev ? err : undefined,
      stack: isDev ? err.stack : undefined,
    });
  } catch (fatalError) {
    console.error('Fatal Error in Error Handler:', fatalError);
    if (!res.headersSent) {
      res.status(500).header('Content-Type', 'application/json').json({ message: 'Internal Server Error' });
    }
  }
};
