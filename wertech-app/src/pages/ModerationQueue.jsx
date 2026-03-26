import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, CheckCircle, XCircle, X, User, Clock, AlertTriangle } from 'lucide-react';

function formatAgo(value) {
  if (!value) return 'Just now';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'Just now';
  const diff = Date.now() - time;
  if (diff < 60000) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function getPriority(reason) {
  const value = String(reason || '').toLowerCase();
  if (value.includes('scam') || value.includes('hate')) return 'High';
  if (value.includes('improper') || value.includes('fraud')) return 'Medium';
  return 'Low';
}

export default function ModerationQueue() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(new Date());

  const loadReports = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/admin/reports?status=open');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Could not load reports');
      }
      const rows = Array.isArray(data) ? data : [];
      setReports(rows);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setError(err?.message || 'Could not load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    const timer = setInterval(loadReports, 3000);
    return () => clearInterval(timer);
  }, [loadReports]);

  const tableRows = useMemo(
    () =>
      reports.map((report) => ({
        _id: String(report._id),
        displayId: `R-${String(report._id).slice(-4).toUpperCase()}`,
        user: String(report.reporter_username || ''),
        reason: String(report.reason || 'OTHER').toUpperCase(),
        date: formatAgo(report.created_at),
        created_at: report.created_at,
        content: String(report.details || ''),
        reportedUsername: String(report.reported_username || ''),
        priority: getPriority(report.reason)
      })),
    [reports]
  );

  const updateReportStatus = async (reportId, nextStatus) => {
    if (!reportId || !nextStatus) return;
    setBusyId(reportId);
    try {
      const response = await fetch(`/api/admin/reports/${encodeURIComponent(reportId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Could not update report');
      }
      setReports((prev) => prev.filter((r) => String(r._id) !== String(reportId)));
      if (selectedReport && String(selectedReport._id) === String(reportId)) {
        setSelectedReport(null);
      }
    } catch (err) {
      setError(err?.message || 'Could not update report');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="p-10 bg-slate-50 dark:bg-slate-950 min-h-screen relative overflow-hidden">
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setSelectedReport(null)} />
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl p-10 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-10">
              <span className="bg-teal-50 text-teal-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Case Details</span>
              <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div>
                <h2 className="text-3xl font-black dark:text-white tracking-tight mb-2">{selectedReport.displayId}</h2>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1 text-slate-400 text-xs font-bold"><User size={14} /> @{selectedReport.user}</span>
                  <span className="flex items-center gap-1 text-slate-400 text-xs font-bold"><Clock size={14} /> {selectedReport.date}</span>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-[#0d9488] uppercase tracking-widest mb-3">Violation Type</p>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
                  <AlertTriangle size={18} className={selectedReport.priority === 'High' ? 'text-rose-500' : 'text-amber-500'} />
                  {selectedReport.reason}
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Reported User</p>
                <p className="text-sm font-bold text-rose-600">@{selectedReport.reportedUsername}</p>
              </div>

              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Reported Details</p>
                <div className="text-slate-600 dark:text-slate-400 leading-relaxed bg-white dark:bg-slate-950 p-6 rounded-[24px] border dark:border-slate-800 shadow-sm italic">
                  {selectedReport.content ? `"${selectedReport.content}"` : 'No extra details provided.'}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t dark:border-slate-800 flex gap-4">
              <button
                disabled={busyId === selectedReport._id}
                onClick={() => updateReportStatus(selectedReport._id, 'reviewed')}
                className="flex-1 py-4 bg-teal-500 text-white font-black rounded-2xl hover:bg-teal-600 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckCircle size={20} /> Resolve
              </button>
              <button
                disabled={busyId === selectedReport._id}
                onClick={() => updateReportStatus(selectedReport._id, 'dismissed')}
                className="flex-1 py-4 bg-rose-50 text-rose-500 font-black rounded-2xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <XCircle size={20} /> Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Moderation Queue</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Reviewing {tableRows.length} Pending Reports</p>
        </div>
        <div className="text-xs font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-100 dark:border-slate-800">
          Last updated: {formatAgo(lastUpdatedAt)}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse sticky-header">
            <thead className="sticky top-0 bg-white dark:bg-slate-900 z-10">
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b dark:border-slate-800">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporter</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Time</th>
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {!loading && tableRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm font-bold text-slate-400">
                    No open reports.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm font-bold text-slate-400">
                    Loading reports...
                  </td>
                </tr>
              )}
              {tableRows.map((report) => (
                <tr key={report._id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="p-6 text-sm font-bold dark:text-white">{report.displayId}</td>
                  <td className="p-6 text-sm font-medium dark:text-slate-300">@{report.user}</td>
                  <td className="p-6">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        report.priority === 'High'
                          ? 'bg-rose-100 text-rose-600'
                          : report.priority === 'Medium'
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {report.reason}
                    </span>
                  </td>
                  <td className="p-6 text-xs text-slate-400 font-bold">{report.date}</td>
                  <td className="p-6 text-right space-x-3">
                    <button onClick={() => setSelectedReport(report)} className="p-2 text-slate-300 hover:text-teal-500 transition-all hover:scale-110">
                      <Eye size={20} />
                    </button>
                    <button
                      disabled={busyId === report._id}
                      onClick={() => updateReportStatus(report._id, 'reviewed')}
                      className="p-2 text-slate-300 hover:text-green-500 transition-all hover:scale-110 disabled:opacity-50"
                    >
                      <CheckCircle size={20} />
                    </button>
                    <button
                      disabled={busyId === report._id}
                      onClick={() => updateReportStatus(report._id, 'dismissed')}
                      className="p-2 text-slate-300 hover:text-rose-500 transition-all hover:scale-110 disabled:opacity-50"
                    >
                      <XCircle size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

