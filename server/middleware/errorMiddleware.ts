import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.log('ErrorHandler reached. Error:', err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Log the error for admin tracking
  console.error(`[Error Details] ${req.method} ${req.url}:`);
  console.error(err); // This should print the stack trace

  // Handle common Mongoose/DB errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e: any) => e.message)
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      message: 'Resource already exists (duplicate key error)',
      field: Object.keys(err.keyValue)[0]
    });
  }

  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};
