import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import Author from '../models/Author';
import LoginLog from '../models/LoginLog';
import path from 'path';

const generateToken = (id: string, rememberMe: boolean = false) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: rememberMe ? '30d' : '24h',
  });
};

const validatePassword = (password: string) => {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
};

const getFullUrl = (req: Request, filePath: string | undefined) => {
  if (!filePath) return undefined;
  if (filePath.startsWith('http')) return filePath;

  let normalizedPath = filePath;
  if (path.isAbsolute(filePath)) {
    normalizedPath = `uploads/${path.basename(filePath)}`;
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/${normalizedPath.replace(/\\/g, '/').replace(/^\//, '')}`;
};

// @desc    Register a new user
export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role } = req.body;
    console.log(`Registration attempt: ${email}, role: ${role}`);

    if (!email || !password) {
      console.log('Registration failed: Email or password missing');
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    if (!validatePassword(password)) {
      console.log(`Registration failed: Password complexity check failed for ${email}`);
      return res.status(400).json({ message: 'Password must be at least 8 characters, include an uppercase letter, a number, and a special character.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log(`Registration failed: User already exists (${email})`);
      return res.status(400).json({ message: 'User already exists' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({
      email,
      passwordHash: password,
      role: role || 'reader',
      verificationToken,
      streak: 0,
      longestStreak: 0,
      lastLostStreak: 0
    });

    if (user) {
      console.log(`User created: ${user.email} (${user._id})`);
      if (user.role === 'author') {
        try {
          await Author.create({ userId: user._id as any });
          console.log(`Author profile created for: ${user.email}`);
        } catch (authorError) {
          console.error(`Failed to create author profile for ${user.email}:`, authorError);
          // We don't fail registration if author profile creation fails, but we log it
        }
      }

      res.status(201).json({
        _id: user._id,
        email: user.email,
        role: user.role,
        token: generateToken((user._id as any).toString()),
        message: 'Registration successful.'
      });
    } else {
      console.log('Registration failed: User creation returned null');
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    // Handle Mongoose duplicate key error specifically if it slips through findOne
    if (error.code === 11000) {
      const field = error.keyValue ? Object.keys(error.keyValue)[0] : 'resource';
      return res.status(400).json({ message: `${field} already exists` });
    }
    next(error);
  }
};

// @desc    Auth user & get token
export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, rememberMe } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];

    const user = await User.findOne({ email });

    if (!user) {
      await LoginLog.create({ email, status: 'failed', reason: 'User not found', ipAddress, userAgent });
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({ message: 'Account is temporarily locked. Try again later.' });
    }

    if (await user.matchPassword(password)) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      
      // --- Robust Streak Logic ---
      const now = new Date();
      const lastLogin = user.lastLogin;
      
      if (lastLogin) {
        const lastLoginDate = new Date(lastLogin);
        const isToday = now.toDateString() === lastLoginDate.toDateString();
        
        if (!isToday) {
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          const isYesterday = yesterday.toDateString() === lastLoginDate.toDateString();

          if (isYesterday) {
            user.streak += 1;
          } else {
            // Gap of more than 1 day
            if (user.streak > 0) {
              user.lastLostStreak = user.streak;
            }
            user.streak = 1;
          }
          
          if (user.streak > user.longestStreak) {
            user.longestStreak = user.streak;
          }
        }
      } else {
        // First login ever
        user.streak = 1;
        user.longestStreak = 1;
      }
      
      user.lastLogin = now;
      await user.save();

      await LoginLog.create({ userId: user._id as any, email, status: 'success', ipAddress, userAgent });

      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        streak: user.streak,
        longestStreak: user.longestStreak,
        lastLostStreak: user.lastLostStreak,
        token: generateToken((user._id as any).toString(), rememberMe),
      });
    } else {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await user.save();

      await LoginLog.create({ userId: user._id as any, email, status: 'failed', reason: 'Invalid password', ipAddress, userAgent });
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    next(error);
  }
};

// @desc    Forgot Password
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 1 * 60 * 60 * 1000);
      await user.save();
    }

    res.json({ message: 'If a user with that email exists, a reset link has been sent.' });
  } catch (error: any) {
    next(error);
  }
};

// @desc    Get user profile
export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById((req as any).user._id);
    if (user) {
      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        username: user.username,
        phone: user.phone,
        bio: user.bio,
        location: user.location,
        avatar: getFullUrl(req, user.avatar),
        notificationPreferences: user.notificationPreferences,
        streak: user.streak ?? 0,
        longestStreak: user.longestStreak ?? 0,
        lastLostStreak: user.lastLostStreak ?? 0,
        createdAt: user.createdAt,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    next(error);
  }
};

// @desc    Update user profile
export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById((req as any).user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Professional Dynamic Field Update
    const allowedFields = ['name', 'username', 'phone', 'bio', 'location'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        (user as any)[field] = req.body[field];
      }
    });

    if (req.file) {
      user.avatar = `uploads/${req.file.filename}`;
    }

    if (req.body.notificationPreferences) {
      try {
        const prefs = typeof req.body.notificationPreferences === 'string'
          ? JSON.parse(req.body.notificationPreferences)
          : req.body.notificationPreferences;

        user.notificationPreferences = {
          ...user.notificationPreferences,
          ...prefs
        };
      } catch (e) {
        console.error('Failed to parse notificationPreferences', e);
      }
    }

    if (req.body.password) {
      if (!validatePassword(req.body.password)) {
        return res.status(400).json({ message: 'New password must meet complexity requirements.' });
      }
      user.passwordHash = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name,
      username: updatedUser.username,
      phone: updatedUser.phone,
      bio: updatedUser.bio,
      location: updatedUser.location,
      avatar: getFullUrl(req, updatedUser.avatar),
      notificationPreferences: updatedUser.notificationPreferences,
      token: generateToken((updatedUser._id as any).toString()),
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Username already taken' });
    }
    next(error);
  }
};

// @desc    Delete user profile
export const deleteUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById((req as any).user._id);

    if (user) {
      if (user.role === 'author') {
        await Author.findOneAndDelete({ userId: user._id });
      }
      await User.findByIdAndDelete(user._id);
      res.json({ message: 'User removed successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error: any) {
    next(error);
  }
};
