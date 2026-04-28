'use client';

import { Pencil, Trash2, Check, CheckCheck, Bell, Forward, Download, FileText, Plus } from 'lucide-react';
import { canModifyMessage } from '@/lib/messageUtils';
import { Message } from '@/hooks/useChat';
import { useState } from 'react';

interface MessageItemProps {
  msg: Message;
  username: string;
  isGroup: boolean;
  isAdmin: boolean;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
  onForward: (msg: Message) => void;
  onReply: (msg: Message) => void;
  onReact: (msgId: string, emoji: string) => void;
}

export default function MessageItem({
  msg,
  username,
  isGroup,
  isAdmin,
  onEdit,
  onDelete,
  onForward,
  onReply,
  onReact
}: MessageItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.content);
  const [showActions, setShowActions] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const isMe = msg.from.trim().toLowerCase() === username.trim().toLowerCase();

  const renderNotice = () => {
    try {
      const data = JSON.parse(msg.content);
      if (data.type === 'notice') {
        const handleDownload = () => {
          if (data.attachment?.data) {
            const link = document.createElement('a');
            link.href = data.attachment.data;
            link.download = data.attachment.name || 'attachment.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        };

        return (
          <div className="w-full my-3 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white rounded-xl shadow-md border-l-4 border-wa-accent overflow-hidden w-full max-w-sm relative group/notice">
              <div className="bg-wa-accent/5 px-4 py-3 flex items-center justify-between border-b border-wa-accent/10">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-wa-accent" />
                  <span className="text-xs font-bold text-wa-accent tracking-wider">Group Notice</span>
                </div>
                <button 
                  onClick={() => onForward(msg)}
                  className="p-1.5 hover:bg-wa-accent/10 rounded-full text-wa-accent opacity-0 group-hover/notice:opacity-100 transition-opacity"
                  title="Forward Notice"
                >
                  <Forward className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4">
                <h4 className="text-slate-900 font-bold text-lg mb-1 leading-tight">{data.heading}</h4>
                <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap mb-3">{data.description}</p>
                
                {data.attachment && (
                  <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between group/file">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-red-50 rounded flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-red-500" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-slate-700 truncate">{data.attachment.name}</span>
                        <span className="text-[10px] text-slate-400">PDF Document</span>
                      </div>
                    </div>
                    <button 
                      onClick={handleDownload}
                      className="p-2 text-wa-accent hover:bg-wa-accent/10 rounded-full transition-colors"
                      title="Download PDF"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="bg-slate-50 px-4 py-2 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-100">
                <span>By {msg.fromName || msg.from}</span>
                <span>{new Date(msg.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
              </div>
            </div>
          </div>
        );
      }
    } catch (e) {
      // Not a JSON notice
    }
    return null;
  };

  const notice = renderNotice();
  if (notice) return <div id={`msg-${msg.id}`} className="scroll-mt-20">{notice}</div>;

  return (
    <div id={`msg-${msg.id}`} className={`flex flex-col mb-2 ${isMe ? 'items-end' : 'items-start'} scroll-mt-20`}>
      <div 
        onContextMenu={(e) => {
          e.preventDefault();
          setShowActions(!showActions);
        }}
        onTouchStart={() => {
          const timer = setTimeout(() => {
            setShowActions(true);
            if (navigator.vibrate) navigator.vibrate(50);
          }, 500); // 500ms for long press
          setLongPressTimer(timer);
        }}
        onTouchEnd={() => {
          if (longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
          }
        }}
        className={`max-w-[85%] px-3 sm:px-4 py-2 rounded-2xl shadow-sm relative group cursor-pointer select-none transition-all duration-300 ${
        showActions ? 'scale-[1.02] z-[1001] ring-4 ring-wa-accent/10' : ''
        } ${
        isMe 
          ? 'bg-wa-bubble-sent text-white rounded-tr-sm' 
          : 'bg-wa-bubble-received text-zinc-800 rounded-tl-sm border border-zinc-200'
        }`}
      >
        {/* Selection Glow */}
        {showActions && (
          <div className="absolute inset-0 bg-wa-accent/5 rounded-2xl animate-pulse" />
        )}

        {!isMe && isGroup && (
          <span className="text-[13px] font-bold text-wa-accent mb-1 block">
            {msg.from}
          </span>
        )}
        
        {isEditing ? (
          <div className="space-y-2 min-w-[200px]">
            <textarea 
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full p-2 bg-white text-zinc-800 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-wa-accent/20"
              autoFocus
              rows={2}
            />
            <div className="flex gap-2 justify-end">
              <button 
                onClick={async () => {
                  await onEdit(msg.id, editValue);
                  setIsEditing(false);
                }}
                className="text-xs font-bold bg-wa-accent text-white px-3 py-1.5 rounded-full shadow-sm hover:brightness-110 transition-all"
              >
                Save Changes
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-xs font-bold text-zinc-500 hover:bg-zinc-100 px-3 py-1.5 rounded-full transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col relative group">
            {/* Reply Quote (WhatsApp Style) */}
            {msg.replyTo && (
              <div className={`
                mb-1.5 p-2 rounded-lg border-l-[4px] border-violet-500/50 flex flex-col gap-0.5 cursor-pointer hover:bg-black/10 transition-colors
                ${isMe ? 'bg-white/10' : 'bg-black/5'}
              `}>
                <span className="text-[11px] font-black text-violet-400 tracking-tight">
                  {msg.replyTo.fromName || msg.replyTo.from}
                </span>
                <p className={`text-[12px] line-clamp-2 leading-snug ${isMe ? 'text-white/70' : 'text-zinc-600'}`}>
                  {msg.replyTo.content}
                </p>
              </div>
            )}

            <p className="text-[14.5px] leading-relaxed break-words font-medium pr-10">
              {msg.content}
            </p>
            
            <div className="flex items-center justify-end mt-1 gap-1.5 h-4">
              {msg.isEdited && <span className={`text-[10px] italic ${isMe ? 'text-white/70' : 'text-zinc-400'}`}>edited</span>}
              <span className={`text-[10px] font-medium tracking-wider ${isMe ? 'text-white/80' : 'text-zinc-500'}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {isMe && !isGroup && (
                <div className="flex ml-0.5">
                  {msg.status === 'read' ? (
                    <CheckCheck className="w-[14px] h-[14px] text-white" strokeWidth={3} />
                  ) : msg.status === 'delivered' ? (
                    <CheckCheck className="w-[14px] h-[14px] text-white/60" strokeWidth={3} />
                  ) : (
                    <Check className="w-[14px] h-[14px] text-white/60" strokeWidth={3} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* WhatsApp Mobile Dark Style - Compact Side Menu */}
        {showActions && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[100]" 
              onClick={(e) => { e.stopPropagation(); setShowActions(false); }}
            />
            

            {/* Compact Action Menu (Beside Message) */}
            <div className={`
              absolute top-0 ${isMe ? '-left-2 -translate-x-full' : '-right-2 translate-x-full'} 
              bg-[#1f2225] py-1.5 shadow-2xl rounded-xl border border-white/5 z-[101] min-w-[140px] animate-in fade-in slide-in-from-top-1 duration-150
            `}>
              <button 
                onClick={(e) => { e.stopPropagation(); onReply(msg); setShowActions(false); }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-white hover:bg-white/5 transition-colors"
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6"/></svg>
                </div>
                <span className="text-[13.5px] font-medium">Reply</span>
              </button>

              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  navigator.clipboard.writeText(msg.content);
                  setShowActions(false);
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-white hover:bg-white/5 transition-colors"
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </div>
                <span className="text-[13.5px] font-medium">Copy</span>
              </button>

              <button 
                onClick={(e) => { e.stopPropagation(); onForward(msg); setShowActions(false); }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-white hover:bg-white/5 transition-colors"
              >
                <Forward className="w-4 h-4 text-white/60 shrink-0" />
                <span className="text-[13.5px] font-medium">Forward</span>
              </button>
              
              {isMe && canModifyMessage(msg.timestamp) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                    setEditValue(msg.content);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-white hover:bg-white/5 transition-colors"
                >
                  <Pencil className="w-4 h-4 text-white/60 shrink-0" />
                  <span className="text-[13.5px] font-medium">Edit</span>
                </button>
              )}

              <div className="h-[0.5px] bg-white/5 mx-3 my-1" />
              
              {isMe && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Delete message?')) onDelete(msg.id);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400/80 shrink-0" />
                  <span className="text-[13.5px] font-medium">Delete</span>
                </button>
              )}

              {isGroup && isAdmin && !isMe && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Admin Delete?')) onDelete(msg.id);
                    setShowActions(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-400/80 shrink-0" />
                  <span className="text-[13.5px] font-medium">Delete for everyone</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
