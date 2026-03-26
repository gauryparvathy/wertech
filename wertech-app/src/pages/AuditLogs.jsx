import React from 'react';
import { Clock } from 'lucide-react';

export default function AuditLogs() {
  const logs = [
    { id: 1, admin: "Admin_Zero", action: "Deleted Post", time: "2m ago" },
    { id: 2, admin: "Admin_Zero", action: "Updated Fee", time: "1h ago" },
  ];

  return (
    <div className="p-10 max-w-4xl mx-auto">
      <h1 className="text-4xl font-black dark:text-white mb-10">Audit Logs</h1>
      <div className="space-y-4">
        {logs.map(log => (
          <div key={log.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border dark:border-slate-800 flex justify-between items-center">
            <div className="flex gap-4 items-center">
              <Clock className="text-slate-400" />
              <span className="font-bold dark:text-white">{log.admin} performed {log.action}</span>
            </div>
            <span className="text-xs font-black text-slate-400 uppercase">{log.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}