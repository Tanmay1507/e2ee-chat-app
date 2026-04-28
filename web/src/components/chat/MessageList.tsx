'use client';

import { ShieldCheck } from 'lucide-react';
import { Message } from '@/hooks/useChat';
import { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';

interface MessageListProps {
  messages: Message[];
  username: string;
  selectedChat: { id: string, type: 'user' | 'group' };
  isAdmin: boolean;
  onEditMessage: (id: string, content: string) => Promise<void>;
  onDeleteMessage: (id: string) => void;
  onForward: (msg: Message) => void;
  onReply: (msg: Message) => void;
  onReact: (msgId: string, emoji: string) => void;
}

export default function MessageList({
  messages,
  username,
  selectedChat,
  isAdmin,
  onEditMessage,
  onDeleteMessage,
  onForward,
  onReply,
  onReact
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessagesCount = useRef(messages.length);
  const prevChatId = useRef(selectedChat.id);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isNewMessage = messages.length > prevMessagesCount.current;
    const isChatSwitched = selectedChat.id !== prevChatId.current;
    
    if (isChatSwitched) {
      scrollToBottom('auto');
    } else if (isNewMessage) {
      const lastMessage = messages[messages.length - 1];
      const sentByMe = lastMessage.from.toLowerCase() === username.toLowerCase();
      
      // Check if user is near bottom (within 150px)
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

      // Always scroll if I sent it, or if I'm already at the bottom
      if (sentByMe || isNearBottom) {
        scrollToBottom('smooth');
      }
    }

    prevMessagesCount.current = messages.length;
    prevChatId.current = selectedChat.id;
  }, [messages, selectedChat.id, username]);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-4 md:px-24 flex flex-col space-y-1 overflow-x-visible"
    >
      {/* Encrypted Notice */}
      <div className="flex justify-center mb-10 mt-4">
        <div className="bg-white/80 backdrop-blur-sm text-zinc-500 text-[11px] font-bold tracking-[0.1em] px-4 py-2 rounded-2xl shadow-sm border border-zinc-100 flex items-center gap-3 max-w-[90%] text-center">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>You can now chat with {selectedChat.id}. All messages are end-to-end encrypted.</span>
        </div>
      </div>

      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          msg={msg}
          username={username}
          isGroup={selectedChat.type === 'group'}
          isAdmin={isAdmin}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
          onForward={onForward}
          onReply={onReply}
          onReact={onReact}
        />
      ))}
      <div ref={messagesEndRef} className="h-4" />
    </div>
  );
}
