import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

function ToastIcon({ type }) {
  if (type === 'success') return <CheckCircle2 size={18} className="text-emerald-600" />;
  if (type === 'error') return <AlertTriangle size={18} className="text-rose-600" />;
  return <Info size={18} className="text-sky-600" />;
}

export default function AppToaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const { message, type = 'info', duration = 3000 } = event.detail || {};
      if (!message) return;

      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    };

    window.addEventListener('app-toast', handleToast);
    return () => window.removeEventListener('app-toast', handleToast);
  }, []);

  return (
    <div className="fixed top-5 right-5 z-[200] space-y-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto w-[320px] max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-4 flex items-start gap-3"
        >
          <div className="mt-0.5">
            <ToastIcon type={toast.type} />
          </div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex-1">{toast.message}</p>
          <button
            onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

