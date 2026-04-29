'use client';

import { 
  User as UserIcon, 
  Lock, 
  Search, 
  Users, 
  MessageSquare, 
  SquarePlus, 
  MoreVertical,
  Check,
  CheckCheck,
  LogOut,
  UserCircle,
  ArrowLeft,
  UserPlus,
  Users2
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { User, Group } from '@/hooks/useChat';

interface SidebarProps {
  username: string;
  users: User[];
  groups: Group[];
  selectedChat: { id: string, type: 'user' | 'group' } | null;
  onSelectChat: (chat: { id: string, type: 'user' | 'group' } | null) => void;
  unreadCounts: Record<string, number>;
  onLogout: () => void;
  onOpenGroupModal: () => void;
  onOpenProfile: () => void;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  messages: any[];
}

type FilterType = 'all' | 'unread' | 'groups' | 'direct';

export default function Sidebar({
  username,
  users,
  groups,
  selectedChat,
  onSelectChat,
  unreadCounts,
  onLogout,
  onOpenGroupModal,
  onOpenProfile,
  isSearchOpen,
  onToggleSearch,
  searchQuery,
  setSearchQuery,
  messages
}: SidebarProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showMenu, setShowMenu] = useState(false);

  // Helper to get last message for a chat
  const getLastMessage = (chatId: string, type: 'user' | 'group') => {
    const chatMessages = messages.filter(m => {
      if (type === 'group') return m.to?.toLowerCase() === chatId.toLowerCase();
      
      const normalizedMe = username.toLowerCase();
      const normalizedOther = chatId.toLowerCase();
      const mFrom = m.from?.toLowerCase();
      const mTo = m.to?.toLowerCase();
      
      return (mFrom === normalizedMe && mTo === normalizedOther) || 
             (mFrom === normalizedOther && mTo === normalizedMe);
    });
    
    return chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;
  };

  // Consolidated and filtered list (Main View)
  const consolidatedList = useMemo(() => {
    const list: (User | Group)[] = [];
    
    // Add groups
    groups.forEach(g => {
      const lastMsg = getLastMessage(g.id, 'group');
      (g as any).lastMessage = lastMsg;
      (g as any).timestamp = lastMsg ? new Date(lastMsg.timestamp).getTime() : 0;
      (g as any).type = 'group';
      list.push(g);
    });

    // Add users (only those we have messages with)
    users.forEach(u => {
      if (u.username.toLowerCase() === username.toLowerCase()) return;
      
      const lastMsg = getLastMessage(u.username, 'user');
      if (lastMsg) {
        (u as any).lastMessage = lastMsg;
        (u as any).timestamp = lastMsg ? new Date(lastMsg.timestamp).getTime() : 0;
        (u as any).type = 'user';
        list.push(u);
      }
    });

    // Sort by timestamp
    list.sort((a, b) => ((b as any).timestamp || 0) - ((a as any).timestamp || 0));

    // Apply Filter Chips
    let filtered = list;
    if (activeFilter === 'unread') {
      filtered = list.filter(item => {
        const id = (item as any).type === 'group' ? item.id : (item as User).username;
        return (unreadCounts[id.toLowerCase()] || 0) > 0;
      });
    } else if (activeFilter === 'groups') {
      filtered = list.filter(item => (item as any).type === 'group');
    } else if (activeFilter === 'direct') {
      filtered = list.filter(item => (item as any).type === 'user');
    }

    // Apply Search Query (if search is active but not in "New Chat" mode)
    if (searchQuery && !isSearchOpen) {
      filtered = filtered.filter(item => {
        const name = (item as any).type === 'group' ? (item as Group).name : (item as User).username;
        return name.toLowerCase().includes(searchQuery.toLowerCase());
      });
    }

    return filtered;
  }, [users, groups, messages, username, searchQuery, activeFilter, unreadCounts, isSearchOpen]);

  // Grouped Users for "New Chat" View
  const groupedUsers = useMemo(() => {
    if (!isSearchOpen) return {};
    
    let filtered = users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const groups: Record<string, User[]> = {};
    
    // Self (Message yourself)
    const self = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (self && self.username.toLowerCase().includes(searchQuery.toLowerCase())) {
        groups['#'] = [self];
    }

    filtered.forEach(u => {
      if (u.username.toLowerCase() === username.toLowerCase()) return;
      const firstLetter = u.username[0].toUpperCase();
      const key = /[A-Z]/.test(firstLetter) ? firstLetter : '#';
      if (!groups[key]) groups[key] = [];
      groups[key].push(u);
    });

    return groups;
  }, [users, isSearchOpen, searchQuery, username]);

  if (isSearchOpen) {
    return (
      <div className="w-full bg-white flex flex-col z-10 h-full border-r border-zinc-100 animate-in slide-in-from-left-4 duration-300">
        {/* New Chat Header */}
        <div className="px-4 pt-5 pb-3 flex items-center gap-4">
          <button 
            onClick={onToggleSearch}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-600"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight">New chat</h1>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-2">
          <div className="relative flex items-center bg-zinc-100 rounded-2xl px-4 py-2.5 transition-all focus-within:bg-zinc-50 border border-transparent focus-within:border-violet-200">
            <Search className="w-4.5 h-4.5 text-zinc-400 mr-3" />
            <input 
              type="text"
              placeholder="Search name or number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none text-[15px] focus:ring-0 outline-none text-zinc-800 placeholder:text-zinc-500 font-medium"
              autoFocus
            />
          </div>
        </div>

        {/* New Chat Options */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="py-2">
            <button 
                onClick={() => { onOpenGroupModal(); onToggleSearch(); }}
                className="w-full px-4 py-3 flex items-center gap-4 hover:bg-zinc-50 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-sm shadow-violet-100">
                <Users className="w-6 h-6" />
              </div>
              <span className="font-bold text-[15px] text-zinc-900">New group</span>
            </button>
          </div>

          {/* Contact List */}
          <div className="pb-8">
            {Object.keys(groupedUsers).sort((a, b) => {
              if (a === '#') return -1;
              if (b === '#') return 1;
              return a.localeCompare(b);
            }).map(letter => (
              <div key={letter}>
                <div className="px-6 py-3 text-[13px] font-bold text-violet-600 uppercase tracking-widest bg-zinc-50/50">
                  {letter}
                </div>
                {groupedUsers[letter].map(u => {
                    const isMe = u.username.toLowerCase() === username.toLowerCase();
                    return (
                        <button
                          key={u.username}
                          onClick={() => {
                            onSelectChat({ id: u.username, type: 'user' });
                            onToggleSearch();
                          }}
                          className="w-full px-4 py-3 flex items-center gap-4 hover:bg-zinc-50 transition-colors group"
                        >
                          <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center overflow-hidden border border-zinc-100 shadow-sm">
                              <UserIcon className="w-6 h-6 text-zinc-400 group-hover:text-violet-500 transition-colors" />
                            </div>
                            {u.isOnline && !isMe && (
                              <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white bg-emerald-500"></div>
                            )}
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <span className="font-bold text-[15px] text-zinc-900 truncate">
                                {u.username} {isMe ? '(You)' : ''}
                            </span>
                            <span className="text-[12px] text-zinc-500 truncate">
                                {isMe ? 'Message yourself' : (u.role || 'Personnel')}
                            </span>
                          </div>
                        </button>
                    )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white flex flex-col z-10 h-full border-r border-zinc-100">
      {/* Sidebar Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Chats</h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={onToggleSearch}
            className={`p-2 rounded-full transition-colors ${isSearchOpen ? 'bg-violet-100 text-violet-600' : 'text-zinc-600 hover:bg-zinc-100'}`}
            title="New Chat"
          >
            <SquarePlus className="w-6 h-6" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className={`p-2 rounded-full transition-colors ${showMenu ? 'bg-zinc-100 text-violet-600' : 'text-zinc-600 hover:bg-zinc-100'}`}
            >
              <MoreVertical className="w-6 h-6" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-zinc-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-200">
                  <button 
                    onClick={() => { onOpenProfile(); setShowMenu(false); }}
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50 flex items-center gap-3"
                  >
                    <UserCircle className="w-4 h-4" /> Profile
                  </button>
                  <button 
                    onClick={() => { onOpenGroupModal(); setShowMenu(false); }}
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-50 flex items-center gap-3"
                  >
                    <Users className="w-4 h-4" /> New Group
                  </button>
                  <div className="h-[1px] bg-zinc-100 my-1" />
                  <button 
                    onClick={onLogout}
                    className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-3"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 py-2">
        <div className="relative flex items-center bg-zinc-100 rounded-2xl px-4 py-2.5 transition-all focus-within:bg-zinc-50 border border-transparent focus-within:border-violet-200">
          <Search className="w-4.5 h-4.5 text-zinc-400 mr-3" />
          <input 
            type="text"
            placeholder="Search or start a new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none text-[15px] focus:ring-0 outline-none text-zinc-800 placeholder:text-zinc-500 font-medium"
          />
        </div>
      </div>

      {/* Filter Chips */}
      <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <button 
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeFilter === 'all' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
        >
          All
        </button>
        <button 
          onClick={() => setActiveFilter('unread')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${activeFilter === 'unread' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
        >
          Unread
          {Object.values(unreadCounts).some(c => c > 0) && (
            <span className={`w-2 h-2 rounded-full ${activeFilter === 'unread' ? 'bg-white' : 'bg-violet-600'}`}></span>
          )}
        </button>
        <button 
          onClick={() => setActiveFilter('groups')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeFilter === 'groups' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
        >
          Groups
        </button>
        <button 
          onClick={() => setActiveFilter('direct')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeFilter === 'direct' ? 'bg-violet-600 text-white shadow-md shadow-violet-100' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
        >
          Direct
        </button>
      </div>
      
      {/* Chat List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
        {consolidatedList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-400 p-8 text-center opacity-50">
            <MessageSquare className="w-12 h-12 mb-4" />
            <p className="text-sm font-medium">No chats found</p>
          </div>
        ) : (
          consolidatedList.map((item) => {
            const isGroup = (item as any).type === 'group';
            const id = isGroup ? item.id : (item as User).username;
            const name = isGroup ? (item as Group).name : (item as User).username;
            const lastMsg = (item as any).lastMessage;
            const unreadCount = unreadCounts[id.toLowerCase()] || 0;
            const isSelected = selectedChat?.id === id;

            return (
              <button
                key={id}
                onClick={() => onSelectChat({ id, type: isGroup ? 'group' : 'user' })}
                className={`w-full flex items-center gap-4 px-4 py-3 transition-all relative ${
                  isSelected ? 'bg-violet-50' : 'hover:bg-zinc-50'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border border-zinc-100 shadow-sm ${isGroup ? 'bg-violet-50' : 'bg-zinc-50'}`}>
                    {isGroup ? (
                      <Users className="w-6 h-6 text-violet-500" />
                    ) : (
                      <UserIcon className="w-6 h-6 text-zinc-400" />
                    )}
                  </div>
                  {!isGroup && (item as User).isOnline && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white bg-emerald-500"></div>
                  )}
                </div>
                
                {/* Info */}
                <div className="flex-1 min-w-0 border-b border-zinc-50 pb-3 mt-1">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-[15px] text-zinc-900 truncate pr-2">
                      {name}
                    </h3>
                    <span className={`text-[10px] font-bold tracking-tight shrink-0 ${unreadCount > 0 ? 'text-violet-600' : 'text-zinc-400'}`}>
                      {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {lastMsg && lastMsg.from.toLowerCase() === username.toLowerCase() && (
                        <div className="flex shrink-0">
                          {lastMsg.status === 'read' ? (
                            <CheckCheck className="w-3.5 h-3.5 text-violet-500" strokeWidth={3} />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5 text-zinc-300" strokeWidth={3} />
                          )}
                        </div>
                      )}
                      <p className={`text-[13px] truncate ${unreadCount > 0 ? 'text-zinc-900 font-semibold' : 'text-zinc-500'}`}>
                        {lastMsg ? (
                          isGroup ? `${lastMsg.fromName || lastMsg.from}: ${lastMsg.content}` : lastMsg.content
                        ) : (
                          isGroup ? 'No messages yet' : (item as User).role || 'Personnel'
                        )}
                      </p>
                    </div>
                    
                    {unreadCount > 0 && (
                      <span className="bg-violet-600 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm shadow-violet-200 animate-in zoom-in duration-300">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
