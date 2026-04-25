'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, User as UserIcon, Search, ArrowLeft, MessageSquare } from 'lucide-react';

interface StaffMember {
  username: string;
  department: string;
  role: string;
  employeeId: string;
}

export default function StaffDirectory() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCurrentUsername(localStorage.getItem('chat_username'));
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStaff = staff.filter(s => 
    s.username.trim() !== currentUsername?.trim() && (
      s.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department && s.department.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.role && s.role.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  // Group by Department
  const groupedStaff = filteredStaff.reduce((acc, curr) => {
    const dept = curr.department || 'Unassigned';
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(curr);
    return acc;
  }, {} as Record<string, StaffMember[]>);

  const handleStartChat = (username: string) => {
    // For now, we save to localStorage and redirect to Home
    // Home page will read this and auto-select the user
    localStorage.setItem('temp_selected_user', username);
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans tracking-wide">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-widest text-blue-950">Select Personnel</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                {staff.length} Cleared Staff Members
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="SEARCH BY NAME, DEPARTMENT OR ROLE..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-sm text-xs font-bold uppercase tracking-widest focus:ring-2 focus:ring-blue-600 outline-none shadow-sm"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-4 border-blue-700 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Accessing Classified Directory...</p>
          </div>
        ) : (
          Object.keys(groupedStaff).sort().map(dept => (
            <section key={dept} className="space-y-3">
              <h2 className="text-[10px] font-bold text-blue-800 uppercase tracking-[0.2em] px-2">{dept}</h2>
              <div className="bg-white border border-slate-200 rounded-sm shadow-sm overflow-hidden divide-y divide-slate-100">
                {groupedStaff[dept].map(member => (
                  <button
                    key={member.username}
                    onClick={() => handleStartChat(member.username)}
                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-all group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-sm flex items-center justify-center relative">
                        <UserIcon className="w-6 h-6 text-slate-400" />
                        <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-slate-300 border-2 border-white"></div>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">{member.username.trim()}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{member.role || 'Personnel'}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-1">ID: {member.employeeId}</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-sm border border-slate-100 text-slate-400 group-hover:text-blue-700 group-hover:border-blue-100 group-hover:bg-blue-50 transition-all">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}

        {!isLoading && filteredStaff.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xs text-slate-400 uppercase tracking-widest italic">No personnel matching search criteria</p>
          </div>
        )}
      </main>

      {/* Footer Branding */}
      <footer className="text-center py-10 opacity-30">
        <div className="flex items-center justify-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Gov-Secure Classified Network</span>
        </div>
      </footer>
    </div>
  );
}
