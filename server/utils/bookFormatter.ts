import { Request } from 'express';

export const formatBookResponse = (req: Request, book: any) => {
  const b = book._doc || book;
  // Force HTTPS in production (Render terminates TLS at load balancer, so req.protocol is 'http')
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
  const baseUrl = `${protocol}://${req.get('host')}`;
  
  const getFullUrl = (relativePath: string | undefined) => {
    if (!relativePath) return undefined;
    // Force upgrade any http:// URL to https://
    if (relativePath.startsWith('http://')) {
      return relativePath.replace('http://', 'https://');
    }
    if (relativePath.startsWith('https://')) return relativePath;
    return `${baseUrl}/${relativePath.replace(/\\/g, '/').replace(/^\//, '')}`;
  };

  return {
    _id: b._id,
    title: b.title,
    description: b.description,
    category: b.category,
    tags: b.tags,
    author: b.authorId ? {
      _id: b.authorId._id || b.authorId,
      name: b.authorId.name || b.authorId.email?.split('@')[0] || 'Unknown',
      avatar: getFullUrl(b.authorId.avatar),
      credits: b.authorId.credits
    } : undefined,
    coverImage: getFullUrl(b.coverImage),
    // Proxy URL only — never expose raw storage URLs
    fileUrl: `${baseUrl}/api/books/${b._id}/file`,
    fileType: (b.fileUrl && typeof b.fileUrl === 'string' && b.fileUrl.toLowerCase().endsWith('.pdf')) || 
              (b.fileKey && typeof b.fileKey === 'string' && b.fileKey.toLowerCase().endsWith('.pdf')) 
              ? 'pdf' : 'other',
    // fileKey intentionally omitted — internal storage detail, never expose to client
    content: b.content,
    pageCount: b.pageCount,
    views: b.views,
    likes: b.likes?.length || 0,
    isLiked: ((req as any).user && b.likes) 
      ? b.likes.some((id: any) => id.toString() === (req as any).user._id.toString()) 
      : false,
    readingMinutes: b.readingMinutes,
    status: b.status,
    visibility: b.visibility,
    createdAt: b.createdAt,
  };
};
