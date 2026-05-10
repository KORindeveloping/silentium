import { VercelRequest, VercelResponse } from '@vercel/node';

// Books API handler - simplified for Vercel deployment
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

    const { method, query } = req;

    if (method === 'GET') {
      const pageSize = Number(query.limit) || 12;
      const page = Number(query.page) || 1;
      const sortBy = query.sort || 'latest';

      // Mock data for testing - remove database dependencies
      const books = [
        {
          _id: 'mock1',
          title: 'Sample Book 1',
          description: 'This is a sample book for testing',
          category: 'Research',
          tags: ['testing', 'sample'],
          author: {
            _id: 'author1',
            name: 'Test Author',
            email: 'test@example.com',
            avatar: null,
            credits: 100
          },
          coverImage: null,
          fileUrl: null,
          content: 'Sample content...',
          pageCount: 10,
          views: 42,
          likes: 0,
          readingMinutes: 5,
          status: 'published',
          visibility: 'public',
          createdAt: new Date().toISOString()
        },
        {
          _id: 'mock2',
          title: 'Sample Book 2',
          description: 'Another sample book for testing',
          category: 'Technology',
          tags: ['testing', 'demo'],
          author: {
            _id: 'author2',
            name: 'Demo Author',
            email: 'demo@example.com',
            avatar: null,
            credits: 50
          },
          coverImage: null,
          fileUrl: null,
          content: 'Demo content...',
          pageCount: 8,
          views: 28,
          likes: 0,
          readingMinutes: 3,
          status: 'published',
          visibility: 'public',
          createdAt: new Date().toISOString()
        }
      ];

      const total = 2;

      return res.json({ 
        success: true,
        books: books, 
        page, 
        pages: Math.ceil(total / pageSize), 
        total: total,
        source: 'mock'
      });
    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED'
      });
    }
  } catch (error: any) {
    console.error('Books API Error:', error);
    
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error',
      code: 'INTERNAL_ERROR'
    });
  }
}
