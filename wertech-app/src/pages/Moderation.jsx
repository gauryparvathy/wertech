import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, UserX, Eye, Search, MoreHorizontal } from 'lucide-react';

export default function Moderation() {
  const users = [
    { name: "Arjun Das", location: "Kochi", rating: "4.9", status: "Verified" },
    { name: "Sana K.", location: "Mumbai", rating: "4.7", status: "Verified" },
    { name: "Rahul K.", location: "Kochi", rating: "4.2", status: "Warning" }
  ];

  return (
    <div className="p-10 space-y-10 bg-white dark:bg-slate-950 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">User Moderation</h1>
        <div className="relative w-80">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            placeholder="Search users..." 
            className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <tr>
              {["User", "Rating", "Status", "Actions"].map((head) => (
                <th key={head} className="p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {users.map((user, i) => (
              <motion.tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="p-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center font-black text-white">{user.name[0]}</div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-slate-400 font-bold">{user.location}</p>
                    </div>
                  </div>
                </td>
                <td className="p-8 font-black text-teal-600">{user.rating} / 5.0</td>
                <td className="p-8">
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                    user.status === 'Verified' ? 'bg-teal-500/10 text-teal-600' : 'bg-red-500/10 text-red-500'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-8">
                  <div className="flex gap-2">
                    <button className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-teal-600 rounded-xl transition-all"><Eye size={18}/></button>
                    <button className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 rounded-xl transition-all"><UserX size={18}/></button>
                    <button className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-xl transition-all"><MoreHorizontal size={18}/></button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}