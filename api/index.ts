// Fresh minimal API for online deployment
export default async function handler(req: any, res: any) {
  // Set headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { url } = req;
    
    if (url.includes('/api/books')) {
      // Books endpoint
      const books = [
        {
          _id: '1',
          title: 'Online Book 1',
          description: 'This book is accessible online',
          category: 'Technology',
          author: { name: 'Online Author', _id: 'author1' },
          views: 150,
          likes: 10,
          createdAt: new Date().toISOString()
        },
        {
          _id: '2',
          title: 'Online Book 2', 
          description: 'Another online accessible book',
          category: 'Science',
          author: { name: 'Web Author', _id: 'author2' },
          views: 200,
          likes: 15,
          createdAt: new Date().toISOString()
        }
      ];

      return res.status(200).json({
        success: true,
        books: books,
        total: books.length,
        message: 'Online API working!',
        deployed: new Date().toISOString()
      });
    }

    // Default response
    return res.status(200).json({
      success: true,
      message: 'Silentium API is online',
      timestamp: new Date().toISOString(),
      endpoint: url
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal Server Error'
    });
  }
}
