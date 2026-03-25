import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Book, Edit2, Trash2, Eye, Heart, MoreVertical, Search, Plus, Archive, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Book as BookType } from '../types';

export const Library: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'published' | 'draft' | 'archived'>('published');
  const [books, setBooks] = useState<BookType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLibrary();
  }, [activeTab]);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const userRes = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
      if (userRes.status === 401) {
        localStorage.removeItem('token');
        setLoading(false);
        return;
      }
      if (!userRes.ok) throw new Error('Auth failed');
      const userData = await userRes.json();
      
      const res = await fetch(`/api/books?authorId=${userData._id}&status=${activeTab}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setBooks(data.books || []);
    } catch (error) {
      console.error('Failed to fetch library', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/books/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setBooks(books.filter(b => b._id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error('Failed to delete book', error);
    }
  };

  const filteredBooks = books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen pt-32 px-6 md:px-12 pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-light mb-4 tracking-tight text-soft-white">My Library</h1>
          <p className="text-muted-gray tracking-widest uppercase text-[10px]">Manage your published works and drafts.</p>
        </div>
        <button 
          onClick={() => navigate('/upload')}
          className="px-8 py-3 bg-soft-white text-void rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white transition-all flex items-center gap-2"
        >
          <Plus size={14} /> New Content
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row gap-6 mb-8 border-b border-white/5 pb-4">
        <div className="flex gap-4">
          {(['published', 'draft', 'archived'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 text-[10px] uppercase tracking-[0.2em] font-bold transition-all relative ${activeTab === tab ? 'text-soft-white' : 'text-muted-gray hover:text-soft-white'}`}
            >
              {tab}
              {activeTab === tab && <motion.div layoutId="tabLine" className="absolute bottom-0 left-0 right-0 h-0.5 bg-soft-white" />}
            </button>
          ))}
        </div>
        
        <div className="md:ml-auto relative w-full md:w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-gray/40" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library..."
            className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-soft-white text-xs focus:outline-none focus:border-white/20 transition-all placeholder:text-muted-gray/30"
          />
        </div>
      </div>

      {/* Content List */}
      <div className="space-y-4">
        <AnimatePresence>
          {loading ? (
             <div className="text-center py-20 text-muted-gray text-xs uppercase tracking-widest">Loading library...</div>
          ) : filteredBooks.length > 0 ? (
            filteredBooks.map((book) => (
              <motion.div
                key={book._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-ash/50 border border-white/5 hover:border-white/10 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 transition-all"
              >
                {/* Thumbnail */}
                <div className="w-16 h-20 bg-charcoal rounded-lg overflow-hidden shrink-0">
                  {book.coverImage ? (
                    <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10">
                      <Book size={24} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-3 mb-1">
                     <h3 className="text-soft-white font-medium truncate">{book.title}</h3>
                     <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-widest border ${
                       book.status === 'published' ? 'border-green-500/20 text-green-500' : 
                       book.status === 'draft' ? 'border-yellow-500/20 text-yellow-500' : 'border-gray-500/20 text-gray-500'
                     }`}>
                       {book.status}
                     </span>
                   </div>
                   <p className="text-muted-gray text-xs truncate max-w-md">{book.description}</p>
                   <div className="flex items-center gap-6 mt-3 text-[10px] text-muted-gray uppercase tracking-widest">
                     <span className="flex items-center gap-1.5"><Eye size={12} /> {book.views}</span>
                     <span className="flex items-center gap-1.5"><Heart size={12} /> {book.likes}</span>
                     <span>{new Date(book.createdAt).toLocaleDateString()}</span>
                   </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-white/10 rounded-full text-muted-gray hover:text-soft-white transition-colors" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setDeleteId(book._id)}
                    className="p-2 hover:bg-red-500/10 rounded-full text-muted-gray hover:text-red-400 transition-colors" 
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                  <Link to={`/reader/${book._id}`} className="p-2 hover:bg-white/10 rounded-full text-muted-gray hover:text-soft-white transition-colors" title="View">
                    <Eye size={16} />
                  </Link>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-24 border border-dashed border-white/10 rounded-2xl">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'draft' ? <FileText className="text-muted-gray" /> : activeTab === 'archived' ? <Archive className="text-muted-gray" /> : <Book className="text-muted-gray" />}
              </div>
              <p className="text-muted-gray text-xs uppercase tracking-widest">No {activeTab} content found.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-void/90 backdrop-blur-sm"
              onClick={() => setDeleteId(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-ash border border-white/10 rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500" size={24} />
              </div>
              <h3 className="text-xl text-soft-white mb-2">Delete Content?</h3>
              <p className="text-muted-gray text-xs mb-8">This action cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 bg-white/5 rounded-full text-[10px] uppercase tracking-widest hover:bg-white/10 text-soft-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 bg-red-500 rounded-full text-[10px] uppercase tracking-widest hover:bg-red-600 text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
