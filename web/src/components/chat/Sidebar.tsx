'use client';

import { User as UserIcon, Lock, ShieldCheck, Plus, Search, Users, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { User, Group } from '@/hooks/useChat';
import ProfileModal from '@/components/ProfileModal';

interface SidebarProps {
  username: string;
  users: User[];
  groups: Group[];
  selectedChat: { id: string, type: 'user' | 'group' } | null;
  onSelectChat: (chat: { id: string, type: 'user' | 'group' } | null) => void;
  unreadCounts: Record<string, number>;
  onLogout: () => void;
  onOpenGroupModal: () => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  messages: any[];
}

export default function Sidebar({
  username,
  users,
  groups,
  selectedChat,
  onSelectChat,
  unreadCounts,
  onLogout,
  onOpenGroupModal,
  isSearchOpen,
  onToggleSearch,
  searchQuery,
  setSearchQuery,
  messages
}: SidebarProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const currentUserObj = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  const activeUsernames = new Set(messages.filter(m => m.type !== 'group').map(m => [m.from.toLowerCase(), m.to.toLowerCase()]).flat());
  
  const filteredUsers = users.filter(u => {
    const isMe = u.username.toLowerCase() === username.toLowerCase();
    if (isMe) return false; // Hide self from sidebar chat list
    
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase());
    if (isSearchOpen) return matchesSearch;
    return matchesSearch && activeUsernames.has(u.username.toLowerCase());
  });

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (isSearchOpen) return matchesSearch;
    return matchesSearch;
  });

  return (
    <div className="w-full border-r border-zinc-200 bg-white flex flex-col z-10 h-full">
      {/* Sidebar Header & Profile */}
      <div className="bg-white shrink-0 border-b border-zinc-100 flex flex-col">
        {/* Top Profile Bar */}
        <div 
          onClick={() => setIsProfileOpen(true)}
          className="h-[64px] px-4 flex items-center gap-3 bg-zinc-50/50 cursor-pointer hover:bg-zinc-100/80 transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center border border-violet-700 shadow-sm shadow-violet-100 shrink-0 group-hover:scale-105 transition-transform">
            <UserIcon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <p className="text-[11px] sm:text-xs font-bold text-zinc-900 truncate tracking-tight leading-none mb-0.5">{username}</p>
            <p className="text-[9px] sm:text-[10px] text-violet-500 font-bold tracking-wider leading-none">E2EE ACTIVE</p>
          </div>
          <div className="flex items-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onLogout();
              }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-zinc-500 hover:text-red-600 hover:bg-red-50 border border-zinc-100 transition-all uppercase tracking-wider"
              title="Logout"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Action Header */}
        <div className="h-[48px] px-3 flex justify-between items-center bg-white">
          <div className="flex items-center gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onOpenGroupModal();
              }}
              className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 transition-colors"
              title="New Group"
            >
              <Users className="w-4.5 h-4.5" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onToggleSearch();
              }}
              className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-violet-100 text-violet-600' : 'text-zinc-500 hover:bg-zinc-100'}`}
              title="New Chat"
            >
              <MessageSquare className="w-4.5 h-4.5" />
            </button>
            <Link 
              href="/staff"
              className="p-2 rounded-full text-zinc-500 hover:bg-zinc-100 transition-colors"
              title="Staff Directory"
            >
              <Plus className="w-4.5 h-4.5" />
            </Link>
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              if(confirm('Clear session and logout?')) {
                localStorage.clear();
                document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                window.location.reload();
              }
            }}
            className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"
            title="Reset Session"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 sm:p-3 bg-white shrink-0">
        <div className="relative flex items-center bg-zinc-100 rounded-xl px-3 py-1.5 sm:py-2 border border-transparent focus-within:border-violet-200 focus-within:bg-white focus-within:ring-4 focus-within:ring-violet-50 transition-all">
          <Search className={`w-4 h-4 mr-2 sm:mr-3 ${isSearchOpen ? 'text-violet-500' : 'text-zinc-400'}`} />
          <input 
            type="text"
            placeholder={isSearchOpen ? "Search personnel..." : "Search or start chat"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-[13px] sm:text-[14px] focus:ring-0 outline-none text-zinc-800 placeholder:text-zinc-400 font-medium"
          />
        </div>
      </div>
      
      {/* Chat List */}
      <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
        {/* Groups Section */}
        {!isSearchOpen && filteredGroups.length > 0 && (
          <div className="border-b border-zinc-50">
            {filteredGroups.map(group => (
              <button
                key={group.id}
                onClick={() => onSelectChat({ id: group.id, type: 'group' })}
                className={`w-full flex items-center gap-3 px-3 py-3 transition-all border-b border-zinc-50/50 last:border-none ${
                  selectedChat?.id === group.id 
                    ? 'bg-violet-50 border-l-4 border-l-violet-600' 
                    : 'hover:bg-zinc-50 border-l-4 border-l-transparent'
                }`}
              >
                <div className="w-12 h-12 bg-zinc-100 rounded-2xl shrink-0 flex items-center justify-center border border-zinc-200/50">
                  <Users className="w-6 h-6 text-zinc-400" />
                </div>
                <div className="flex-1 flex flex-col items-start min-w-0">
                  <div className="flex justify-between w-full items-center">
                    <span className="font-bold text-[15px] text-zinc-900 truncate">{group.name}</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0">Group</span>
                  </div>
                  <div className="flex items-center gap-1 w-full">
                    <span className="text-[13px] font-medium text-zinc-500 truncate">
                      {group.membersCount || 0} members
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Users Section */}
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-400 p-8 text-center">
            <Search className="w-12 h-12 mb-4 opacity-10" />
            <p className="text-sm font-medium">No contacts found</p>
          </div>
        ) : (
          filteredUsers.map((user) => (
            <button
              key={user.username}
              onClick={() => {
                onSelectChat({ id: user.username, type: 'user' });
                if (isSearchOpen) onToggleSearch();
              }}
              className={`w-full flex items-center gap-3 px-3 py-0 transition-all ${
                selectedChat?.id === user.username 
                  ? 'bg-violet-50 border-l-4 border-l-violet-600' 
                  : 'hover:bg-zinc-50 border-l-4 border-l-transparent'
              }`}
            >
              <div className="relative w-12 h-12 shrink-0 my-3">
                <div className="w-full h-full bg-zinc-100 rounded-2xl flex items-center justify-center overflow-hidden border border-zinc-200/50">
                  <UserIcon className="w-7 h-7 text-zinc-400" />
                </div>
                {user.isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm"></div>
                )}
              </div>
              
              <div className="flex-1 flex flex-col items-start min-w-0 h-[72px] justify-center pr-2">
                <div className="flex justify-between w-full items-center mb-0.5">
                  <span className="font-bold text-[15px] text-zinc-900 truncate">{user.username}</span>
                  <div className="flex items-center gap-2">
                    {unreadCounts[user.username.toLowerCase()] > 0 && (
                      <span className="bg-violet-600 text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-sm shadow-violet-200">
                        {unreadCounts[user.username.toLowerCase()]}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold tracking-wider shrink-0 ${user.isOnline ? 'text-emerald-600' : 'text-zinc-400'}`}>
                      {user.isOnline ? 'Online' : ''}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 w-full">
                  <p className="text-[13px] font-medium text-zinc-500 truncate flex-1 text-left">
                    {user.role || 'Personnel'} • {user.department || 'General'}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      <ProfileModal 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
        username={username}
        user={currentUserObj}
      />
    </div>
  );
}
