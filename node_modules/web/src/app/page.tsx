'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useChat } from '@/hooks/useChat';
import { Send, User as UserIcon, Lock, ShieldCheck, Plus, Search, X, Users, MessageSquare, Trash2, Pencil } from 'lucide-react';
import CreateGroupModal from '@/components/CreateGroupModal';
import Sidebar from '@/components/chat/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';

export default function Home() {
  const [username, setUsername] = useState<string>('');
  const [isJoined, setIsJoined] = useState(false);
  const [selectedChat, setSelectedChat] = useState<{ id: string, type: 'user' | 'group' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { 
    users, 
    groups,
    messages, 
    sendMessage, 
    sendGroupMessage,
    removeMember,
    updateGroup,
    addMemberToGroup,
    editMessage,
    deleteMessage,
    createGroup,
    sendTypingStatus,
    isConnected, 
    isReady, 
    securityWarning, 
    unreadCounts,
    typingUsers,
    updateMemberRole,
    deleteGroup
  } = useChat(username, selectedChat?.id || null);

  const handleTyping = () => {
    if (selectedChat?.type !== 'user') return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      sendTypingStatus(selectedChat.id, true);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(selectedChat.id, false);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  // Auto-join if user is already logged in
  useEffect(() => {
    const savedUser = localStorage.getItem('chat_username');
    if (savedUser) {
      setUsername(savedUser);
      setIsJoined(true);
    } else {
      document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = '/login';
    }

    const tempUser = localStorage.getItem('temp_selected_user');
    if (tempUser) {
      setSelectedChat({ id: tempUser, type: 'user' });
      localStorage.removeItem('temp_selected_user');
    }
  }, []);
  
  // Update document title with unread count
  useEffect(() => {
    const total = Object.values(unreadCounts).reduce((acc, curr) => acc + curr, 0);
    document.title = total > 0 ? `(${total}) WhatsApp` : 'WhatsApp';
  }, [unreadCounts]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('chat_username');
    localStorage.removeItem('chat_token');
    window.location.href = '/login';
  };

  if (!isJoined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 font-sans">
        <div className="text-center p-8 flex flex-col items-center">
          <ShieldCheck className="w-20 h-20 text-wa-accent mb-6 animate-pulse" />
          <div className="w-48 h-1 bg-slate-200 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-wa-accent w-1/3 animate-[loading_2s_infinite_ease-in-out]"></div>
          </div>
          <h1 className="text-xl font-medium mt-6 text-slate-600">Connecting to WhatsApp...</h1>
          <p className="text-slate-400 mt-2 text-sm">End-to-end encrypted</p>
        </div>
        <style jsx>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    );
  }

  const filteredMessages = messages.filter(m => {
    if (!selectedChat) return false;
    const normalizedTo = m.to?.trim().toLowerCase();
    const normalizedSelected = selectedChat.id?.trim().toLowerCase();

    if (selectedChat.type === 'group') return normalizedTo === normalizedSelected;
    
    const normalizedMe = username.trim().toLowerCase();
    const normalizedFrom = m.from?.trim().toLowerCase();
    
    return (normalizedFrom === normalizedMe && normalizedTo === normalizedSelected) || 
           (normalizedFrom === normalizedSelected && normalizedTo === normalizedMe);
  });

  return (
    <main className="flex h-screen bg-white text-slate-900 overflow-hidden relative">
      <div className={`
        ${selectedChat ? 'hidden md:flex' : 'flex'} 
        w-full md:w-[400px] h-full border-r border-slate-200 shrink-0
      `}>
        <Sidebar 
          username={username}
          users={users}
          groups={groups}
          selectedChat={selectedChat}
          onSelectChat={setSelectedChat}
          unreadCounts={unreadCounts}
          onLogout={handleLogout}
          onOpenGroupModal={() => setIsGroupModalOpen(true)}
          isSearchOpen={isSearchOpen}
          onToggleSearch={() => setIsSearchOpen(!isSearchOpen)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          messages={messages}
        />
      </div>

      <div className={`
        ${selectedChat ? 'flex' : 'hidden md:flex'} 
        flex-1 h-full min-w-0
      `}>
        <ChatWindow 
          selectedChat={selectedChat}
          onBack={() => setSelectedChat(null)}
          messages={filteredMessages}
          username={username}
          users={users}
          groups={groups}
          isConnected={isConnected}
          isReady={isReady}
          securityWarning={securityWarning}
          typingUsers={typingUsers}
          onTyping={handleTyping}
          onSendMessage={sendMessage}
          onSendGroupMessage={sendGroupMessage}
          onSendTypingStatus={sendTypingStatus}
          onEditMessage={editMessage}
          onDeleteMessage={deleteMessage}
          onUpdateGroup={updateGroup}
          onRemoveMember={removeMember}
          onAddMember={addMemberToGroup}
          onUpdateMemberRole={updateMemberRole}
          onDeleteGroup={deleteGroup}
        />
      </div>

      {isGroupModalOpen && (
        <CreateGroupModal 
          users={users} 
          onClose={() => setIsGroupModalOpen(false)} 
          onCreate={async (name, members) => {
            await createGroup(name, members);
          }}
        />
      )}
    </main>
  );
}
