'use client';

import { 
  ShieldCheck, 
  User as UserIcon, 
  Users, 
  Plus, 
  Lock, 
  Search, 
  Bell, 
  ChevronLeft,
  ChevronRight, 
  ChevronDown,
  Download,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { User, Group, Message } from '@/hooks/useChat';
import GroupDetailsModal from '@/components/GroupDetailsModal';
import CreateNoticeModal from '@/components/CreateNoticeModal';
import NoticeHistoryModal from '@/components/NoticeHistoryModal';
import ForwardModal from '@/components/ForwardModal';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import { useState, useMemo } from 'react';

interface ChatWindowProps {
  selectedChat: { id: string, type: 'user' | 'group' } | null;
  onBack?: () => void;
  messages: Message[];
  username: string;
  users: User[];
  groups: Group[];
  isConnected: boolean;
  isReady: boolean;
  securityWarning: string | null;
  typingUsers: Record<string, boolean>;
  onTyping: () => void;
  onSendMessage: (to: string, text: string) => void;
  onSendGroupMessage: (groupId: string, text: string) => void;
  onSendTypingStatus: (to: string, isTyping: boolean) => void;
  onEditMessage: (id: string, text: string) => Promise<void>;
  onDeleteMessage: (id: string) => void;
  onUpdateGroup: (id: string, name: string, desc: string) => Promise<any>;
  onRemoveMember: (groupId: string, username: string) => Promise<boolean>;
  onAddMember: (groupId: string, username: string) => Promise<boolean>;
  onUpdateMemberRole: (groupId: string, username: string, role: 'admin' | 'member') => Promise<boolean>;
  onDeleteGroup?: (groupId: string) => Promise<boolean>;
  onReact?: (msgId: string, emoji: string) => void;
}

export default function ChatWindow({
  selectedChat,
  onBack,
  messages,
  username,
  users,
  groups,
  isConnected,
  isReady,
  securityWarning,
  typingUsers,
  onTyping,
  onSendMessage,
  onSendGroupMessage,
  onSendTypingStatus,
  onEditMessage,
  onDeleteMessage,
  onUpdateGroup,
  onRemoveMember,
  onAddMember,
  onUpdateMemberRole,
  onDeleteGroup,
  onReact
}: ChatWindowProps) {
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [isNoticeHistoryOpen, setIsNoticeHistoryOpen] = useState(false);
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastContent, setToastContent] = useState({ title: '', message: '' });

  const handleReact = (msgId: string, emoji: string) => {
    // Implement reaction logic - for now we'll just log it
    // In a real app, this would call onSendMessage with a reaction type
    console.log(`Reacting to ${msgId} with ${emoji}`);
    if (onReact) onReact(msgId, emoji);
  };

  const handleForward = (targets: { id: string, type: 'user' | 'group' }[]) => {
    if (!forwardingMessage || !isReady) return;

    targets.forEach(target => {
      if (target.type === 'user') {
        onSendMessage(target.id, forwardingMessage.content);
      } else {
        onSendGroupMessage(target.id, forwardingMessage.content);
      }
    });

    setForwardingMessage(null);
    setToastContent({ title: 'Message Forwarded', message: 'Successfully sent to selected contacts' });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleJumpToNotice = (msgId: string) => {
    const element = document.getElementById(`msg-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a temporary highlight effect
      element.classList.add('animate-pulse', 'ring-4', 'ring-wa-accent/20', 'rounded-2xl');
      setTimeout(() => {
        element.classList.remove('animate-pulse', 'ring-4', 'ring-wa-accent/20', 'rounded-2xl');
      }, 2000);
    }
  };

  // Filter notices for the top bar
  const groupNotices = useMemo(() => {
    return messages.filter(m => {
      try {
        const data = JSON.parse(m.content);
        return data.type === 'notice';
      } catch {
        return false;
      }
    });
  }, [messages]);

  const latestNotice = groupNotices.length > 0 ? groupNotices[groupNotices.length - 1] : null;
  const latestNoticeData = latestNotice ? JSON.parse(latestNotice.content) : null;

  if (!selectedChat) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 relative">
        <div className="flex flex-col items-center text-center max-w-md p-10">
          <div className="w-24 h-24 bg-violet-50 rounded-3xl flex items-center justify-center mb-8 shadow-sm shadow-violet-100 animate-in zoom-in duration-700">
            <ShieldCheck className="w-12 h-12 text-violet-600" />
          </div>
          <h3 className="text-3xl font-bold text-zinc-900 mb-4 tracking-tight">SecureChat</h3>
          <p className="text-[15px] text-zinc-500 leading-relaxed font-medium">
            Experience end-to-end encrypted messaging with military-grade security. 
            Select personnel from the directory to start a secure session.
          </p>
          <div className="mt-12 flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-[0.2em]">
            <Lock className="w-3.5 h-3.5" /> E2EE PROTECTED
          </div>
        </div>
      </div>
    );
  }

  const group = groups.find(g => g.id === selectedChat.id);
  const user = users.find(u => u.username === selectedChat.id);
  const isAdmin = selectedChat.type === 'group' && group?.role === 'admin';

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 h-full relative w-full overflow-hidden">
      <div className="flex flex-col h-full relative z-10">
        {/* Chat Header */}
        <div className="h-[60px] md:h-[64px] px-2 md:px-6 bg-white flex items-center justify-between shrink-0 border-b border-zinc-100">
          <div className="flex items-center gap-1 md:gap-3 min-w-0">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-2 md:hidden text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            <div 
              className="flex items-center gap-2 md:gap-3 cursor-pointer min-w-0" 
              onClick={() => selectedChat.type === 'group' && setIsManageMembersOpen(true)}
            >
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0 relative overflow-hidden border border-zinc-200/50 shadow-sm">
                {selectedChat.type === 'user' ? (
                  <UserIcon className="w-4 h-4 md:w-6 md:h-6 text-zinc-400" />
                ) : (
                  <Users className="w-4 h-4 md:w-6 md:h-6 text-zinc-400" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <h3 className="font-bold text-zinc-900 truncate text-[15px] md:text-base leading-tight">
                  {selectedChat.type === 'user' ? selectedChat.id : group?.name}
                </h3>
                <p className={`text-[11px] md:text-[12px] font-medium leading-tight mt-0.5 ${user?.isOnline ? 'text-emerald-600' : 'text-zinc-400'}`}>
                  {selectedChat.type === 'user' 
                    ? (user?.isOnline ? 'online' : 'offline') 
                    : `${group?.membersCount || 0} members`}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {!isConnected && (
              <span className="text-[10px] bg-red-100 text-red-600 px-2.5 py-1 rounded-lg font-bold tracking-wider hidden sm:inline-block">Offline</span>
            )}
            <button className="p-2 text-zinc-500 hover:bg-zinc-100 hover:text-violet-600 rounded-full transition-all">
              <Search className="w-5 h-5" />
            </button>
            <button className="p-2 text-zinc-500 hover:bg-zinc-100 hover:text-violet-600 rounded-full transition-all">
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>
        </div>

        {/* Security Warning Banner */}
        {securityWarning && (
          <div className="bg-amber-100 text-amber-800 p-2 text-center text-xs font-medium border-b border-amber-200">
             {securityWarning}
          </div>
        )}

        {/* Latest Notice Top Bar */}
        {selectedChat.type === 'group' && latestNoticeData && (
          <div className="bg-white/95 backdrop-blur-sm border-b border-wa-accent/10 transition-all duration-300 z-20">
            <div 
              onClick={() => setIsNoticeExpanded(!isNoticeExpanded)}
              className="px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-white transition-colors group"
            >
              <div className="w-8 h-8 rounded-full bg-wa-accent/10 flex items-center justify-center shrink-0">
                <Bell className={`w-4 h-4 text-wa-accent ${!isNoticeExpanded ? 'animate-swing' : ''}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-wa-accent leading-none mb-1">Latest Notice</p>
                <h4 className="text-xs font-semibold text-slate-800 truncate">{latestNoticeData.heading}</h4>
              </div>
              <div className="flex items-center gap-2">
                {!isNoticeExpanded && (
                  <span className="text-[10px] text-slate-400 font-medium group-hover:text-wa-accent transition-colors hidden sm:inline">
                    Click to Expand
                  </span>
                )}
                {isNoticeExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            </div>

            {isNoticeExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-50 animate-in slide-in-from-top-2 duration-200 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap mb-4">
                  {latestNoticeData.description}
                </p>

                {latestNoticeData.attachment && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between group/file">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-red-50 rounded flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-slate-700 truncate">{latestNoticeData.attachment.name}</span>
                        <span className="text-[10px] text-slate-400">PDF Document</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (latestNoticeData.attachment?.data) {
                          const link = document.createElement('a');
                          link.href = latestNoticeData.attachment.data;
                          link.download = latestNoticeData.attachment.name || 'attachment.pdf';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                      className="p-2 text-wa-accent hover:bg-wa-accent/10 rounded-full transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-50">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wide">
                    By <span className="font-bold text-wa-accent">@{latestNotice?.fromName || latestNotice?.from}</span> • {latestNotice && new Date(latestNotice.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsNoticeHistoryOpen(true);
                    }}
                    className="text-[11px] font-bold text-wa-accent hover:underline flex items-center gap-1 self-end"
                  >
                    View History <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manage Members Modal */}
        {selectedChat.type === 'group' && group && (
          <GroupDetailsModal 
            isOpen={isManageMembersOpen}
            onClose={() => setIsManageMembersOpen(false)}
            group={group}
            currentUser={username}
            onUpdateGroup={onUpdateGroup}
            onRemoveMember={onRemoveMember}
            onAddMember={onAddMember}
            onUpdateMemberRole={onUpdateMemberRole}
            onDeleteGroup={onDeleteGroup}
            allUsers={users}
          />
        )}

        <NoticeHistoryModal 
          isOpen={isNoticeHistoryOpen}
          onClose={() => setIsNoticeHistoryOpen(false)}
          notices={groupNotices}
        />

        {/* Messages */}
        <MessageList
          messages={messages}
          username={username}
          selectedChat={selectedChat}
          isAdmin={isAdmin}
          onEditMessage={onEditMessage}
          onDeleteMessage={onDeleteMessage}
          onForward={(msg) => setForwardingMessage(msg)}
          onReply={(msg) => setReplyingTo(msg)}
          onReact={handleReact}
        />

        {/* Forward Modal */}
        <ForwardModal 
          isOpen={!!forwardingMessage}
          onClose={() => setForwardingMessage(null)}
          users={users}
          groups={groups}
          onForward={handleForward}
        />

        {/* Message Input */}
        <MessageInput
          onSend={(text) => {
            if (isReady) {
              const replyMetadata = replyingTo ? {
                id: replyingTo.id,
                from: replyingTo.from,
                fromName: replyingTo.fromName || replyingTo.from,
                content: replyingTo.content
              } : undefined;

              if (selectedChat.type === 'user') {
                onSendMessage(selectedChat.id, text, replyMetadata);
              } else {
                onSendGroupMessage(selectedChat.id, text, false, replyMetadata);
              }
              setReplyingTo(null);
            }
          }}
          onTyping={onTyping}
          onNotice={() => setIsNoticeModalOpen(true)}
          isGroup={selectedChat.type === 'group'}
          isTypingIndicatorVisible={selectedChat.type === 'user' && !!typingUsers[selectedChat.id.toLowerCase()]}
          typingUser={selectedChat.id}
          replyingTo={replyingTo ? { id: replyingTo.id, from: replyingTo.fromName || replyingTo.from, content: replyingTo.content } : null}
          onCancelReply={() => setReplyingTo(null)}
          isAdmin={isAdmin}
        />

        {selectedChat.type === 'group' && (
          <CreateNoticeModal
            isOpen={isNoticeModalOpen}
            onClose={() => setIsNoticeModalOpen(false)}
            onCreate={(heading, description, attachment) => {
              if (isReady) {
                const noticeContent = JSON.stringify({ 
                  type: 'notice', 
                  heading, 
                  description,
                  attachment 
                });
                onSendGroupMessage(selectedChat.id, noticeContent, true);
                setToastContent({ title: 'Notice Published', message: 'Group notice has been sent successfully' });
                setShowToast(true);
                setTimeout(() => setShowToast(false), 3000);
              }
            }}
          />
        )}

        {selectedChat.type === 'group' && (
          <NoticeHistoryModal
            isOpen={isNoticeHistoryOpen}
            onClose={() => setIsNoticeHistoryOpen(false)}
            notices={groupNotices}
            onJumpToNotice={handleJumpToNotice}
          />
        )}
        {/* Acknowledgment Toast */}
        {showToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
            <div className="bg-white/90 backdrop-blur-md border border-emerald-100 px-5 py-3 rounded-2xl shadow-xl shadow-emerald-100/50 flex items-center gap-3 animate-in fade-in zoom-in slide-in-from-top-4 duration-500">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-bold text-zinc-900 leading-none">{toastContent.title}</p>
                <p className="text-[11px] text-zinc-500 mt-1 font-medium">{toastContent.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
