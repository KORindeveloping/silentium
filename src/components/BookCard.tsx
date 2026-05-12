import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Book as BookType } from '../types';
import { Clock, Eye, Heart, Bookmark, User as UserIcon, BookOpen, Share2, FileText } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface BookCardProps {
  book: BookType;
  isSkeleton?: boolean;
  onQuickView?: (book: BookType) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, isSkeleton, onQuickView }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (isSkeleton) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden animate-pulse">
        <div className="aspect-[3/4] bg-white/5" />
        <div className="p-4 space-y-3">
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const coverImageUrl = book.coverImage 
    ? (book.coverImage.startsWith('http') ? book.coverImage : `${API_BASE_URL}/${book.coverImage.replace(/\\/g, '/')}`)
    : null;

  const isPDF = book.fileType === 'pdf';
  const proxyFileUrl = `${API_BASE_URL}/api/books/${book._id}/file`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group relative h-full flex flex-col"
    >
      <div className="relative aspect-[3/4] bg-ash rounded-xl overflow-hidden border border-white/5 shadow-2xl transition-all duration-500 group-hover:shadow-soft-white/10 group-hover:-translate-y-2">
        {/* Cover Image or Live PDF Preview */}
        {coverImageUrl ? (
          <img 
            src={coverImageUrl} 
            alt={book.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : isPDF ? (
          <div className="w-full h-full bg-charcoal p-12 flex flex-col items-center justify-center text-center relative group-hover:bg-charcoal/80 transition-colors">
             <FileText size={48} className="text-soft-white/10 mb-4 group-hover:scale-110 transition-transform duration-500" />
             <p className="text-[10px] uppercase tracking-[0.3em] text-muted-gray/40">PDF Document</p>
             <div className="absolute bottom-4 right-4 bg-void/80 backdrop-blur-md p-1.5 rounded-lg border border-white/10 shadow-xl">
                <FileText size={14} className="text-soft-white" />
             </div>
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ash to-void p-6 flex flex-col items-center justify-center text-center relative">
             <BookOpen size={40} className="text-white/5 mb-6 group-hover:scale-110 transition-transform duration-500" />
             <div className="space-y-4">
               <h4 className="text-soft-white/40 font-light text-[10px] italic line-clamp-4 leading-relaxed px-2 uppercase tracking-widest">
                 {book.description || "A Silentium collective work exploring the depths of silence."}
               </h4>
             </div>
          </div>
        )}

        {/* Professional Overlay Interface */}
        <div className={`absolute inset-0 bg-void/90 backdrop-blur-md flex flex-col items-center justify-center p-6 gap-3 transition-all duration-500 ${isHovered ? 'opacity-100' : 'opacity-0 translate-y-4'}`}>
          <div className="text-center space-y-2 mb-4">
            <p className="text-[8px] uppercase tracking-[0.4em] text-muted-gray">Document Preview</p>
            <p className="text-soft-white/90 text-[11px] leading-relaxed line-clamp-4 font-light italic px-2">
              "{book.description || (book.content ? book.content.substring(0, 100) + '...' : 'This publication is now available for reading.')}"
            </p>
          </div>

          <div className="w-full space-y-2">
            <Link 
              to={`/reader/${book._id}`}
              className="w-full py-3 bg-soft-white text-void rounded-full text-[10px] uppercase tracking-[0.4em] font-black hover:bg-white transition-all text-center flex items-center justify-center gap-2 group/btn shadow-lg"
            >
              Enter Reader
            </Link>
            
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickView?.(book); }}
              className="w-full py-3 bg-white/5 border border-white/10 text-soft-white rounded-full text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-white/10 transition-all text-center"
            >
              Quick Preview
            </button>
          </div>
          
          <div className="flex gap-4 mt-2">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-soft-white text-[8px] uppercase tracking-widest border border-white/5">
              <Heart size={14} fill={book.isLiked ? "currentColor" : "none"} className={book.isLiked ? "text-red-500" : ""} /> {book.likes || 0}
            </button>
            <button className="p-1.5 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-soft-white border border-white/5">
              <Bookmark size={14} />
            </button>
          </div>
        </div>

        {/* Floating Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          <span className="px-3 py-1 bg-void/80 backdrop-blur-md text-[8px] uppercase tracking-widest text-soft-white rounded-full border border-white/10">
            {book.category}
          </span>
        </div>
      </div>

      {/* Primary Metadata */}
      <div className="mt-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-soft-white font-medium tracking-tight text-base leading-tight line-clamp-2 group-hover:text-white transition-colors">
            {book.title}
          </h3>
          <span className="text-[9px] text-muted-gray uppercase tracking-widest whitespace-nowrap ml-4 flex items-center gap-1.5">
            <Clock size={10} /> {book.readingMinutes}m
          </span>
        </div>
        
        <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-ash overflow-hidden border border-white/5">
              {book.author?.avatar ? (
                <img src={book.author.avatar} alt={book.author.name} className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={10} className="m-1 text-muted-gray/50" />
              )}
            </div>
            <span className="text-[9px] uppercase tracking-widest text-muted-gray/60 truncate max-w-[100px]">
              {book.author?.name || 'Anonymous'}
            </span>
          </div>
          
          <div className="flex items-center gap-3 text-[9px] text-muted-gray/30">
            <span className="flex items-center gap-1"><Eye size={12} /> {book.views}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
