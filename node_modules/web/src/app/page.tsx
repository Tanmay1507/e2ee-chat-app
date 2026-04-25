'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useChat } from '@/hooks/useChat';
import { Send, User as UserIcon, Lock, ShieldCheck, Plus, Search, X, Users } from 'lucide-react';

export default function Home() {
  const [username, setUsername] = useState<string>('');
  const [isJoined, setIsJoined] = useState(false);
  const [inputText, setInputText] = useState('');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const { users, messages, sendMessage, isConnected, isReady, socketId, getSharedKeyFingerprint, securityWarning, unreadCounts } = useChat(username, selectedUser || null);

  // Auto-join if user is already logged in (simulated by localStorage for this demo)
  useEffect(() => {
    const savedUser = localStorage.getItem('chat_username');
    if (savedUser) {
      setUsername(savedUser);
      setIsJoined(true);
    } else {
      // Clear cookie to break the redirect loop if storage was cleared
      document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = '/login';
    }

    // Check for user selected from directory
    const tempUser = localStorage.getItem('temp_selected_user');
    if (tempUser) {
      setSelectedUser(tempUser);
      localStorage.removeItem('temp_selected_user');
    }
  }, []);
  
  // Update document title with unread count
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((acc, curr) => acc + curr, 0);
    if (total > 0) {
      document.title = `(${total}) E2EE Government Chat`;
    } else {
      document.title = 'E2EE Government Chat';
    }
  }, [unreadCounts]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('chat_username');
    localStorage.removeItem('chat_token');
    window.location.href = '/login';
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && selectedUser && isReady) {
      sendMessage(selectedUser, inputText);
      setInputText('');
    }
  };

  if (!isJoined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-900 font-sans tracking-wide">
        <div className="text-center p-8 bg-white border border-slate-200 shadow-xl rounded-sm">
          <ShieldCheck className="w-16 h-16 text-amber-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-bold uppercase tracking-widest text-blue-950">Verifying Clearance...</h1>
          <p className="text-slate-500 mt-2 text-sm uppercase">Establishing Secure Connection</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-screen bg-slate-50 text-slate-900 font-sans tracking-wide overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col shadow-lg z-10">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h1 className="text-lg font-bold text-blue-900 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" /> Gov-Secure
            </h1>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 uppercase tracking-wider">
              <Lock className="w-3 h-3" /> Class 1 Relay
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className={`p-2 rounded-sm transition-colors ${isSearchOpen ? 'bg-blue-100 text-blue-900' : 'text-slate-400 hover:bg-slate-100 hover:text-blue-900'}`}
              title="New Chat"
            >
              {isSearchOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
            <Link 
              href="/staff"
              className="p-2 rounded-sm text-slate-400 hover:bg-slate-100 hover:text-blue-900 transition-colors"
              title="Staff Directory"
            >
              <Users className="w-4 h-4" />
            </Link>
            <button 
              onClick={handleLogout}
              className="text-[10px] font-bold uppercase text-slate-400 hover:text-red-500 transition-colors p-2"
            >
              Logout
            </button>
          </div>
        </div>

        {isSearchOpen && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top duration-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="SEARCH PERSONNEL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-sm text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-blue-600 outline-none"
                autoFocus
              />
            </div>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
            {isSearchOpen ? 'Search Results' : 'Cleared Personnel'}
          </p>
          {users.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
            <p className="text-xs text-slate-400 px-2 italic uppercase text-center mt-8">No personnel found</p>
          ) : (
            users
              .filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((user) => (
              <button
                key={user.username}
                onClick={() => {
                  setSelectedUser(user.username);
                  if (isSearchOpen) setIsSearchOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-sm transition-all border border-transparent ${
                  selectedUser === user.username ? 'bg-slate-100 border-slate-200 text-blue-900 shadow-sm' : 'hover:bg-slate-50 text-slate-600 hover:border-slate-200'
                }`}
              >
                <div className="relative p-2 bg-slate-100 rounded-sm shrink-0 border border-slate-200">
                  <UserIcon className="w-5 h-5 text-slate-400" />
                  <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${user.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  {unreadCounts[user.username.toLowerCase()] > 0 && (
                    <div className="absolute -bottom-1 -right-1 min-w-[16px] h-4 bg-red-600 text-white text-[9px] font-bold rounded-full border-2 border-white flex items-center justify-center px-1 animate-bounce">
                      {unreadCounts[user.username.toLowerCase()]}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start truncate overflow-hidden text-left">
                  <span className="font-medium truncate w-full">{user.username}</span>
                  <div className="text-xs text-slate-500 truncate max-w-[150px]">
                    {user.role || 'Personnel'} • {user.department || 'General'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Key: ...{user.publicKey ? user.publicKey.slice(-8) : 'MISSING'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-white flex items-center justify-center border border-slate-200 shadow-sm">
              <UserIcon className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-900">{username}</p>
              <p className="text-[10px] font-mono text-slate-400">Key: ...{users.find(u => u.username === username)?.publicKey?.slice(-8) || '...'}</p>
              <div className="flex flex-col gap-1 mt-1">
                <button 
                  onClick={() => {
                    localStorage.clear();
                    document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    window.location.reload();
                  }}
                  className="text-[9px] text-red-600 hover:text-red-700 font-bold uppercase tracking-widest underline text-left"
                >
                  Reset Secure Session
                </button>
                <button 
                  onClick={async () => {
                    if (confirm('Are you sure you want to clear ALL messages for everyone?')) {
                      await fetch('/api/chat/clear', { method: 'DELETE' });
                      window.location.reload();
                    }
                  }}
                  className="text-[9px] text-slate-500 hover:text-slate-700 font-bold uppercase tracking-widest underline text-left"
                >
                  Clear All Messages (Global)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        {selectedUser ? (
          <div className="flex flex-col h-full relative z-10">
            {/* Security Warning Banner */}
            {securityWarning && (
              <div className="bg-red-600 text-white p-2 text-center text-xs font-bold animate-pulse">
                ⚠️ {securityWarning}
              </div>
            )}

            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-4 shadow-sm">
              <div className="w-10 h-10 rounded-sm bg-slate-50 flex items-center justify-center relative border border-slate-200">
                <UserIcon className="w-5 h-5 text-slate-400" />
                <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${users.find(u => u.username === selectedUser)?.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              </div>
              <div>
                <h3 className="font-bold flex items-center gap-2 uppercase tracking-wide text-sm text-slate-900">
                  {selectedUser}
                  <span className={`text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-widest border ${users.find(u => u.username === selectedUser)?.isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {users.find(u => u.username === selectedUser)?.isOnline ? 'Active' : 'Offline'}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-sm uppercase tracking-widest border ${isConnected ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {isConnected ? 'Network: Connected' : 'Network: Disconnected'}
                  </span>
                </h3>
                <p className="text-[10px] text-blue-700 flex items-center gap-4 uppercase tracking-widest mt-0.5 font-bold">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-amber-500" />
                    Classified E2EE Network
                  </span>
                  <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-sm border border-slate-200">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    Channel ID: {getSharedKeyFingerprint(selectedUser)}
                  </span>
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
              {messages
                .filter(m => {
                  if (!selectedUser) return false;
                  const normalizedMe = username.trim().toLowerCase();
                  const normalizedFrom = m.from.trim().toLowerCase();
                  const normalizedSelected = selectedUser.trim().toLowerCase();
                  const normalizedTo = m.to.trim().toLowerCase();
                  
                  return (normalizedFrom === normalizedMe && normalizedTo === normalizedSelected) || 
                         (normalizedFrom === normalizedSelected && normalizedTo === normalizedMe);
                })
                .map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.from.trim().toLowerCase() === username.trim().toLowerCase() ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[70%] p-4 rounded-sm shadow-sm border ${
                    msg.from.trim().toLowerCase() === username.trim().toLowerCase() 
                      ? 'bg-blue-700 border-blue-800 text-white' 
                      : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <p className="text-sm font-mono">{msg.content}</p>
                    <span className={`text-[9px] mt-2 block uppercase tracking-widest ${msg.from.trim().toLowerCase() === username.trim().toLowerCase() ? 'text-blue-200' : 'text-slate-500 font-bold'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
              {messages.filter(m => {
                if (!selectedUser) return false;
                const normalizedMe = username.trim().toLowerCase();
                const normalizedFrom = m.from.trim().toLowerCase();
                const normalizedSelected = selectedUser.trim().toLowerCase();
                const normalizedTo = m.to.trim().toLowerCase();
                
                return (normalizedFrom === normalizedMe && normalizedTo === normalizedSelected) || 
                       (normalizedFrom === normalizedSelected && normalizedTo === normalizedMe);
              }).length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                  <Lock className="w-12 h-12 mb-4 opacity-20" />
                  <p>Messages are secured with AES-256-GCM.</p>
                  <p className="text-sm mt-2">
                    Even if {selectedUser} is offline, they will receive your message securely when they reconnect.
                  </p>
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200">
              <div className="relative flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="TRANSMIT SECURE DATA..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-sm focus:ring-2 focus:ring-blue-600 outline-none transition-all placeholder:text-slate-400 font-mono text-sm uppercase text-slate-900"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-sm transition-all border border-blue-900 shadow-sm text-white flex items-center gap-2 font-bold uppercase text-xs tracking-widest"
                >
                  <span>Transmit</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 relative z-10">
            <div className="p-8 bg-white border border-slate-200 rounded-sm flex flex-col items-center text-center max-w-sm shadow-xl">
              <ShieldCheck className="w-16 h-16 text-slate-200 mb-6" />
              <h3 className="text-lg font-bold text-slate-800 mb-2 uppercase tracking-widest">Network Secure</h3>
              <p className="text-xs mb-6 uppercase tracking-wider leading-relaxed text-slate-500">Select cleared personnel from the directory to initiate a classified encrypted transmission.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
