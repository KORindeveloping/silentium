import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Check, X, AlertCircle, TrendingUp } from 'lucide-react';
import { Document } from '../types';
import { API_BASE_URL } from '../config';
import { fetchJson } from '../lib/http';

export const AdminPanel: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [docs, setDocs] = useState<Document[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const statsData = await fetchJson<any>(`${API_BASE_URL}/api/admin/stats`);
        const docsData = await fetchJson<Document[]>(`${API_BASE_URL}/api/admin/documents`);
        setStats(statsData);
        setDocs(docsData);
      } catch (error) {
        console.error('Failed to load admin data', error);
      }
    };
    load();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    await fetchJson(`${API_BASE_URL}/api/admin/documents/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    setDocs(docs.map(d => d.id === id ? { ...d, status: status as any } : d));
  };

  if (!stats) return <div className="pt-32 text-center text-muted-gray">Accessing secure panel...</div>;

  return (
    <div className="min-h-screen pt-32 px-6 md:px-12 pb-24 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl font-light mb-2 tracking-tight">Platform Governance</h1>
          <p className="text-muted-gray text-xs uppercase tracking-[0.3em]">Revenue oversight and content moderation.</p>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-gray">Total Revenue</p>
            <p className="text-xl font-light">${stats?.platformRevenue?.toLocaleString() || '0'}</p>
          </div>
          <div className="w-[1px] h-10 bg-white/10" />
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-gray">Author Pool</p>
            <p className="text-xl font-light text-emerald-500">${stats?.authorPool?.toLocaleString() || '0'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          <div className="glass rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-muted-gray">
                  <th className="px-6 py-4 font-medium">Document</th>
                  <th className="px-6 py-4 font-medium">Author</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {docs.map(doc => (
                  <tr key={doc.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-soft-white font-light">{doc.title}</p>
                      <p className="text-[10px] text-muted-gray">{doc.category}</p>
                    </td>
                    <td className="px-6 py-4 text-muted-gray">{doc.authorName}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] px-2 py-1 rounded-full uppercase tracking-widest ${
                        doc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                        doc.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => updateStatus(doc.id, 'approved')}
                          className="p-2 text-muted-gray hover:text-emerald-500 transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => updateStatus(doc.id, 'rejected')}
                          className="p-2 text-muted-gray hover:text-red-500 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-[10px] uppercase tracking-widest text-muted-gray mb-4">System Alerts</h3>
            <div className="space-y-4">
              <div className="flex gap-3 text-xs">
                <AlertCircle size={14} className="text-amber-500 shrink-0" />
                <p className="text-muted-gray">3 documents flagged for copyright review.</p>
              </div>
              <div className="flex gap-3 text-xs">
                <TrendingUp size={14} className="text-emerald-500 shrink-0" />
                <p className="text-muted-gray">Revenue up 14% this week.</p>
              </div>
            </div>
          </div>
          
          <button className="w-full py-4 bg-ash border border-white/10 rounded-2xl text-[10px] uppercase tracking-widest text-soft-white hover:bg-white/5 transition-all">
            Generate Revenue Report
          </button>
        </div>
      </div>
    </div>
  );
};
