'use client';

import { useState } from 'react';
import { X, Users, Loader2, User, Search } from 'lucide-react';
import { User as UserType } from '@/hooks/useChat';

interface CreateGroupModalProps {
  users: UserType[];
  onClose: () => void;
  onCreate: (name: string, memberUsernames: string[]) => Promise<void>;
}

export default function CreateGroupModal({ users, onClose, onCreate }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[2px] p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-wa-header flex items-center gap-4 border-b border-slate-100">
          <button onClick={onClose} className="text-slate-500 hover:bg-slate-200 p-2 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-medium text-slate-900">New group</h2>
            <p className="text-xs text-slate-500">Add members</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          {/* Selected Members Chips */}
          {selectedMembers.length > 0 && (
            <div className="p-4 flex flex-wrap gap-2 border-b border-slate-100 max-h-32 overflow-y-auto">
              {selectedMembers.map(username => (
                <div key={username} className="flex items-center gap-1 bg-[#f0f2f5] px-3 py-1.5 rounded-full text-sm text-slate-700">
                  <span>{username}</span>
                  <button type="button" onClick={() => toggleMember(username)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Group Name Input */}
            <div className="relative group">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-0 py-2 border-b-2 border-slate-200 focus:border-wa-accent outline-none transition-all placeholder:text-slate-400 text-lg"
                autoFocus
                required
              />
              <div className="absolute right-0 top-2 p-2 rounded-full bg-slate-100 text-slate-400">
                <Users className="w-5 h-5" />
              </div>
            </div>

            {/* Search and User List */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  placeholder="Search contacts"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#f0f2f5] rounded-full text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <h3 className="text-[11px] font-medium text-wa-accent uppercase tracking-wider mb-2">Contacts</h3>
                {filteredUsers.map(user => (
                  <button
                    key={user.username}
                    type="button"
                    onClick={() => toggleMember(user.username)}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg transition-colors ${
                      selectedMembers.includes(user.username)
                        ? 'bg-emerald-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                        <User className="w-7 h-7 text-slate-400" />
                      </div>
                      {selectedMembers.includes(user.username) && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-wa-accent rounded-full border-2 border-white flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-start text-left overflow-hidden">
                      <span className="text-sm font-medium text-slate-900 truncate w-full">{user.username}</span>
                      <span className="text-xs text-slate-500 truncate w-full">{user.department || 'Contact'}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-white shrink-0 border-t border-slate-100">
            <button
              type="submit"
              disabled={!groupName.trim() || selectedMembers.length === 0 || isSubmitting}
              className="w-full py-3.5 bg-wa-accent hover:brightness-95 disabled:opacity-50 rounded-full transition-all shadow-md text-white flex items-center justify-center gap-2 font-medium text-sm"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Create group'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
