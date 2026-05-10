import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Flame, Clock, Heart, X, BookOpen, User as UserIcon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BookCard } from '../components/BookCard';
import { Book, Category } from '../types';
import { API_BASE_URL } from '../config';
import { fetchJson } from '../lib/http';

export const Home: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'trending'>('latest');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryBooks, setCategoryBooks] = useState<Book[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, [category, sortBy]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('q', search);
      if (category !== 'All') queryParams.append('category', category);
      queryParams.append('sort', sortBy);
      
      const data = await fetchJson<{ books?: Book[] }>(`${API_BASE_URL}/api/books?${queryParams.toString()}`);
      setBooks(data.books || []);
    } catch (error) {
      console.error('Failed to fetch books', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryBooks = async (cat: Category) => {
    setLoadingCategory(true);
    setSelectedCategory(cat);
    try {
      const data = await fetchJson<{ books?: Book[] }>(`${API_BASE_URL}/api/books?category=${cat}&limit=6`);
      setCategoryBooks(data.books || []);
    } catch (error) {
      console.error('Failed to fetch category books', error);
    } finally {
      setLoadingCategory(false);
    }
  };

  const categories: Category[] = ['All', 'Legal', 'Academic', 'Technical', 'Research', 'Guides'];
  const subjectProgress = [
    { name: 'Legal', progress: 65, color: 'from-blue-500/20 to-indigo-500/20' },
    { name: 'Academic', progress: 42, color: 'from-purple-500/20 to-pink-500/20' },
    { name: 'Technical', progress: 88, color: 'from-emerald-500/20 to-teal-500/20' },
    { name: 'Research', progress: 12, color: 'from-orange-500/20 to-red-500/20' },
    { name: 'Guides', progress: 30, color: 'from-cyan-500/20 to-blue-500/20' },
  ];

  return (
    <div className="min-h-screen pt-32 px-6 md:px-12 pb-24 max-w-7xl mx-auto">
      {/* Hero / Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16 text-center md:text-left"
      >
        <h1 className="text-5xl md:text-7xl font-light mb-6 tracking-tighter text-soft-white">
          Explore the <span className="italic text-muted-gray">Silence.</span>
        </h1>
        <p className="text-muted-gray text-xs md:text-sm uppercase tracking-[0.4em] max-w-2xl leading-relaxed">
          Discover curated knowledge, minimalist stories, and architectural thoughts from the collective.
        </p>
      </motion.div>

      {/* Subject Progress Section */}
      <div className="mb-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-[10px] uppercase tracking-[0.5em] text-muted-gray mb-2 font-black">Your Learning Path</h2>
            <p className="text-xl font-light text-soft-white italic">Subject Progress</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {subjectProgress.map((subject, idx) => (
            <motion.div
              key={subject.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`p-8 rounded-[2.5rem] bg-ash/40 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${subject.color} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-muted-gray/60 group-hover:text-soft-white transition-colors">
                    Module {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-bold text-soft-white bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                    {subject.progress}%
                  </span>
                </div>
                
                <h3 className="text-2xl font-light text-soft-white mb-8 tracking-tight">{subject.name}</h3>
                
                <div className="space-y-6">
                  <div className="h-1 w-full bg-void rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.progress}%` }}
                      className="h-full bg-soft-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                    />
                  </div>
                  
                  <button 
                    onClick={() => fetchCategoryBooks(subject.name as Category)}
                    className="w-full py-4 bg-soft-white text-void rounded-full text-[9px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Learn
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Category Explorer Modal (Shows Book 1 to 6) */}
      <AnimatePresence>
        {selectedCategory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCategory(null)}
              className="absolute inset-0 bg-void/90 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl bg-ash border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-12 border-b border-white/5 flex justify-between items-center bg-void/20">
                <div>
                  <h2 className="text-4xl font-light text-soft-white tracking-tighter mb-2 italic">{selectedCategory} Mastery</h2>
                  <p className="text-[10px] uppercase tracking-[0.4em] text-muted-gray">Curated selection for your current level</p>
                </div>
                <button 
                  onClick={() => setSelectedCategory(null)}
                  className="p-3 bg-white/5 rounded-full text-muted-gray hover:text-soft-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
                {loadingCategory ? (
                  <div className="flex flex-col items-center justify-center py-24 gap-4">
                    <div className="w-12 h-12 border-2 border-soft-white border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-gray animate-pulse">Retrieving knowledge base...</p>
                  </div>
                ) : categoryBooks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {categoryBooks.map((book, i) => (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={book._id}
                        className="group bg-void/30 border border-white/5 rounded-[2rem] p-6 hover:border-white/20 transition-all flex gap-6"
                      >
                        <div className="w-24 h-32 bg-ash rounded-xl overflow-hidden shrink-0 shadow-2xl group-hover:scale-105 transition-transform">
                          {book.coverImage ? (
                            <img src={book.coverImage.startsWith('http') ? book.coverImage : `/${book.coverImage.replace(/\\/g, '/')}`} className="w-full h-full object-cover" alt={book.title} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><BookOpen size={24} className="text-white/5" /></div>
                          )}
                        </div>
                        <div className="flex flex-col justify-between py-2">
                          <div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-gray mb-1 block">Book {i + 1}</span>
                            <h4 className="text-lg font-light text-soft-white mb-2 leading-tight line-clamp-2">{book.title}</h4>
                          </div>
                          <Link 
                            to={`/reader/${book._id}`}
                            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-soft-white/60 hover:text-soft-white transition-colors"
                          >
                            Open Reader <ArrowRight size={12} />
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-24">
                    <p className="text-muted-gray text-xs uppercase tracking-[0.3em]">No books found in this category yet.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Filters & Search */}
      <div className="sticky top-24 z-40 bg-void/80 backdrop-blur-xl py-4 mb-12 border-b border-white/5">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-6 py-2 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold transition-all whitespace-nowrap ${
                  category === cat 
                    ? 'bg-soft-white text-void shadow-lg shadow-white/10' 
                    : 'bg-white/5 text-muted-gray hover:bg-white/10 hover:text-soft-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-gray/40" size={14} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search titles, tags..."
                className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2.5 text-soft-white text-xs focus:outline-none focus:border-white/20 transition-all placeholder:text-muted-gray/30"
              />
            </div>
            
            <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
              <button 
                onClick={() => setSortBy('latest')}
                className={`p-2 rounded-full transition-all ${sortBy === 'latest' ? 'bg-soft-white text-void' : 'text-muted-gray hover:text-soft-white'}`}
                title="Latest"
              >
                <Clock size={14} />
              </button>
              <button 
                onClick={() => setSortBy('trending')}
                className={`p-2 rounded-full transition-all ${sortBy === 'trending' ? 'bg-soft-white text-void' : 'text-muted-gray hover:text-soft-white'}`}
                title="Trending"
              >
                <Flame size={14} />
              </button>
              <button 
                onClick={() => setSortBy('popular')}
                className={`p-2 rounded-full transition-all ${sortBy === 'popular' ? 'bg-soft-white text-void' : 'text-muted-gray hover:text-soft-white'}`}
                title="Most Popular"
              >
                <Heart size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <BookCard key={i} book={{} as any} isSkeleton />
            ))
          ) : books.length > 0 ? (
            books.map((book) => (
              <BookCard key={book._id} book={book} onQuickView={(b) => setSelectedBook(b)} />
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="col-span-full py-24 text-center"
            >
              <p className="text-muted-gray text-xs uppercase tracking-[0.3em]">No content found matching your criteria.</p>
              <button 
                onClick={() => { setSearch(''); setCategory('All'); }}
                className="mt-4 text-soft-white underline underline-offset-4 text-xs tracking-widest hover:text-white"
              >
                Clear Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBook(null)}
              className="absolute inset-0 bg-void/90 backdrop-blur-xl"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-ash border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh]"
            >
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-6 right-6 z-10 p-2 bg-void/50 rounded-full text-muted-gray hover:text-soft-white transition-colors"
              >
                <X size={20} />
              </button>

              {/* Modal Left: Cover/Image */}
              <div className="w-full md:w-2/5 aspect-[3/4] md:aspect-auto bg-void relative">
                {selectedBook.coverImage ? (
                  <img 
                    src={selectedBook.coverImage.startsWith('http') ? selectedBook.coverImage : `/${selectedBook.coverImage.replace(/\\/g, '/')}`} 
                    className="w-full h-full object-cover opacity-60"
                    alt={selectedBook.title}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
                    <BookOpen size={64} className="text-white/5 mb-6" />
                    <p className="text-[10px] uppercase tracking-[0.4em] text-muted-gray/40 italic leading-relaxed">
                      "Words that echo in the silence of the mind."
                    </p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ash via-transparent to-transparent md:bg-gradient-to-r" />
              </div>

              {/* Modal Right: Content */}
              <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar bg-ash">
                <div className="mb-8">
                  <span className="px-3 py-1 bg-white/5 text-[10px] uppercase tracking-[0.3em] text-muted-gray rounded-full border border-white/10 mb-6 inline-block">
                    {selectedBook.category}
                  </span>
                  <h2 className="text-3xl md:text-4xl font-light text-soft-white tracking-tight mb-4 leading-tight">
                    {selectedBook.title}
                  </h2>
                  
                  <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden">
                        {selectedBook.author?.avatar ? (
                          <img src={selectedBook.author.avatar} alt={selectedBook.author.name} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon size={14} className="m-1 text-muted-gray" />
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-widest text-muted-gray font-medium">
                        {selectedBook.author?.name || 'Anonymous'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-gray/60">
                      <Clock size={12} /> {selectedBook.readingMinutes} min read
                    </div>
                  </div>
                </div>

                <div className="space-y-6 mb-12">
                  <p className="text-soft-white/70 leading-relaxed font-light text-sm italic">
                    "{selectedBook.description || 'No description provided for this work.'}"
                  </p>
                  
                  {selectedBook.content && (
                    <div className="relative">
                      <div className="text-muted-gray/60 text-xs leading-relaxed line-clamp-6">
                        {selectedBook.content}
                      </div>
                    </div>
                  )}

                  {!selectedBook.content && selectedBook.fileUrl && (
                    <div className="p-6 bg-void/50 rounded-2xl border border-white/5 flex items-center justify-between group cursor-pointer" onClick={() => setSelectedBook(null)}>
                      <Link to={`/reader/${selectedBook._id}`} className="flex items-center gap-4 w-full">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                          <BookOpen size={20} className="text-muted-gray" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-widest text-soft-white mb-0.5">Full Document Available</p>
                          <p className="text-[9px] text-muted-gray">PDF / Document Format</p>
                        </div>
                        <ArrowRight size={16} className="ml-auto text-muted-gray group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 sticky bottom-0 pt-6 bg-ash/80 backdrop-blur-md">
                  <Link 
                    to={`/reader/${selectedBook._id}`}
                    onClick={() => setSelectedBook(null)}
                    className="flex-1 py-4 bg-soft-white text-void rounded-full text-[10px] uppercase tracking-[0.4em] font-black hover:bg-white transition-all text-center flex items-center justify-center gap-2 shadow-xl shadow-white/5"
                  >
                    Enter Full Reader <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
