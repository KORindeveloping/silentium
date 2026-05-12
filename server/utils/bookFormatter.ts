import { Request } from 'express';

export const formatBookResponse = (req: Request, book: any) => {
  const b = book._doc || book;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  const getFullUrl = (relativePath: string | undefined) => {
    if (!relativePath) return undefined;
    if (relativePath.startsWith('http')) return relativePath;
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
    fileUrl: `${baseUrl}/api/books/${b._id}/file`, // Guaranteed Proxy URL
    fileType: b.fileUrl?.toLowerCase().endsWith('.pdf') || b.fileKey?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'other',
    fileKey: b.fileKey, // Optional: useful for debugging but safe
    content: b.content,
    pageCount: b.pageCount,
    views: b.views,
    likes: b.likes?.length || 0,
    isLiked: (req as any).user ? b.likes?.includes((req as any).user._id) : false,
    readingMinutes: b.readingMinutes,
    status: b.status,
    visibility: b.visibility,
    createdAt: b.createdAt,
  };
};
