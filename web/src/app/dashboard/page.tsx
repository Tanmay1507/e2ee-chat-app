'use client';

import { 
  Menu, 
  ChevronDown, 
  User as UserIcon, 
  Clock, 
  Calendar, 
  FileText, 
  Plus, 
  AlertTriangle,
  LayoutDashboard,
  CheckCircle2,
  List,
  RefreshCw,
  LogOut
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-[#2c5282] h-[70px] flex items-center px-4 justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all">
            <Menu className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-white/20">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full opacity-40 blur-[2px]"></div>
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">Shiksha Sutra</h1>
              <p className="text-white/60 text-[10px] font-medium">Mangrule Technologies Pvt. Ltd.</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex items-center bg-gradient-to-r from-red-600 to-orange-500 px-4 py-1.5 rounded-md shadow-lg border border-white/10 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-white mr-2" />
          <span className="text-white text-[11px] font-bold uppercase tracking-widest">Test Server</span>
        </div>

        <div className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all cursor-pointer group">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col items-end mr-1">
            <p className="text-white text-xs font-bold">Management User <span className="text-[10px] font-medium text-white/60 ml-1 italic">Profile</span></p>
          </div>
          <ChevronDown className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-8">
        {/* Welcome Section */}
        <div className="space-y-1">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
          <p className="text-slate-500 text-sm font-medium">Welcome back, <span className="text-slate-700 font-bold">Management User</span></p>
        </div>

        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Employee Info Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3 text-slate-500">
                  <UserIcon className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Employee ID</span>
                </div>
                <span className="text-sm font-bold text-slate-900">10001</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3 text-slate-500">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Institute</span>
                </div>
                <span className="text-sm font-bold text-slate-900">SYCET</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3 text-slate-500">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Department</span>
                </div>
                <span className="text-sm font-bold text-slate-900">Non-Teaching</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3 text-slate-500">
                  <UserIcon className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Designation</span>
                </div>
                <span className="text-sm font-bold text-slate-900">Management</span>
              </div>
            </div>
          </div>

          {/* Work Timings Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-2 bg-slate-50/50 border-b border-slate-100 flex items-center px-5">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest py-2">Work Timings</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3 text-slate-500">
                  <RefreshCw className="w-4 h-4 rotate-90" />
                  <span className="text-xs font-semibold uppercase tracking-wider">In</span>
                </div>
                <span className="text-sm font-bold text-slate-900">10:00 AM</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3 text-slate-500">
                  <RefreshCw className="w-4 h-4 -rotate-90" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Out</span>
                </div>
                <span className="text-sm font-bold text-slate-900">05:30 AM</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3 text-slate-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Hours</span>
                </div>
                <span className="text-sm font-bold text-slate-900 italic text-slate-400">NaNh NaNm</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
            <div className="p-2 bg-slate-50/50 border-b border-slate-100 flex items-center px-5">
              <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest py-2">Quick Actions</h3>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 flex-1">
              <button className="bg-[#4f46e5] hover:bg-[#4338ca] text-white p-3 rounded-lg flex items-center gap-2 shadow-sm transition-all text-left">
                <div className="bg-white/20 p-1.5 rounded-md">
                   <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold leading-tight">Attendance Summary</span>
              </button>
              <button className="bg-[#10b981] hover:bg-[#059669] text-white p-3 rounded-lg flex items-center gap-2 shadow-sm transition-all text-left">
                <div className="bg-white/20 p-1.5 rounded-md">
                   <Calendar className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold leading-tight">My Monthly Attendance</span>
              </button>
              <button className="bg-[#f59e0b] hover:bg-[#d97706] text-white p-3 rounded-lg flex items-center gap-2 shadow-sm transition-all text-left">
                <div className="bg-white/20 p-1.5 rounded-md">
                   <Plus className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold leading-tight">Apply Leave</span>
              </button>
              <button className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white p-3 rounded-lg flex items-center gap-2 shadow-sm transition-all text-left">
                <div className="bg-white/20 p-1.5 rounded-md">
                   <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold leading-tight">Temporary Shift Change</span>
              </button>
              <button className="bg-[#a855f7] hover:bg-[#9333ea] text-white p-3 rounded-lg flex items-center gap-2 shadow-sm transition-all text-left">
                <div className="bg-white/20 p-1.5 rounded-md">
                   <Clock className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold leading-tight">view Deductions</span>
              </button>
              <button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white p-3 rounded-lg flex items-center gap-2 shadow-sm transition-all text-left">
                <div className="bg-white/20 p-1.5 rounded-md">
                   <RefreshCw className="w-3.5 h-3.5" />
                </div>
                <span className="text-[11px] font-bold leading-tight">Permanently Shift Change</span>
              </button>
            </div>
          </div>
        </div>

        {/* Daily Progress Report Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800">Daily Progress Report</h3>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">0 records</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="bg-[#3b82f6] hover:bg-[#2563eb] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
                <List className="w-3.5 h-3.5" />
                Approvals
              </button>
              <button className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" />
                All DPR
              </button>
              <button className="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                Add DPR
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3 opacity-40">
                      <FileText className="w-12 h-12 text-slate-400" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-600">No DPR records found</p>
                        <p className="text-xs text-slate-500">Click &quot;Add DPR&quot; to create your first record</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
             <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               Page 1 of 0
             </div>
             <div className="flex items-center gap-2">
                <button disabled className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-300 transition-colors">
                  <ChevronDown className="w-4 h-4 rotate-90" />
                </button>
                <button disabled className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-300 transition-colors">
                  <ChevronDown className="w-4 h-4 -rotate-90" />
                </button>
             </div>
          </div>
        </div>
      </main>

      <footer className="max-w-[1400px] mx-auto p-8 border-t border-slate-200 mt-12 flex flex-col md:flex-row items-center justify-between gap-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span>&copy; 2024 Mangrule Technologies Pvt. Ltd.</span>
          <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
          <span>Shiksha Sutra v2.4.1</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="#" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
          <Link href="#" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
          <Link href="#" className="hover:text-slate-600 transition-colors">Support</Link>
        </div>
      </footer>
    </div>
  );
}
