
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { storageService, UserProfile, HistoryItem } from '../services/storageService';
import { User, Mail, FileText, History, Trash2, Save, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(storageService.getProfile());
  const [history, setHistory] = useState<HistoryItem[]>(storageService.getHistory());
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    storageService.saveProfile(profile);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your history?')) {
      storageService.clearHistory();
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link to="/tool" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-10 transition-colors">
          <ArrowLeft className="w-5 h-5" /> Back to Tool
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid md:grid-cols-3 gap-12"
        >
          {/* Profile Sidebar */}
          <div className="md:col-span-1 space-y-8">
            <div className="relative group">
              <img 
                src={profile.avatarUrl} 
                alt="Avatar" 
                className="w-full aspect-square object-cover rounded-3xl border-2 border-white/10 group-hover:border-orange-500/50 transition-all"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-3xl transition-all cursor-pointer">
                <span className="text-xs font-bold uppercase tracking-widest">Change Photo</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Display Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="email" 
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-orange-500/50 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Bio</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 w-4 h-4 text-gray-500" />
                  <textarea 
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={4}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-orange-500/50 transition-all resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleSave}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isSaved ? 'bg-green-600' : 'bg-white text-black hover:scale-105'}`}
              >
                <Save className="w-5 h-5" /> {isSaved ? 'Profile Saved!' : 'Save Changes'}
              </button>
            </div>
          </div>

          {/* History Section */}
          <div className="md:col-span-2 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                <History className="w-8 h-8 text-orange-500" /> Usage History
              </h2>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-xs font-bold text-red-500 uppercase tracking-widest hover:text-red-400 flex items-center gap-2 transition-all"
                >
                  <Trash2 className="w-4 h-4" /> Clear All
                </button>
              )}
            </div>

            <div className="space-y-4">
              {history.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-3xl text-gray-600">
                  <p className="font-medium italic">Your invisified history will appear here.</p>
                </div>
              ) : (
                history.map((item) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-6 bg-zinc-900/50 border border-white/5 rounded-2xl hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono text-gray-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Reading Level</span>
                          <span className="text-xs font-bold text-blue-500">
                            {item.readingLevel || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">AI Score</span>
                          <span className={`text-xs font-bold ${item.score < 20 ? 'text-green-500' : 'text-orange-500'}`}>
                            {item.score}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2 italic mb-2">"{item.input}"</p>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${100 - item.score}%` }} />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
