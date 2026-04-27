'use client';

import { useState } from 'react';
import { X, Users, ShieldCheck, Loader2 } from 'lucide-react';
import { User } from '@/hooks/useChat';

interface CreateGroupModalProps {
  users: User[];
  onClose: () => void;
  onCreate: (name: string, memberUsernames: string[]) => Promise<void>;
}

export default function CreateGroupModal({ users, onClose, onCreate }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMember = (username: string) => {
    setSelectedMembers(prev => 
      prev.includes(username) 
        ? prev.filter(u => u !== username) 
        : [...prev, username]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedMembers.length === 0) return;

    setIsSubmitting(true);
    try {
      await onCreate(groupName, selectedMembers);
      onClose();
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blue-950/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-sm border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" /> New Secure Group
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Group Designation
              </label>
              <input
                type="text"
                placeholder="E.G. DEPARTMENT DELTA"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400 font-mono text-sm uppercase"
                autoFocus
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Select Authorized Personnel ({selectedMembers.length})
              </label>
              <div className="space-y-1 mt-2">
                {users.map(user => (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => toggleMember(user.username)}
                    className={`w-full flex items-center gap-3 p-3 rounded-sm transition-all border ${
                      selectedMembers.includes(user.username)
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'hover:bg-slate-50 border-transparent text-slate-600'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      selectedMembers.includes(user.username) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                    }`}>
                      {selectedMembers.includes(user.username) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <div className="flex flex-col items-start text-left">
                      <span className="text-sm font-bold uppercase">{user.username}</span>
                      <span className="text-[10px] text-slate-500 uppercase">{user.department || 'General'} • {user.role || 'Personnel'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button
              type="submit"
              disabled={!groupName.trim() || selectedMembers.length === 0 || isSubmitting}
              className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-sm transition-all border border-blue-900 shadow-sm text-white flex items-center justify-center gap-2 font-bold uppercase text-xs tracking-widest"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Establishing Group...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Initialize Encrypted Group
                </>
              )}
            </button>
            <p className="text-[9px] text-slate-400 text-center mt-3 uppercase tracking-wider">
              All group keys are generated locally and encrypted with member public keys.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
