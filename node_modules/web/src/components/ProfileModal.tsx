'use client';

import { X, User as UserIcon, ShieldCheck, Mail, Briefcase, Building, Key } from 'lucide-react';
import { User } from '@/hooks/useChat';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  user?: User;
}

export default function ProfileModal({ isOpen, onClose, username, user }: ProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header/Cover */}
        <div className="h-32 bg-gradient-to-r from-violet-600 to-indigo-600 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Info */}
        <div className="px-8 pb-10 -mt-16 relative">
          {/* Avatar */}
          <div className="w-32 h-32 bg-white rounded-[2.5rem] p-1 shadow-xl mb-6">
            <div className="w-full h-full bg-zinc-100 rounded-[2.2rem] flex items-center justify-center border border-zinc-200">
              <UserIcon className="w-16 h-16 text-zinc-400" />
            </div>
          </div>

          <div className="space-y-1 mb-8">
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">{username}</h2>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Session
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-violet-600">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Role</span>
                <span className="text-sm font-bold text-zinc-800">{user?.role || 'Personnel'}</span>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-violet-600">
                <Building className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Department</span>
                <span className="text-sm font-bold text-zinc-800">{user?.department || 'General Operations'}</span>
              </div>
            </div>

            <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100 flex items-center gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-violet-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Security Status</span>
                <span className="text-sm font-bold text-violet-700">End-to-End Encrypted</span>
              </div>
            </div>
          </div>

          {/* Key Info */}
          <div className="mt-8 pt-8 border-t border-zinc-100">
             <div className="flex items-center justify-between text-zinc-400 text-[10px] font-bold uppercase tracking-widest">
                <span>Unique Identity Key</span>
                <Key className="w-3 h-3" />
             </div>
             <div className="mt-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100 font-mono text-[10px] text-zinc-500 break-all leading-tight">
                EDDSA_25519_RSA_ACTIVE_NODE_{username.toUpperCase()}_ID_SESSION
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
