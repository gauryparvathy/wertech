import React from 'react';
import { ShieldCheck, LayoutDashboard, Users, AlertCircle, BarChart3 } from 'lucide-react';

export default function AdminLayout({ children, activeTab, setActiveTab }) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      {/* SIDEBAR */}
      <aside className="w-72 bg-white dark:bg-slate-900 border-r dark:border-slate-800 p-8 flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="bg-teal-600 p-2 rounded-xl text-white"><ShieldCheck size={24}/></div>
          <span className="text-xl font-black tracking-tighter">ADMIN.PANEL</span>
        </div>

        <nav className="flex flex-col gap-2">
          <NavItem label="Dashboard" icon={<LayoutDashboard size={20}/>} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem label="Users" icon={<Users size={20}/>} active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <NavItem label="Moderation" icon={<AlertCircle size={20}/>} active={activeTab === 'mod'} onClick={() => setActiveTab('mod')} />
          <NavItem label="Financials" icon={<BarChart3 size={20}/>} active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} />
        </nav>

        <div className="mt-auto bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
          <p className="text-[10px] font-black uppercase text-slate-400 text-center">Security Level: High</p>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-10">
        {children}
      </main>
    </div>
  );
}

function NavItem({ label, icon, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm transition-all ${active ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/20' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
      {icon} {label}
    </button>
  );
}
