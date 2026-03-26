import React from 'react';
import { ShieldAlert, Trash2, ExternalLink } from 'lucide-react';

export default function AdminModeration() {
  const reports = [
    { id: 1, item: "Suspect Luxury Watch", user: "User_88", reason: "Potential Counterfeit" },
    { id: 2, item: "Inappropriate Content", user: "User_12", reason: "Policy Violation" }
  ];

  return (
    <div className="grid grid-cols-2 gap-8">
      {reports.map((r) => (
        <div key={r.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border-2 border-red-50 dark:border-red-900/20 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div className="bg-red-100 text-red-600 p-3 rounded-2xl"><ShieldAlert size={24}/></div>
            <button className="text-slate-400 hover:text-teal-600"><ExternalLink size={20}/></button>
          </div>
          <h4 className="text-xl font-black mb-1">{r.item}</h4>
          <p className="text-sm text-slate-400 font-bold mb-8">Reported User: {r.user} • Reason: {r.reason}</p>
          <div className="flex gap-4">
            <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold">Dismiss</button>
            <button className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2">
              <Trash2 size={18}/> Delete Post
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}