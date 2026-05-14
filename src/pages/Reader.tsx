import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Document as DocType, User } from '../types';
import { ArrowLeft, Bookmark, Share2, Maximize2, Lock, Upload, Zap, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const Reader: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DocType | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [error, setError] = useState<string | null>(null);

  const PREVIEW_LIMIT = 3;
  const [isLocked, setIsLocked] = useState(false);
  const showBlur = isLocked && currentPage >= PREVIEW_LIMIT;

  const { user: authUser, token } = useAuth();

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/books/${id}`)
      .then(res => res.json())
      .then(data => {
        setDoc(data);
        const isOwner = authUser && data.authorId && (authUser._id === data.authorId);
        const isAdmin = authUser?.role === 'admin';
        const hasCredits = authUser && authUser.credits > 0;
        setIsLocked(!authUser || (!hasCredits && !isAdmin && !isOwner));
        
        // Pre-fetch PDF as blob for cleaner PDF.js loading
        if (data.fileType === 'pdf') {
          const fileUrl = `${API_BASE_URL}/api/books/${id}/file${token ? `?token=${token}` : ''}`;
          console.log(`[DEBUG] Reader fetching PDF from: ${fileUrl}`);
          fetch(fileUrl, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          })
          .then(async res => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const blob = await res.blob();
            setPdfUrl(URL.createObjectURL(blob));
          })
          .catch(err => {
            console.error('[DEBUG] Reader PDF fetch failed:', err);
            setError(`Failed to load PDF: ${err.message}`);
          });
        }
      });

    const interval = setInterval(() => {
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        fetch(`${API_BASE_URL}/api/analytics/track`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}` 
          },
          body: JSON.stringify({ bookId: id, minutes: 0.5 })
        }).catch((err) => console.warn('Analytics tracking failed:', err));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [id, authUser, token]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error('PDF Load Error:', error);
    let friendlyMessage = error.message;
    
    if (error.message.includes('structure') || error.message.includes('Invalid PDF')) {
      friendlyMessage = 'The file is not a valid PDF or is corrupted. Please ensure you uploaded a proper .pdf file.';
    } else if (error.message.includes('fetch') || error.message.includes('401') || error.message.includes('403')) {
      friendlyMessage = 'Authentication error accessing PDF. The file may not be publicly accessible. Please try refreshing or contact support.';
    } else if (error.message.includes('404')) {
      friendlyMessage = 'PDF file not found. It may have been moved or deleted.';
    } else if (error.message.includes('network') || error.message.includes('NetworkError')) {
      friendlyMessage = 'Network error while fetching PDF. Check your internet connection and try again.';
    } else if (error.message.includes('CORS')) {
      friendlyMessage = 'CORS error accessing PDF. The file server may not allow cross-origin requests.';
    } else {
      friendlyMessage = `Failed to load PDF: ${error.message}`;
    }
    
    setError(friendlyMessage);
  }

  const handleNextPage = () => {
    if (currentPage < numPages) {
      if (isLocked && currentPage >= PREVIEW_LIMIT) return;
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!doc) return <div className="min-h-screen flex items-center justify-center text-muted-gray tracking-widest bg-void">Loading...</div>;

  return (
    <div className={`min-h-screen bg-void transition-all duration-700 ${isFullscreen ? 'p-0' : 'pt-24 px-6 md:px-12'}`}>
      {!isFullscreen && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-7xl mx-auto mb-8 flex justify-between items-center"
        >
          <Link to="/" className="flex items-center gap-2 text-muted-gray hover:text-soft-white transition-colors group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs uppercase tracking-widest">Back to library</span>
          </Link>
          <div className="flex items-center gap-8">
             {user && (
               <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
                 <Zap size={14} className="text-yellow-400 fill-yellow-400" />
                 <span className="text-[10px] uppercase tracking-widest font-bold text-soft-white">{user.credits} Credits</span>
               </div>
             )}
            <div className="flex gap-6">
              <button className="text-muted-gray hover:text-soft-white transition-colors"><Bookmark size={18} /></button>
              <button className="text-muted-gray hover:text-soft-white transition-colors"><Share2 size={18} /></button>
            </div>
          </div>
        </motion.div>
      )}

      <div className={`max-w-4xl mx-auto relative group ${isFullscreen ? 'h-screen w-full' : 'mb-12'}`}>
        
        {/* PDF Viewer Container */}
        <div className={`bg-charcoal rounded-2xl border border-white/5 overflow-hidden transition-all duration-500 shadow-2xl relative ${showBlur ? 'max-h-[80vh]' : ''}`}>
          {doc.fileType === 'pdf' ? (
            <div className="flex flex-col items-center py-8 min-h-[600px] relative">
              {pdfUrl ? (
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={<div className="text-muted-gray animate-pulse p-20 uppercase tracking-[0.5em] text-[10px]">Initializing Reader...</div>}
                  error={
                    <div className="text-center p-20">
                      <p className="text-red-400 uppercase tracking-widest text-xs mb-4">Failed to load PDF</p>
                      <p className="text-muted-gray text-[10px] max-w-xs mx-auto mb-6">{error || 'Unknown error occurred while loading the document.'}</p>
                      <div className="flex gap-4 justify-center">
                        <button 
                          onClick={() => window.location.reload()}
                          className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                          Retry
                        </button>
                      </div>
                    </div>
                  }
                  className="shadow-2xl"
                >
                  <Page 
                    pageNumber={currentPage} 
                    scale={scale} 
                    renderAnnotationLayer={false}
                    renderTextLayer={true}
                    className="transition-opacity duration-300"
                  />
                </Document>
              ) : (
                <div className="text-muted-gray animate-pulse p-20 uppercase tracking-[0.5em] text-[10px]">
                  {error ? 'Error loading document...' : 'Fetching document...'}
                </div>
              )}


              {/* Blur Overlay & Growth Hook */}
              <AnimatePresence>
                {showBlur && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-void/40 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center z-20"
                  >
                    <div className="w-20 h-20 bg-soft-white/10 rounded-full flex items-center justify-center mb-8 border border-white/10">
                      <Lock size={32} className="text-soft-white" />
                    </div>
                    <h2 className="text-3xl font-light mb-4 tracking-tight text-soft-white">The rest is for the collective.</h2>
                    <p className="text-muted-gray max-w-md mb-10 leading-relaxed">
                      This document is {numPages} pages long. To unlock the full content, contribute to our library or use your credits.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                      <button 
                        onClick={() => navigate('/upload')}
                        className="flex-1 py-4 bg-soft-white text-void rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-white transition-all flex items-center justify-center gap-2 group"
                      >
                        <Upload size={14} className="group-hover:-translate-y-1 transition-transform" />
                        Give to Get
                      </button>
                      <button 
                        className="flex-1 py-4 bg-void border border-white/10 text-soft-white rounded-full text-[10px] uppercase tracking-[0.3em] font-black hover:bg-white/5 transition-all flex items-center justify-center gap-2 group"
                      >
                        <Zap size={14} className="text-yellow-400 fill-yellow-400 group-hover:scale-125 transition-transform" />
                        Unlock (1 Credit)
                      </button>
                    </div>
                    
                    <p className="mt-8 text-[10px] text-muted-gray uppercase tracking-widest">
                      Already have a premium account? <button className="text-soft-white underline">Sign In</button>
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="p-12 md:p-24 max-w-3xl mx-auto">
              <h1 className="text-4xl font-light mb-8 tracking-tight text-center text-soft-white">{doc.title}</h1>
              <div className="prose prose-invert max-w-none">
                <div className="text-soft-white/80 leading-[1.8] text-lg font-light whitespace-pre-wrap">
                  {doc.content || 'No content available.'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Page Controls */}
        {!showBlur && numPages > 1 && (
          <div className="fixed bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-void/80 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 shadow-2xl z-10">
            <button 
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="text-muted-gray hover:text-soft-white disabled:opacity-20 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-soft-white min-w-[100px] text-center">
              Page {currentPage} <span className="text-muted-gray/40">of</span> {numPages}
            </span>
            <button 
              onClick={handleNextPage}
              disabled={currentPage === numPages}
              className="text-muted-gray hover:text-soft-white disabled:opacity-20 transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}

        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="absolute bottom-6 right-6 p-3 bg-void/80 backdrop-blur-md rounded-full border border-white/10 text-muted-gray hover:text-soft-white hover:scale-110 transition-all opacity-0 group-hover:opacity-100 z-10"
        >
          <Maximize2 size={20} />
        </button>
      </div>

      {!isFullscreen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="max-w-5xl mx-auto mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 pb-24"
        >
          <div className="col-span-2">
            <h2 className="text-xl font-light mb-4 tracking-tight">About this document</h2>
            <p className="text-muted-gray leading-relaxed font-light">
              {doc.description || "No description available for this document."}
            </p>
          </div>
          <div className="space-y-6">
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.3em] text-muted-gray mb-2">Details</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-muted-gray/60">Category</span>
                  <span>{doc.category}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-muted-gray/60">Views</span>
                  <span>{doc.views}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 py-2">
                  <span className="text-muted-gray/60">Pages</span>
                  <span>{numPages || doc.pageCount || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
