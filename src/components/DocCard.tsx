import React from 'react';
import { BookOpen } from 'lucide-react';
import { motion } from 'motion/react';
import { Document } from '../types';
import { Link } from 'react-router-dom';

interface DocCardProps {
  doc: Document;
}

export const DocCard: React.FC<DocCardProps> = ({ doc }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Link to={`/reader/${doc.id}`} className="group block relative bg-white/5 border border-white/10 p-4 rounded-xl transition-all duration-500 hover:bg-white/10 hover:border-white/20">
        <div className="aspect-[3/4] bg-charcoal rounded-lg mb-4 overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700">
            <BookOpen size={64} strokeWidth={1} />
          </div>
          <div className="absolute bottom-4 left-4 right-4">
             <div className="h-1 w-0 bg-soft-white/20 group-hover:w-full transition-all duration-700" />
          </div>
        </div>
        <h3 className="text-soft-white font-light tracking-tight text-lg truncate">{doc.title}</h3>
        <div className="flex justify-between items-center mt-2">
          <p className="text-muted-gray text-[10px] uppercase tracking-[0.2em]">{doc.category}</p>
          <span className="text-muted-gray/40 text-[10px]">{doc.viewCount} views</span>
        </div>
      </Link>
    </motion.div>
  );
};
