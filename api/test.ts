import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return res.json({
      success: true,
      message: 'Vercel API is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      query: req.query,
      headers: {
        'user-agent': req.headers['user-agent'],
        'host': req.headers['host']
      }
    });
  } catch (error: any) {
    console.error('Test API Error:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    });
  }
}
