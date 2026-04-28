'use client';

import { X, Bell, Calendar, FileText, Download } from 'lucide-react';
import { Message } from '@/hooks/useChat';

interface NoticeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  notices: Message[];
  onJumpToNotice: (id: string) => void;
}

export default function NoticeHistoryModal({ isOpen, onClose, notices, onJumpToNotice }: NoticeHistoryModalProps) {
  if (!isOpen) return null;

  const parseNotice = (content: string) => {
    try {
      const data = JSON.parse(content);
      if (data.type === 'notice') return data;
    } catch (e) {
      return null;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
        <div className="bg-wa-header px-6 py-4 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2 text-wa-accent">
            <Bell className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Notice History</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:bg-slate-200 p-1 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {notices.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No notices found in this group.</p>
            </div>
          ) : (
            notices.map((msg) => {
              const data = parseNotice(msg.content);
              if (!data) return null;
              return (
                <div 
                  key={msg.id} 
                  onClick={() => {
                    onJumpToNotice(msg.id);
                    onClose();
                  }}
                  className="bg-slate-50 rounded-lg p-4 border border-slate-100 hover:border-wa-accent/30 transition-all cursor-pointer hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-900 leading-tight">{data.heading}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 whitespace-nowrap bg-white px-2 py-0.5 rounded border border-slate-100">
                      <Calendar className="w-3 h-3" />
                      {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{data.description}</p>
                  
                  {data.attachment && (
                    <div className="mt-3 p-2 bg-white rounded border border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
                        <span className="text-xs text-slate-600 truncate">{data.attachment.name}</span>
                      </div>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = data.attachment.data;
                          link.download = data.attachment.name || 'attachment.pdf';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="text-wa-accent hover:bg-wa-accent/10 p-1 rounded"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="font-medium text-wa-accent">@{msg.fromName || msg.from}</span>
                  </div>
                </div>
              );
            }).reverse()
          )}
        </div>
      </div>
    </div>
  );
}
