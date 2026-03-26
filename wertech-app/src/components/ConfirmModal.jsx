import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", type = "danger" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl border dark:border-slate-800 animate-in fade-in zoom-in duration-200">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
          type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'
        }`}>
          <AlertTriangle size={28} />
        </div>

        <h3 className="text-xl font-black dark:text-white mb-2">{title}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-8">
          {message}
        </p>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 py-4 text-white rounded-2xl font-black text-xs transition-all hover:scale-[1.02] shadow-lg ${
              type === 'danger' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-[#0d9488] shadow-teal-500/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}