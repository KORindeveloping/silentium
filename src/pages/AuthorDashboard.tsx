import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { DollarSign, Eye, Clock, Book, ArrowUpRight, History, CheckCircle2, AlertCircle, RefreshCw, Users, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthorStats } from '../types';
import { API_BASE_URL } from '../config';

export const AuthorDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [myDocs, setMyDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to access the dashboard.');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Get user ID first
      const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers });
      if (meRes.status === 401) {
        localStorage.removeItem('token');
        setError('Session expired. Please login again.');
        return;
      }
      if (!meRes.ok) throw new Error('Failed to authenticate');
      const meData = await meRes.json();
      const authorId = meData._id;

      // Fetch stats
      const statsRes = await fetch(`${API_BASE_URL}/api/analytics/stats`, { headers });
      const statsData = await statsRes.json();
      
      if (!statsRes.ok) throw new Error(statsData.message || 'Failed to fetch stats');
      
      setStats(statsData);

      // Fetch books by this author
      const docsRes = await fetch(`${API_BASE_URL}/api/books?authorId=${authorId}`, { headers }); 
      const docsData = await docsRes.json();
      
      if (!docsRes.ok) throw new Error(docsData.message || 'Failed to fetch documents');
      setMyDocs(docsData.books || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestPayout = async () => {
    if (!stats || stats.earnings < 1) return;
    
    setPayoutLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/analytics/payout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Payout request failed');
      
      setPayoutSuccess(`Successfully requested $${data.amount.toFixed(2)}`);
      fetchData(); // Refresh stats
      setTimeout(() => setPayoutSuccess(null), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loading && !stats) return (
    <div className="min-h-screen flex items-center justify-center bg-void">
       <div className="flex flex-col items-center gap-4">
         <RefreshCw size={24} className="text-muted-gray animate-spin" />
         <p className="text-[10px] uppercase tracking-[0.4em] text-muted-gray">Securing data stream...</p>
       </div>
    </div>
  );

  if (error && !stats) return (
    <div className="pt-40 text-center px-12">
      <div className="p-12 bg-white/[0.02] border border-white/5 rounded-[2.5rem] max-w-md mx-auto">
        <AlertCircle size={40} className="text-red-400 mx-auto mb-6 opacity-50" />
        <p className="text-soft-white text-sm font-light mb-8">{error}</p>
        <button onClick={() => fetchData()} className="w-full py-4 bg-white/5 border border-white/10 rounded-full text-[10px] uppercase tracking-widest hover:bg-white/10 transition-colors">Retry Connection</button>
      </div>
    </div>
  );

  const chartData = myDocs.slice(0, 5).map(d => ({
    name: d.title.length > 15 ? d.title.substring(0, 12) + '...' : d.title,
    minutes: d.readingMinutes || 0,
    views: d.views || 0
  }));

  return (
    <div className="min-h-screen pt-32 px-6 md:px-12 pb-24 max-w-7xl mx-auto">
      <AnimatePresence>
        {payoutSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-32 left-1/2 -translate-x-1/2 z-[60] bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-full flex items-center gap-3 text-emerald-500 text-[10px] uppercase tracking-widest backdrop-blur-md"
          >
            <CheckCircle2 size={14} /> {payoutSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16 flex flex-col md:flex-row justify-between items-end gap-8"
      >
        <div>
          <h1 className="text-5xl font-light mb-4 tracking-tighter text-soft-white italic">Author Studio</h1>
          <p className="text-muted-gray text-[10px] uppercase tracking-[0.4em]">Analytics derived from real collective engagement.</p>
        </div>
        <div className="flex gap-4">
           <button onClick={() => navigate('/upload')} className="px-8 py-4 bg-soft-white text-void rounded-full text-[10px] uppercase tracking-[0.2em] font-black hover:bg-white transition-all shadow-xl shadow-white/5">
              Publish New
           </button>
        </div>
      </motion.div>

      {/* Real-time Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <StatCard icon={<Wallet size={20} />} label="Available Balance" value={`$${stats?.earnings?.toFixed(2) || '0.00'}`} trend="Real-time" />
        <StatCard icon={<Eye size={20} />} label="Lifetime Reads" value={stats?.totalReads?.toLocaleString() || '0'} trend="Verified" />
        <StatCard icon={<Clock size={20} />} label="Total Minutes" value={stats?.totalMinutes?.toLocaleString() || '0'} trend="Accurate" />
        <StatCard icon={<Users size={20} />} label="Unique Readers" value={stats?.uniqueReaders?.toLocaleString() || '0'} trend="Organic" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Engagement Analytics */}
        <div className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 md:p-12">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.4em] text-muted-gray mb-1">Engagement Metrics</h3>
              <p className="text-soft-white text-sm font-light">Reading minutes by publication</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis dataKey="name" stroke="#444" fontSize={9} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#444" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                  contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#e4e4e7' }}
                />
                <Bar dataKey="minutes" fill="#e4e4e7" radius={[10, 10, 0, 0]} barSize={40}>
                   {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fillOpacity={1 - (index * 0.15)} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payout Engine */}
        <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 md:p-12 flex flex-col">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-[10px] uppercase tracking-[0.4em] text-muted-gray">Payout System</h3>
            <History size={16} className="text-muted-gray opacity-30" />
          </div>
          
          <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-2 max-h-[400px]">
            {stats?.payoutHistory?.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center group">
                <div>
                  <p className="text-soft-white text-lg font-light">${p.amount.toFixed(2)}</p>
                  <p className="text-[8px] text-muted-gray uppercase tracking-widest">{p.date}</p>
                </div>
                <span className={`text-[8px] px-3 py-1 rounded-full uppercase tracking-widest border ${
                  p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                  p.status === 'pending' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                  'bg-red-500/10 text-red-500 border-red-500/20'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
            {(!stats?.payoutHistory || stats.payoutHistory.length === 0) && (
              <div className="text-center py-12">
                <p className="text-muted-gray text-[10px] uppercase tracking-[0.2em] italic opacity-40">No transactions recorded.</p>
              </div>
            )}
          </div>

          <div className="mt-12 pt-12 border-t border-white/5">
             <button 
                onClick={handleRequestPayout}
                disabled={payoutLoading || !stats || stats.earnings < 1}
                className="w-full py-5 bg-soft-white text-void rounded-full text-[10px] uppercase tracking-[0.4em] font-black hover:bg-white transition-all disabled:opacity-20 disabled:grayscale flex items-center justify-center gap-3 group"
             >
                {payoutLoading ? <RefreshCw size={14} className="animate-spin" /> : <DollarSign size={14} />}
                Request Withdrawal
             </button>
             <p className="text-[8px] text-center mt-4 text-muted-gray/40 uppercase tracking-widest">Minimum withdrawal: $1.00 USD</p>
          </div>
        </div>
      </div>

      {/* Publications Ledger */}
      <div className="mt-12">
        <div className="flex justify-between items-end mb-8">
           <h3 className="text-[10px] uppercase tracking-[0.4em] text-muted-gray">Intellectual Assets</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myDocs.map(doc => (
            <div 
              key={doc._id} 
              onClick={() => navigate(`/reader/${doc._id}`)}
              className="bg-white/[0.02] border border-white/5 p-8 rounded-[1.5rem] flex justify-between items-center group hover:bg-white/5 hover:border-white/10 transition-all cursor-pointer"
            >
              <div className="space-y-3">
                <h4 className="text-soft-white text-xl font-light tracking-tight group-hover:text-white transition-colors">{doc.title}</h4>
                <div className="flex gap-6 text-[9px] text-muted-gray uppercase tracking-[0.2em] font-medium">
                  <span className="flex items-center gap-1.5"><Book size={10} className="opacity-40" /> {doc.category}</span>
                  <span className="flex items-center gap-1.5"><Eye size={10} className="opacity-40" /> {doc.views || 0}</span>
                  <span className="flex items-center gap-1.5"><Clock size={10} className="opacity-40" /> {doc.readingMinutes || 0}m</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:scale-110">
                <ArrowUpRight size={20} className="text-soft-white" />
              </div>
            </div>
          ))}
          {myDocs.length === 0 && (
            <div className="col-span-2 py-24 bg-white/[0.01] border border-dashed border-white/5 rounded-[2rem] text-center">
              <p className="text-muted-gray text-[10px] uppercase tracking-[0.4em] mb-6 opacity-40">No intellectual assets detected.</p>
              <button onClick={() => navigate('/upload')} className="text-soft-white text-[10px] uppercase tracking-widest underline underline-offset-8 decoration-white/10 hover:decoration-white/40 transition-all">Start first publication</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, trend }: any) => (
  <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] hover:bg-white/5 transition-all">
    <div className="flex justify-between items-start mb-6">
      <div className="w-10 h-10 bg-void rounded-xl flex items-center justify-center text-muted-gray border border-white/5">{icon}</div>
      {trend && <span className="text-[8px] uppercase tracking-widest text-emerald-500 font-bold bg-emerald-500/10 px-2 py-1 rounded-full">{trend}</span>}
    </div>
    <p className="text-[9px] uppercase tracking-[0.4em] text-muted-gray mb-2">{label}</p>
    <p className="text-3xl font-light text-soft-white tracking-tighter">{value}</p>
  </div>
);
