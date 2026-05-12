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

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Not authorized, no token"
    });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = await User.findById(decoded.id).select('-passwordHash');
    
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    
    return next();
  } catch (error: any) {
    console.error('JWT Error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Not authorized, token expired' });
    }
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
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
