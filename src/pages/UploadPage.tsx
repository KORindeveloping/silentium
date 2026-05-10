import React, { useState, useEffect, useRef } from 'react';
import { Upload as UploadIcon, FileText, X, AlertCircle, Image as ImageIcon, Eye, Lock, Globe, CheckCircle2, PenTool, Zap, BookOpen, Layers, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { AuthModal } from '../components/AuthModal';
import { pdfjs } from 'react-pdf';
import { API_BASE_URL } from '../config';
import { fetchJson } from '../lib/http';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const UploadPage: React.FC = () => {
  const [mode, setMode] = useState<'upload' | 'write'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Academic');
  const [tags, setTags] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await fetchJson<any>(`${API_BASE_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setUser(data);
        } catch (err) {
          localStorage.removeItem('token');
          console.error('Failed to fetch user', err);
        }
      }
    };
    fetchUser();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) setTitle(selectedFile.name.split('.')[0]);
      if (selectedFile.type === 'application/pdf') {
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processCover(selectedFile);
    }
  };

  const processCover = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image for the cover.');
      return;
    }
    setCoverImage(file);
    const url = URL.createObjectURL(file);
    setCoverPreview(url);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        processCover(selectedFile);
      } else if (mode === 'upload') {
        setFile(selectedFile);
        if (!title) setTitle(selectedFile.name.split('.')[0]);
      }
    }
  };

  const calculateReadingTime = () => {
    if (mode === 'write') {
      const words = description.trim().split(/\s+/).length;
      return Math.ceil(words / 200) || 1;
    }
    return 5; // Default for files unless we extract content
  };

  const handlePublish = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    if (!title) {
      setError('Title is required.');
      return;
    }

    if (mode === 'upload' && !file) {
      setError('Please upload a document file.');
      return;
    }

    if (mode === 'write' && !description) {
      setError('Please write some content.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    let actualPageCount = 0;
    if (file && file.type === 'application/pdf') {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument(arrayBuffer).promise;
        actualPageCount = pdf.numPages;
      } catch (err) {
        console.error('Failed to get page count', err);
      }
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('category', category);
    formData.append('tags', tags);
    formData.append('visibility', visibility);
    formData.append('pageCount', actualPageCount.toString());
    formData.append('readingMinutes', calculateReadingTime().toString());
    
    if (mode === 'write') {
      formData.append('content', description);
      formData.append('description', description.substring(0, 150) + '...');
    } else {
      formData.append('file', file as Blob);
      formData.append('description', 'Uploaded document.');
    }

    if (coverImage) {
      formData.append('coverImage', coverImage);
    }

    // Use XHR for progress tracking
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/books`, true);
    
    const token = localStorage.getItem('token');
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {
        const errorSnippet = xhr.responseText.substring(0, 100).replace(/<[^>]*>/g, '').trim();
        setError(`Server Response Error [${xhr.status}]: ${errorSnippet || 'Check MONGO_URI in environment settings.'}`);
        setIsUploading(false);
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        navigate('/publish-success', { state: { bookId: data._id, title: data.title } });
      } else {
        setError(data.message || 'Upload failed');
        setIsUploading(false);
      }
    };

    xhr.onerror = () => {
      setError('Network error occurred.');
      setIsUploading(false);
    };

    xhr.send(formData);
  };

  return (
    <div className="min-h-screen pt-32 px-6 md:px-12 pb-24 bg-void selection:bg-soft-white selection:text-void">
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={(token, userData) => {
          setUser(userData);
          setError('');
        }}
      />
      
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col md:flex-row justify-between items-end gap-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-soft-white/60 mb-2">
               <Sparkles size={16} className="text-yellow-400" />
               <span className="text-[10px] uppercase tracking-[0.4em] font-medium">Knowledge Foundry</span>
            </div>
            <h1 className="text-5xl font-extralight tracking-tighter text-soft-white">Create & Publish</h1>
            <p className="text-muted-gray tracking-widest uppercase text-[10px] opacity-70">Decentralize your expertise into the collective.</p>
          </div>
          
          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md">
            <button 
              onClick={() => setMode('upload')}
              className={`px-8 py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-500 ${mode === 'upload' ? 'bg-soft-white text-void shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-muted-gray hover:text-soft-white'}`}
            >
              Upload Artifact
            </button>
            <button 
              onClick={() => setMode('write')}
              className={`px-8 py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-500 ${mode === 'write' ? 'bg-soft-white text-void shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-muted-gray hover:text-soft-white'}`}
            >
              Transcribe Story
            </button>
          </div>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 p-4 bg-red-400/10 border border-red-400/20 rounded-2xl flex items-center gap-4 text-red-400 text-xs"
          >
            <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center shrink-0">
               <AlertCircle size={16} />
            </div>
            {error}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Input Area */}
          <div className="lg:col-span-7 space-y-10">
            
            {/* Title */}
            <div className="group space-y-3">
              <label className="text-[10px] uppercase tracking-[0.3em] text-muted-gray ml-1 group-focus-within:text-soft-white transition-colors">Manifest Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Legal Research Framework"
                className="w-full bg-ash border border-white/5 rounded-2xl px-8 py-5 text-soft-white focus:outline-none focus:border-white/20 transition-all placeholder:text-muted-gray/20 text-xl font-light tracking-tight"
              />
            </div>

            {/* Content Source */}
            <AnimatePresence mode="wait">
              {mode === 'upload' ? (
                <motion.div 
                  key="upload"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-3"
                >
                  <label className="text-[10px] uppercase tracking-[0.3em] text-muted-gray ml-1">Archive File</label>
                  {!file ? (
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-3xl p-20 text-center transition-all duration-700 bg-white/[0.01] group cursor-pointer ${isDragging ? 'border-soft-white bg-white/5 scale-[0.99]' : 'border-white/5 hover:border-white/20'}`}
                    >
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleFileChange}
                        accept=".pdf,.docx,.txt"
                      />
                      <div className="flex flex-col items-center">
                        <div className={`w-16 h-16 rounded-3xl bg-ash flex items-center justify-center mb-6 transition-all duration-700 ${isDragging ? 'rotate-12 scale-110 bg-soft-white' : 'group-hover:scale-110 group-hover:rotate-3'}`}>
                          <UploadIcon className={isDragging ? 'text-void' : 'text-muted-gray group-hover:text-soft-white'} size={24} />
                        </div>
                        <p className="text-soft-white font-light tracking-wide mb-2 text-lg">Transmit your document</p>
                        <p className="text-muted-gray text-[10px] tracking-widest uppercase opacity-40">PDF, DOCX, EPUB (MAX 50MB)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-white/10 rounded-3xl p-6 bg-white/[0.02] flex items-center justify-between group hover:border-white/20 transition-all">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-ash flex items-center justify-center">
                          <FileText className="text-soft-white" size={24} />
                        </div>
                        <div>
                          <p className="text-soft-white text-base font-light mb-1 truncate max-w-[250px]">{file.name}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-gray text-[10px] uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span className="w-1 h-1 rounded-full bg-white/10"></span>
                            <span className="text-muted-gray text-[10px] uppercase tracking-widest">{file.type.split('/')[1] || 'Document'}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => { setFile(null); setPreviewUrl(null); }} 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-muted-gray hover:text-white hover:bg-white/5 transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="write"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-3"
                >
                  <label className="text-[10px] uppercase tracking-[0.3em] text-muted-gray ml-1">Etheric Script</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="The ink of your mind flows here..."
                    className="w-full h-[450px] bg-ash border border-white/5 rounded-3xl px-8 py-8 text-soft-white focus:outline-none focus:border-white/20 transition-all resize-none font-serif text-lg leading-relaxed placeholder:text-muted-gray/10"
                  />
                  <div className="flex justify-end pr-4 opacity-50">
                    <span className="text-[10px] uppercase tracking-widest text-muted-gray">
                      {description.trim().split(/\s+/).filter(Boolean).length} Words
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.3em] text-muted-gray ml-1">Cognitive Branch</label>
                <div className="relative">
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-ash border border-white/5 rounded-2xl px-6 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all appearance-none cursor-pointer font-light tracking-wide"
                  >
                    {['Legal', 'Academic', 'Technical', 'Research', 'Guides', 'Creative', 'Finance', 'Medicine'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                     <Layers size={16} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-[0.3em] text-muted-gray ml-1">Access Protocol</label>
                <div className="flex bg-ash rounded-2xl p-1.5 border border-white/5">
                  <button
                    onClick={() => setVisibility('public')}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all duration-500 ${visibility === 'public' ? 'bg-white/10 text-soft-white' : 'text-muted-gray hover:text-soft-white'}`}
                  >
                    <Globe size={14} className={visibility === 'public' ? 'text-green-400' : ''} /> Public
                  </button>
                  <button
                    onClick={() => setVisibility('private')}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all duration-500 ${visibility === 'private' ? 'bg-white/10 text-soft-white' : 'text-muted-gray hover:text-soft-white'}`}
                  >
                    <Lock size={14} className={visibility === 'private' ? 'text-blue-400' : ''} /> Private
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.3em] text-muted-gray ml-1">Semantic Markers (Tags)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="legal, case-study, analysis"
                  className="w-full bg-ash border border-white/5 rounded-2xl px-8 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all placeholder:text-muted-gray/20 font-light"
                />
                <div className="mt-3 flex flex-wrap gap-2 px-1">
                  {tags.split(',').filter(t => t.trim()).map((tag, i) => (
                    <span key={i} className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-[9px] uppercase tracking-widest text-muted-gray">
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar / Preview */}
          <div className="lg:col-span-5 space-y-10">
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-[0.3em] text-muted-gray ml-1">Visual Identity (Cover)</label>
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`aspect-[3/4.2] rounded-[2rem] bg-ash border border-white/5 overflow-hidden relative group cursor-pointer transition-all duration-700 ${isDragging ? 'scale-95 border-soft-white shadow-[0_0_50px_rgba(255,255,255,0.1)]' : 'hover:border-white/20 shadow-2xl shadow-black/40'}`}
                onClick={() => document.getElementById('cover-upload')?.click()}
              >
                {coverPreview ? (
                  <motion.img 
                    initial={{ scale: 1.1, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    src={coverPreview} 
                    alt="Cover" 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 group-hover:opacity-60 transition-all duration-700 bg-gradient-to-br from-white/5 to-transparent">
                    <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-6">
                      <ImageIcon size={32} className="text-muted-gray" />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.4em] text-muted-gray">Affix Visual</p>
                  </div>
                )}
                
                {/* Overlay Controls */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col items-center justify-center gap-4 backdrop-blur-[2px]">
                   <div className="w-12 h-12 rounded-full bg-soft-white text-void flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-500 delay-75">
                      <PenTool size={20} />
                   </div>
                   <p className="text-[10px] uppercase tracking-[0.3em] text-white font-bold">{coverImage ? 'Change Image' : 'Click or Drop'}</p>
                </div>
                
                <input 
                  id="cover-upload"
                  type="file" 
                  className="hidden" 
                  onChange={handleCoverChange}
                  accept="image/*"
                />
              </div>
            </div>

            <div className="bg-white/5 rounded-3xl p-8 border border-white/5 backdrop-blur-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity">
                  <Zap size={40} className="text-yellow-400 fill-yellow-400" />
               </div>
               
               <h3 className="text-[10px] uppercase tracking-[0.4em] text-soft-white mb-6 flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400 fill-yellow-400" /> Contribution Metrics
               </h3>
               
               <ul className="space-y-4">
                 <li className={`flex items-center gap-4 text-[11px] uppercase tracking-widest transition-colors duration-500 ${title ? 'text-green-400' : 'text-muted-gray/40'}`}>
                   <div className={`w-1.5 h-1.5 rounded-full ${title ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-white/10'}`}></div>
                   Title Authenticated
                 </li>
                 <li className={`flex items-center gap-4 text-[11px] uppercase tracking-widest transition-colors duration-500 ${(mode === 'upload' && file) || (mode === 'write' && description) ? 'text-green-400' : 'text-muted-gray/40'}`}>
                   <div className={`w-1.5 h-1.5 rounded-full ${(mode === 'upload' && file) || (mode === 'write' && description) ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-white/10'}`}></div>
                   Knowledge Consumed
                 </li>
                 <li className="flex items-center gap-4 text-[11px] uppercase tracking-widest text-yellow-400 font-bold mt-6">
                   <div className="w-5 h-5 rounded-lg bg-yellow-400/20 flex items-center justify-center shrink-0">
                      <Sparkles size={10} className="fill-yellow-400" />
                   </div>
                   Earn 3 Energy Credits
                 </li>
               </ul>

               {/* Stats Preview */}
               <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                  <div className="text-center">
                     <p className="text-[9px] uppercase tracking-widest text-muted-gray mb-1">Estimated Read</p>
                     <p className="text-lg text-soft-white font-light flex items-center justify-center gap-2">
                        <BookOpen size={14} className="opacity-40" /> {calculateReadingTime()}m
                     </p>
                  </div>
                  <div className="text-center border-l border-white/5">
                     <p className="text-[9px] uppercase tracking-widest text-muted-gray mb-1">Page Count</p>
                     <p className="text-lg text-soft-white font-light flex items-center justify-center gap-2">
                        <Layers size={14} className="opacity-40" /> {mode === 'upload' ? 'Auto' : '1'}
                     </p>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               {isUploading && (
                 <div className="space-y-2">
                    <div className="flex justify-between text-[9px] uppercase tracking-widest text-muted-gray px-1">
                       <span>Transmitting...</span>
                       <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-[3px] bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-soft-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                       />
                    </div>
                 </div>
               )}
               
               <button 
                onClick={handlePublish}
                disabled={isUploading || !title || (mode === 'upload' && !file) || (mode === 'write' && !description)}
                className="group relative w-full py-6 bg-soft-white text-void rounded-[2rem] text-[11px] uppercase tracking-[0.5em] font-black hover:bg-white transition-all duration-700 hover:scale-[1.02] active:scale-[0.98] shadow-2xl disabled:opacity-20 disabled:scale-100 disabled:cursor-not-allowed overflow-hidden"
              >
                <span className="relative z-10 flex items-center justify-center gap-4">
                  {isUploading ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        <Zap size={18} className="fill-void" />
                      </motion.div>
                      Manifesting...
                    </>
                  ) : (
                    <>
                      Publish Artifact
                      <Sparkles size={16} className="group-hover:rotate-12 transition-transform duration-500" />
                    </>
                  )}
                </span>
                <motion.div 
                  initial={{ x: '-100%' }}
                  whileHover={{ x: '100%' }}
                  transition={{ duration: 1, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-void/5 to-transparent z-0"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
