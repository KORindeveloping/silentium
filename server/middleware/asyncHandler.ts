import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: any) => (req: Request, res: Response, next: NextFunction) => {
  return Promise.resolve(fn(req, res, next)).catch((err) => {
    console.log('AsyncHandler caught error. Type of next:', typeof next);
    if (typeof next === 'function') {
      next(err);
    } else {
      console.error('Fatal: next is not a function in asyncHandler', err);
    }
  });
};
