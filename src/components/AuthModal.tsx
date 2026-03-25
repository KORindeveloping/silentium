import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User as UserIcon, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'reader' | 'author'>('reader');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validation, setValidation] = useState({
    length: false,
    uppercase: false,
    number: false,
    special: false
  });

  useEffect(() => {
    if (!isLogin) {
      setValidation({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[^A-Za-z0-9]/.test(password)
      });
    }
  }, [password, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && (!validation.length || !validation.uppercase || !validation.number || !validation.special)) {
      setError('Please meet all password requirements.');
      return;
    }

    setIsLoading(true);
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin ? { email, password, rememberMe } : { email, password, role };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');

      localStorage.setItem('token', data.token);
      onSuccess(data.token, data);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const ValidationItem = ({ label, met }: { label: string; met: boolean }) => (
    <div className={`flex items-center gap-2 text-[10px] uppercase tracking-widest ${met ? 'text-green-400' : 'text-muted-gray/40'}`}>
      <ShieldCheck size={12} className={met ? 'opacity-100' : 'opacity-20'} />
      {label}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-void/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-md bg-ash border border-white/10 rounded-[2rem] p-10 shadow-2xl overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-soft-white/5 rounded-full blur-3xl pointer-events-none" />
            
            <button onClick={onClose} className="absolute top-8 right-8 text-muted-gray hover:text-white transition-colors">
              <X size={20} />
            </button>

            <div className="mb-10">
              <h2 className="text-3xl font-light mb-2 text-soft-white tracking-tight">
                {isLogin ? 'Welcome back' : 'Start your journey'}
              </h2>
              <p className="text-muted-gray text-[10px] uppercase tracking-[0.3em] font-medium">
                {isLogin ? 'Authentication required' : 'Create your collective account'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-4 bg-red-400/10 border border-red-400/20 rounded-2xl flex items-center gap-3 text-red-400 text-[10px] uppercase tracking-widest"
                >
                  <AlertCircle size={14} />
                  {error}
                </motion.div>
              )}
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.4em] text-muted-gray ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-gray/40 group-focus-within:text-soft-white/60 transition-colors" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-void/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all placeholder:text-muted-gray/20"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-muted-gray">Password</label>
                  {isLogin && (
                    <button type="button" className="text-[10px] uppercase tracking-widest text-muted-gray hover:text-soft-white transition-colors">Forgot?</button>
                  )}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-gray/40 group-focus-within:text-soft-white/60 transition-colors" size={16} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-void/40 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all placeholder:text-muted-gray/20"
                  />
                </div>
                
                {!isLogin && (
                  <div className="grid grid-cols-2 gap-y-3 pt-4 px-1">
                    <ValidationItem label="8+ Characters" met={validation.length} />
                    <ValidationItem label="Uppercase" met={validation.uppercase} />
                    <ValidationItem label="One Number" met={validation.number} />
                    <ValidationItem label="Special Char" met={validation.special} />
                  </div>
                )}
              </div>

              {!isLogin && (
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-muted-gray ml-1">I am a...</label>
                  <div className="flex gap-4">
                    {(['reader', 'author'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`flex-1 py-3 rounded-2xl border text-[10px] uppercase tracking-[0.2em] font-bold transition-all duration-500 ${role === r ? 'border-soft-white/40 text-soft-white bg-white/5 shadow-lg shadow-white/5' : 'border-white/5 text-muted-gray hover:border-white/10'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLogin && (
                <label className="flex items-center gap-3 cursor-pointer group w-fit">
                  <div className={`w-5 h-5 rounded-md border transition-all flex items-center justify-center ${rememberMe ? 'bg-soft-white border-soft-white' : 'border-white/10 group-hover:border-white/20'}`}>
                    {rememberMe && <div className="w-2 h-2 bg-void rounded-full" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={rememberMe} 
                    onChange={() => setRememberMe(!rememberMe)} 
                  />
                  <span className="text-[10px] uppercase tracking-widest text-muted-gray group-hover:text-soft-white transition-colors">Remember me</span>
                </label>
              )}

              <button 
                disabled={isLoading}
                className="w-full py-5 bg-soft-white text-void rounded-full text-[10px] uppercase tracking-[0.4em] font-black hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-white/5 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : (isLogin ? 'Login' : 'Create Account')}
              </button>
            </form>

            <div className="mt-12 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-gray">
                {isLogin ? "Don't have an account?" : "Already a member?"}
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-3 text-soft-white hover:underline font-bold"
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
