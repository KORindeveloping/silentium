import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  MapPin, 
  Lock, 
  Bell, 
  Trash2, 
  Camera, 
  Shield, 
  Save, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { API_BASE_URL } from '../config';

interface UserProfile {
  _id: string;
  email: string;
  role: string;
  name?: string;
  username?: string;
  phone?: string;
  bio?: string;
  location?: string;
  avatar?: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    activity: boolean;
  };
  createdAt: string;
}

export const Profile = () => {
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'preferences'>('info');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    bio: '',
    location: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        localStorage.removeItem('token');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch profile');
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setFormData({
          name: data.name || '',
          username: data.username || '',
          phone: data.phone || '',
          bio: data.bio || '',
          location: data.location || '',
        });
      }
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasChanges(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setHasChanges(true);
    }
  };

  const handleTogglePreference = (key: keyof UserProfile['notificationPreferences']) => {
    if (!user) return;
    const newPrefs = { ...user.notificationPreferences, [key]: !user.notificationPreferences[key] };
    setUser({ ...user, notificationPreferences: newPrefs });
    setHasChanges(true);
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      
      // Append text fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value as string);
      });

      // Append notifications
      if (user?.notificationPreferences) {
        formDataToSend.append('notificationPreferences', JSON.stringify(user.notificationPreferences));
      }

      // Append avatar if changed
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }

      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${token}` 
        },
        body: formDataToSend
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setUser(data);
      setSuccess('Profile updated successfully');
      setHasChanges(false);
      setAvatarFile(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        localStorage.removeItem('token');
        window.location.href = '/';
      }
    } catch (err) {
      setError('Failed to delete account');
    }
  };

  if (isLoading) {
    return (
      <div className="pt-40 px-12 max-w-6xl mx-auto space-y-12">
        <div className="flex items-center gap-8">
          <div className="w-32 h-32 rounded-full bg-white/5 animate-pulse" />
          <div className="space-y-4">
            <div className="w-48 h-8 bg-white/5 animate-pulse rounded-lg" />
            <div className="w-32 h-4 bg-white/5 animate-pulse rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-white/5 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      </div>
    );
  }

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-3 px-8 py-4 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${activeTab === id ? 'bg-soft-white text-void shadow-xl shadow-white/5 scale-105' : 'text-muted-gray hover:text-soft-white'}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="pt-32 pb-20 px-6 md:px-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="relative mb-16 flex flex-col md:flex-row items-center gap-10">
        <div className="relative group">
          <div className="w-40 h-40 rounded-full bg-ash border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl transition-transform duration-700 group-hover:scale-105">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
            ) : user?.avatar ? (
              <img src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE_URL}/${user.avatar.replace(/\\/g, '/')}`} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={64} className="text-muted-gray/20" />
            )}
          </div>
          <input 
            type="file" 
            id="avatar-upload" 
            className="hidden" 
            accept="image/*" 
            onChange={handleAvatarChange} 
          />
          <button 
            onClick={() => document.getElementById('avatar-upload')?.click()}
            className="absolute bottom-2 right-2 p-3 bg-soft-white text-void rounded-full shadow-lg hover:scale-110 transition-transform"
          >
            <Camera size={18} />
          </button>
        </div>

        <div className="text-center md:text-left">
          <h1 className="text-4xl font-light mb-3 text-soft-white tracking-tight">
            {user?.name || 'New Member'}
          </h1>
          <p className="text-muted-gray text-[10px] uppercase tracking-[0.4em] font-medium flex items-center justify-center md:justify-start gap-3">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {user?.role} • Joined {new Date(user?.createdAt || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="md:ml-auto flex gap-4">
          <div className="glass p-6 rounded-[2rem] text-center min-w-[120px]">
            <div className="text-2xl font-light mb-1">12</div>
            <div className="text-[8px] uppercase tracking-widest text-muted-gray">Collections</div>
          </div>
          <div className="glass p-6 rounded-[2rem] text-center min-w-[120px]">
            <div className="text-2xl font-light mb-1">4.8k</div>
            <div className="text-[8px] uppercase tracking-widest text-muted-gray">Points</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-4 mb-12 border-b border-white/5 pb-8">
        <TabButton id="info" label="Profile Info" icon={UserIcon} />
        <TabButton id="security" label="Security" icon={Shield} />
        <TabButton id="preferences" label="Preferences" icon={Bell} />
      </div>

      {/* Content Area */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-12"
      >
        <div className="lg:col-span-8 space-y-12">
          {activeTab === 'info' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-muted-gray ml-1">Full Name</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-void/40 border border-white/5 rounded-2xl px-6 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-muted-gray ml-1">Username</label>
                  <input
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full bg-void/40 border border-white/5 rounded-2xl px-6 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all"
                    placeholder="@username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-muted-gray ml-1">Email</label>
                  <input
                    disabled
                    value={user?.email}
                    className="w-full bg-void/20 border border-white/5 rounded-2xl px-6 py-4 text-muted-gray/50 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-[0.4em] text-muted-gray ml-1">Phone</label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full bg-void/40 border border-white/5 rounded-2xl px-6 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.4em] text-muted-gray ml-1">Bio</label>
                <textarea
                  name="bio"
                  rows={4}
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="w-full bg-void/40 border border-white/5 rounded-2xl px-6 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-[0.4em] text-muted-gray ml-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-gray/40" size={16} />
                  <input
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full bg-void/40 border border-white/5 rounded-2xl pl-14 pr-6 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all"
                    placeholder="San Francisco, CA"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-8">
              <div className="p-8 glass rounded-[2rem] border-white/5 space-y-6">
                <h3 className="text-sm uppercase tracking-[0.3em] font-medium text-soft-white flex items-center gap-3">
                  <Lock size={16} /> Update Password
                </h3>
                <div className="space-y-4">
                  <input
                    type="password"
                    placeholder="Current Password"
                    className="w-full bg-void/40 border border-white/5 rounded-2xl px-6 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    className="w-full bg-void/40 border border-white/5 rounded-2xl px-6 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    className="w-full bg-void/40 border border-white/5 rounded-2xl px-6 py-4 text-soft-white focus:outline-none focus:border-white/20 transition-all"
                  />
                </div>
                <button className="px-10 py-4 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-white/10 transition-all">
                  Update Password
                </button>
              </div>

              <div className="p-8 border border-red-500/10 bg-red-500/5 rounded-[2rem] space-y-6">
                <div>
                  <h3 className="text-sm uppercase tracking-[0.3em] font-medium text-red-400 mb-2">Danger Zone</h3>
                  <p className="text-[10px] text-muted-gray uppercase tracking-widest leading-relaxed">
                    Once you delete your account, there is no going back. Please be certain.
                  </p>
                </div>
                <button 
                  onClick={() => setShowDeleteModal(true)}
                  className="px-10 py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-red-500/20 transition-all"
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="space-y-6">
              {[
                { key: 'email', title: 'Email Notifications', desc: 'Receive daily digests and activity summaries' },
                { key: 'push', title: 'Push Notifications', desc: 'Get instant alerts for new mentions and messages' },
                { key: 'activity', title: 'Activity Tracking', desc: 'Show your online status and reading activity' }
              ].map((pref) => (
                <div key={pref.key} className="p-8 glass rounded-[2rem] flex items-center justify-between group hover:border-white/20 transition-colors">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-soft-white mb-1">{pref.title}</h4>
                    <p className="text-[10px] text-muted-gray uppercase tracking-widest">{pref.desc}</p>
                  </div>
                  <button 
                    onClick={() => handleTogglePreference(pref.key as any)}
                    className={`w-14 h-8 rounded-full transition-all duration-500 p-1 ${user?.notificationPreferences[pref.key as keyof UserProfile['notificationPreferences']] ? 'bg-soft-white' : 'bg-void border border-white/10'}`}
                  >
                    <div className={`w-6 h-6 rounded-full transition-all duration-500 ${user?.notificationPreferences[pref.key as keyof UserProfile['notificationPreferences']] ? 'bg-void translate-x-6' : 'bg-muted-gray/40'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-8">
          <div className="p-10 glass rounded-[3rem] space-y-8">
            <h3 className="text-[10px] uppercase tracking-[0.4em] font-black text-soft-white">Account Status</h3>
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-gray">Tier</span>
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[8px] uppercase tracking-widest">Premium</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-muted-gray">Storage</span>
                <span className="text-[10px] uppercase tracking-widest text-soft-white">85% Used</span>
              </div>
              <div className="w-full bg-void h-1.5 rounded-full overflow-hidden">
                <div className="bg-soft-white h-full w-[85%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]" />
              </div>
            </div>
            
            <button
              onClick={handleSaveProfile}
              disabled={isSaving || !hasChanges}
              className="w-full py-5 bg-soft-white text-void rounded-full text-[10px] uppercase tracking-[0.4em] font-black hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xl disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-3"
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Save Changes
            </button>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full p-8 glass rounded-[2rem] border-white/5 flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <LogOut className="text-muted-gray group-hover:text-red-400 transition-colors" size={18} />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold group-hover:text-soft-white transition-colors">Logout Session</span>
            </div>
            <ChevronRight size={14} className="text-muted-gray opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
          </button>
        </div>
      </motion.div>

      {/* Notifications */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-12 right-12 px-8 py-5 bg-green-500/10 border border-green-500/20 backdrop-blur-xl rounded-2xl flex items-center gap-4 text-green-400 z-50 shadow-2xl"
          >
            <CheckCircle2 size={20} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-black">{success}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-12 right-12 px-8 py-5 bg-red-500/10 border border-red-500/20 backdrop-blur-xl rounded-2xl flex items-center gap-4 text-red-400 z-50 shadow-2xl"
          >
            <AlertCircle size={20} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-black">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-void/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-ash border border-white/10 rounded-[3rem] p-12 shadow-2xl overflow-hidden"
            >
              <div className="text-center space-y-8">
                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="text-red-400" size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-light text-soft-white">Are you absolutely sure?</h3>
                  <p className="text-[10px] text-muted-gray uppercase tracking-widest leading-relaxed">
                    This action will permanently delete your account and all associated data.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleDeleteAccount}
                    className="w-full py-5 bg-red-500 text-white rounded-full text-[10px] uppercase tracking-[0.4em] font-black hover:bg-red-600 transition-all shadow-xl shadow-red-500/20"
                  >
                    Confirm Delete
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="w-full py-5 bg-white/5 text-soft-white rounded-full text-[10px] uppercase tracking-[0.4em] font-black hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
