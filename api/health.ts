import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always set JSON content type first
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Simple health check response
    return res.status(200).json({
      success: true,
      message: 'Vercel API is working',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      environment: {
        vercel: !!process.env.VERCEL,
        nodeEnv: process.env.NODE_ENV,
        mongoUri: !!process.env.MONGO_URI,
        jwtSecret: !!process.env.JWT_SECRET
      }
    });
  } catch (error: any) {
    // Always return JSON error response
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}
