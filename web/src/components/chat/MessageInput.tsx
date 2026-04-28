'use client';

import { Send, Smile, Plus, Mic, Bell } from 'lucide-react';
import { useState } from 'react';

interface MessageInputProps {
  onSend: (text: string) => void;
  onTyping: () => void;
  onNotice?: () => void;
  isGroup?: boolean;
  isTypingIndicatorVisible: boolean;
  typingUser?: string;
  placeholder?: string;
  replyingTo?: { id: string, from: string, content: string } | null;
  onCancelReply?: () => void;
  isAdmin?: boolean;
}

export default function MessageInput({
  onSend,
  onTyping,
  onNotice,
  isGroup,
  isTypingIndicatorVisible,
  typingUser,
  placeholder = "Type a message",
  replyingTo,
  onCancelReply,
  isAdmin
}: MessageInputProps) {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const commonEmojis = ['😊', '😂', '🤣', '❤️', '😍', '👍', '🙏', '😭', '😘', '🔥', '✨', '✔️', '🤔', '😎', '🙌', '🎉'];

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputText.trim()) {
      onSend(inputText);
      setInputText('');
    }
  };

  return (
    <div className="p-2 sm:p-4 bg-white flex flex-col relative shrink-0 border-t border-zinc-100 pb-safe">
      {replyingTo && (
        <div className="mx-2 mb-2 p-3 bg-zinc-50 rounded-xl border-l-4 border-violet-600 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-bold text-violet-600">Replying to {replyingTo.from}</span>
            <p className="text-xs text-zinc-500 truncate mt-0.5">{replyingTo.content}</p>
          </div>
          <button 
            onClick={onCancelReply}
            className="p-1 text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>
      )}
      {isTypingIndicatorVisible && typingUser && (
        <div className="absolute -top-7 sm:-top-8 left-4 sm:left-6 px-2 sm:px-3 py-1 sm:py-1.5 bg-white rounded-xl shadow-lg shadow-zinc-200/50 border border-zinc-100 text-[10px] sm:text-[11px] text-violet-600 font-bold flex items-center gap-1.5 sm:gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex gap-0.5 sm:gap-1">
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-violet-600 rounded-full animate-bounce delay-0"></span>
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-violet-600 rounded-full animate-bounce delay-200"></span>
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 bg-violet-600 rounded-full animate-bounce delay-400"></span>
          </div>
          <span className="capitalize truncate max-w-[100px] sm:max-w-none">{typingUser}</span> is drafting...
        </div>
      )}
      
      <div className="flex items-center gap-2 md:gap-4 max-w-full">
        <div className="flex items-center gap-0.5 sm:gap-1 relative">
          <button 
            type="button" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-1.5 sm:p-2 rounded-full transition-all ${showEmojiPicker ? 'text-violet-600 bg-violet-50' : 'text-zinc-400 hover:text-violet-600 hover:bg-violet-50'}`}
          >
            <Smile className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {showEmojiPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowEmojiPicker(false)} />
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-2xl shadow-2xl border border-zinc-100 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 grid grid-cols-4 gap-1 min-w-[160px]">
                {commonEmojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setInputText(prev => prev + emoji);
                      setShowEmojiPicker(false);
                    }}
                    className="p-2 text-xl hover:bg-zinc-50 rounded-xl transition-colors active:scale-90"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              onTyping();
            }}
            placeholder={placeholder}
            className="flex-1 px-3 sm:px-5 py-2 sm:py-3 bg-zinc-100 border border-transparent focus:border-violet-200 focus:bg-white focus:ring-4 focus:ring-violet-50 rounded-xl sm:rounded-2xl outline-none text-zinc-800 text-[14px] sm:text-[15px] font-medium placeholder:text-zinc-400 transition-all shadow-inner"
          />
          
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl transition-all flex items-center justify-center shrink-0 shadow-lg ${
              inputText.trim() 
                ? 'bg-violet-600 text-white hover:bg-violet-700 hover:scale-105 shadow-violet-200' 
                : 'bg-zinc-100 text-zinc-400 shadow-none cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5" />
          </button>

          {(isGroup && isAdmin && !inputText.trim()) && (
            <button
              type="button"
              onClick={onNotice}
              className="p-3.5 text-violet-600 hover:bg-violet-50 rounded-2xl transition-all flex items-center justify-center shrink-0"
              title="Create Notice"
            >
              <Bell className="w-6 h-6" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
