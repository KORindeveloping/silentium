import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.ts';

interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (typeof next !== 'function') {
    console.error('Fatal: next is not a function in protect middleware');
    return res.status(500).json({ message: 'Internal Server Error (next is not a function)' });
  }
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      req.user = await User.findById(decoded.id).select('-passwordHash');
      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
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
