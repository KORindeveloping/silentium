import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { CheckCircle2, ArrowRight, BookOpen, LayoutDashboard, PlusCircle, Share2 } from 'lucide-react';

export const PublishSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bookId, title } = location.state || {};

  // Redirect if no bookId is present (e.g. direct access to URL)
  useEffect(() => {
    if (!bookId) {
      const timer = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timer);
    }
  }, [bookId, navigate]);

  if (!bookId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-void px-6">
        <div className="text-center space-y-4">
          <p className="text-muted-gray text-xs uppercase tracking-widest">No recent publication found.</p>
          <p className="text-soft-white text-sm font-light">Redirecting to home...</p>
        </div>
      </div>
    );
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/reader/${bookId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'New Book on Silentium',
          text: `Check out my new book "${title}" on Silentium!`,
          url: url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen pt-32 pb-24 px-6 flex flex-col items-center justify-center bg-void">
      <div className="max-w-2xl w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center space-y-12"
        >
          {/* Success Animation */}
          <div className="relative inline-block">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
              className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto border border-green-500/20"
            >
              <CheckCircle2 size={48} className="text-green-500" />
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.2 }}
              transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
              className="absolute inset-0 rounded-full border border-green-500/10 -z-10"
            />
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-light text-soft-white tracking-tight">
              Masterpiece Published.
            </h1>
            <p className="text-muted-gray text-sm uppercase tracking-[0.3em] font-medium max-w-md mx-auto leading-relaxed">
              Your work <span className="text-soft-white italic">"{title || 'Untitled'}"</span> is now part of the collective knowledge.
            </p>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
            <Link 
              to={`/reader/${bookId}`}
              className="group p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/5 hover:border-white/10 transition-all text-left flex flex-col justify-between h-48"
            >
              <div className="w-10 h-10 rounded-full bg-soft-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen size={20} className="text-soft-white" />
              </div>
              <div>
                <h3 className="text-soft-white text-xs uppercase tracking-widest mb-1">View Publication</h3>
                <p className="text-muted-gray text-[10px] leading-relaxed">Open the reader to see how your work appears to others.</p>
              </div>
            </Link>

            <Link 
              to="/dashboard"
              className="group p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/5 hover:border-white/10 transition-all text-left flex flex-col justify-between h-48"
            >
              <div className="w-10 h-10 rounded-full bg-soft-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <LayoutDashboard size={20} className="text-soft-white" />
              </div>
              <div>
                <h3 className="text-soft-white text-xs uppercase tracking-widest mb-1">Author Dashboard</h3>
                <p className="text-muted-gray text-[10px] leading-relaxed">Track views, engagement, and manage your library.</p>
              </div>
            </Link>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-8 border-t border-white/5">
            <button 
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-gray hover:text-soft-white transition-colors group"
            >
              <PlusCircle size={14} /> Publish Another
            </button>
            
            <button 
              onClick={handleShare}
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-muted-gray hover:text-soft-white transition-colors"
            >
              <Share2 size={14} /> Share Link
            </button>

            <Link 
              to="/"
              className="flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-soft-white hover:opacity-70 transition-opacity"
            >
              Explore Feed <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
