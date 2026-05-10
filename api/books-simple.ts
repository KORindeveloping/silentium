// Completely isolated API - no server dependencies
export default async function handler(req: any, res: any) {
  // Set headers first
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // Return simple mock data - no database, no imports
      const mockBooks = [
        {
          _id: '1',
          title: 'Test Book 1',
          description: 'A test book for Vercel deployment',
          category: 'Technology',
          author: { name: 'Test Author', _id: 'author1' },
          views: 100,
          likes: 5,
          createdAt: new Date().toISOString()
        },
        {
          _id: '2', 
          title: 'Test Book 2',
          description: 'Another test book',
          category: 'Science',
          author: { name: 'Demo Author', _id: 'author2' },
          views: 50,
          likes: 3,
          createdAt: new Date().toISOString()
        }
      ];

      return res.status(200).json({
        success: true,
        books: mockBooks,
        total: mockBooks.length,
        message: 'Vercel API working!'
      });
    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed'
      });
    }
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
}
