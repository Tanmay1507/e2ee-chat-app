'use client';

import { useState } from 'react';
import { X, Search, User as UserIcon, Users, Send } from 'lucide-react';
import { User, Group } from '@/hooks/useChat';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  groups: Group[];
  onForward: (targets: { id: string, type: 'user' | 'group' }[]) => void;
}

export default function ForwardModal({ isOpen, users, groups, onClose, onForward }: ForwardModalProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ id: string, type: 'user' | 'group' }[]>([]);

  if (!isOpen) return null;

  const toggleSelect = (id: string, type: 'user' | 'group') => {
    setSelected(prev => {
      const exists = prev.find(item => item.id === id && item.type === type);
      if (exists) {
        return prev.filter(item => !(item.id === id && item.type === type));
      } else {
        return [...prev, { id, type }];
      }
    });
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));
  const filteredGroups = groups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
        <div className="bg-wa-header px-6 py-4 flex items-center justify-between border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Forward to...</h2>
          <button onClick={onClose} className="text-slate-500 hover:bg-slate-200 p-1 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search users or groups"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-wa-accent outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredGroups.length > 0 && (
            <div className="mb-4">
              <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Groups</h3>
              {filteredGroups.map(g => {
                const isSel = selected.some(s => s.id === g.id && s.type === 'group');
                return (
                  <div 
                    key={g.id} 
                    onClick={() => toggleSelect(g.id, 'group')}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSel ? 'bg-wa-accent/10' : 'hover:bg-slate-50'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-slate-500" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-700">{g.name}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSel ? 'border-wa-accent bg-wa-accent' : 'border-slate-300'}`}>
                      {isSel && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-4">
            <h3 className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Recent Chats</h3>
            {filteredUsers.map(u => {
              const isSel = selected.some(s => s.id === u.username && s.type === 'user');
              return (
                <div 
                  key={u.username} 
                  onClick={() => toggleSelect(u.username, 'user')}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSel ? 'bg-wa-accent/10' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                    <UserIcon className="w-5 h-5 text-slate-500" />
                  </div>
                  <span className="flex-1 text-sm font-medium text-slate-700">{u.username}</span>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSel ? 'border-wa-accent bg-wa-accent' : 'border-slate-300'}`}>
                    {isSel && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">{selected.length} selected</span>
          <button
            onClick={() => onForward(selected)}
            disabled={selected.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-wa-accent text-white font-medium rounded-lg hover:bg-[#008f6f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            Forward <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
