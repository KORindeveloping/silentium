import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (typeof next !== 'function') {
    console.error('Fatal: next is not a function in protect middleware');
    return res.status(500).json({ message: 'Internal Server Error (next is not a function)' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({
      message: "Not authorized, no valid token provided",
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Not authorized, user no longer exists in database. Your session may have been cleared if using in-memory storage.',
        code: 'USER_NOT_FOUND' 
      });
    }
    
    next();
  } catch (error: any) {
    console.error('JWT Error:', error.message, 'Token snippet:', token.substring(0, 10) + '...');
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Not authorized, invalid or malformed token',
        code: 'INVALID_TOKEN'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Not authorized, token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(401).json({ 
      message: 'Not authorized, token validation failed',
      code: 'AUTH_FAILED'
    });
  }
};

// Like protect, but doesn't block — attaches user if token is valid, continues regardless
// Also supports token via query parameter for PDF viewers that don't send headers
export const optionalProtect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log(`[DEBUG] Entering optionalProtect for: ${req.path}`);
  // Try header first, then query parameter
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(" ")[1] : req.query.token as string;
  
  if (token) {
    console.log(`[DEBUG] optionalProtect - Token found (first 10 chars): ${token.substring(0, 10)}`);
    try {
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = await User.findById(decoded.id).select('-passwordHash');
      console.log(`[DEBUG] optionalProtect - User found: ${!!req.user}`);
    } catch (err: any) {
      console.warn('[DEBUG] optionalProtect - Invalid token (proceeding as guest):', err.message);
    }
  } else {
    console.log('[DEBUG] optionalProtect - No token provided (proceeding as guest)');
  }
  next();
};

export const admin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (typeof next !== 'function') return res.status(500).json({ message: 'next is not a function' });
  if (req.user && req.user.role === 'admin') {
    return next();
  } else {
    return res.status(401).json({ message: 'Not authorized as an admin' });
  }
};

export const author = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (typeof next !== 'function') return res.status(500).json({ message: 'next is not a function' });
  if (req.user && (req.user.role === 'author' || req.user.role === 'admin')) {
    return next();
  } else {
    return res.status(401).json({ message: 'Not authorized as an author' });
  }
};
