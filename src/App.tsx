import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Reader } from './pages/Reader';
import { UploadPage as Upload } from './pages/UploadPage';
import { PublishSuccess } from './pages/PublishSuccess';
import { AuthorDashboard } from './pages/AuthorDashboard';
import { AdminPanel } from './pages/AdminPanel';
import { Profile } from './pages/Profile';
import { Library } from './pages/Library';
import { motion, AnimatePresence } from 'motion/react';
import { Library as LibraryIcon, Search, Plus, User } from 'lucide-react';
import AuthContext, { useAuth } from './contexts/AuthContext';

const Navbar = () => {
  const location = useLocation();
  
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 md:px-12 py-8 bg-void/80 backdrop-blur-md border-b border-white/5">
      <Link to="/" className="text-xl tracking-tighter font-semibold italic text-soft-white hover:opacity-80 transition-opacity">
        Silentium
      </Link>
      
      <div className="flex gap-8 md:gap-12 text-[10px] text-muted-gray uppercase tracking-[0.3em] font-medium">
        <Link to="/" className={`hover:text-white transition-colors ${location.pathname === '/' ? 'text-white' : ''}`}>Explore</Link>
        <Link to="/upload" className={`hover:text-white transition-colors ${location.pathname === '/upload' ? 'text-white' : ''}`}>Publish</Link>
        <Link to="/dashboard" className={`hover:text-white transition-colors ${location.pathname === '/dashboard' ? 'text-white' : ''}`}>Dashboard</Link>
        <Link to="/admin" className={`hover:text-white transition-colors ${location.pathname === '/admin' ? 'text-white' : ''}`}>Admin</Link>
        <Link to="/library" className={`hover:text-white transition-colors ${location.pathname === '/library' ? 'text-white' : ''}`}>Library</Link>
        <Link to="/profile" className={`hover:text-white transition-colors ${location.pathname === '/profile' ? 'text-white' : ''}`}>Profile</Link>
      </div>
    </nav>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <AuthContext.Provider>
      <Router>
        <div className="min-h-screen bg-void selection:bg-white/20">
          <Navbar />
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/reader/:id" element={<Reader />} />
                <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
                <Route path="/publish-success" element={<ProtectedRoute><PublishSuccess /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><AuthorDashboard /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/library" element={<Library />} />
              </Routes>
            </AnimatePresence>
            
            {/* Subtle footer */}
            <footer className="px-12 py-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="text-[10px] uppercase tracking-[0.4em] text-muted-gray/40">
                © 2026 Silentium. Knowledge in silence.
              </div>
              <div className="flex gap-8 text-[10px] uppercase tracking-[0.2em] text-muted-gray/40">
                <a href="#" className="hover:text-muted-gray transition-colors">Privacy</a>
                <a href="#" className="hover:text-muted-gray transition-colors">Terms</a>
                <a href="#" className="hover:text-muted-gray transition-colors">Contact</a>
              </div>
            </footer>
          </div>
        </Router>
      </AuthContext.Provider>
    </Router>
  );
}
