import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus, Mail, Trash2, MoreVertical, X, AlertTriangle, Flag, Check } from 'lucide-react';

export default function AdminProfiles() {
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedUsername, setSelectedUsername] = useState('');

  const [admins, setAdmins] = useState([]);
  const [inviteUsers, setInviteUsers] = useState([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingInviteUsers, setLoadingInviteUsers] = useState(true);
  const [savingInvite, setSavingInvite] = useState(false);
  const [removingAdmin, setRemovingAdmin] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });

  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  const showNotification = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const loadAdminData = useCallback(async () => {
    try {
      const [adminsRes, usersRes] = await Promise.all([
        fetch('/api/admin/profiles'),
        fetch('/api/admin/users')
      ]);

      const [adminsData, usersData] = await Promise.all([
        adminsRes.json(),
        usersRes.json()
      ]);

      if (adminsRes.ok && Array.isArray(adminsData)) {
        setAdmins(adminsData);
      }

      if (usersRes.ok && Array.isArray(usersData)) {
        setInviteUsers(usersData);
        if (!selectedUsername && usersData.length > 0) {
          setSelectedUsername(usersData[0].username);
        }
      }
    } catch (err) {
      // no-op
    } finally {
      setLoadingAdmins(false);
      setLoadingInviteUsers(false);
    }
  }, [selectedUsername]);

  useEffect(() => {
    loadAdminData();
    const timer = setInterval(loadAdminData, 5000);
    return () => clearInterval(timer);
  }, [loadAdminData]);

  useEffect(() => {
    const loadReports = async () => {
      setLoadingReports(true);
      try {
        const response = await fetch('/api/admin/reports');
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) return;
        setReports(data);
      } catch (err) {
        // no-op
      } finally {
        setLoadingReports(false);
      }
    };
    loadReports();
    const timer = setInterval(loadReports, 5000);
    return () => clearInterval(timer);
  }, []);

  const openInviteModal = () => {
    if (!selectedUsername && inviteUsers.length > 0) {
      setSelectedUsername(inviteUsers[0].username);
    }
    setShowModal(true);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!selectedUsername) return;

    setSavingInvite(true);
    try {
      const response = await fetch('/api/admin/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedUsername })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Could not invite admin');
      }

      setShowModal(false);
      showNotification('Admin invited successfully');
      await loadAdminData();
    } catch (err) {
      showNotification(err?.message || 'Could not invite admin');
    } finally {
      setSavingInvite(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.username) return;

    setRemovingAdmin(true);
    try {
      const response = await fetch(`/api/admin/profiles/${encodeURIComponent(deleteTarget.username)}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Could not remove admin');
      }

      setDeleteTarget(null);
      showNotification('Admin removed successfully');
      await loadAdminData();
    } catch (err) {
      showNotification(err?.message || 'Could not remove admin');
    } finally {
      setRemovingAdmin(false);
    }
  };

  return (
    <div className="p-10 bg-slate-50 dark:bg-slate-950 min-h-screen relative">
      {toast.show && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-10 duration-300">
          <div className="bg-teal-500 p-1 rounded-full"><Check size={14} /></div>
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-10 shadow-2xl border dark:border-slate-800 animate-in zoom-in duration-200">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-black dark:text-white mb-3">Remove Admin?</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold leading-relaxed mb-10">
              Are you sure you want to remove <span className="text-slate-900 dark:text-white">@{deleteTarget.username}</span> from admins?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={removingAdmin}
                className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-xs hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={removingAdmin}
                className="flex-1 py-4 bg-rose-500 text-white rounded-2xl font-black text-xs hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-60"
              >
                {removingAdmin ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] p-10 shadow-2xl border dark:border-slate-800 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black dark:text-white">Invite New Admin</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Select User</label>
                <select
                  required
                  value={selectedUsername}
                  onChange={(e) => setSelectedUsername(e.target.value)}
                  className="w-full p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl dark:text-white outline-none appearance-none"
                >
                  {loadingInviteUsers && <option value="">Loading users...</option>}
                  {!loadingInviteUsers && inviteUsers.length === 0 && (
                    <option value="">No non-admin users available</option>
                  )}
                  {!loadingInviteUsers && inviteUsers.map((u) => (
                    <option key={u.username} value={u.username}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={savingInvite || !selectedUsername || inviteUsers.length === 0}
                className="w-full py-5 bg-[#0d9488] text-white font-black rounded-2xl hover:shadow-lg hover:shadow-teal-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <UserPlus size={20} />
                {savingInvite ? 'Inviting...' : 'Send Invitation'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Admin Profiles</h1>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Management Access Control</p>
        </div>
        <button
          onClick={openInviteModal}
          disabled={loadingInviteUsers}
          className="flex items-center gap-2 bg-[#0d9488] text-white px-8 py-4 rounded-2xl font-black hover:scale-105 transition-all shadow-xl shadow-teal-500/20 disabled:opacity-60"
        >
          <UserPlus size={20} /> Invite Admin
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {loadingAdmins && (
          <p className="text-sm font-bold text-slate-400">Loading admin profiles...</p>
        )}

        {!loadingAdmins && admins.length === 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-10">
            <p className="text-sm font-bold text-slate-400">No admin profiles found.</p>
          </div>
        )}

        {!loadingAdmins && admins.map((admin) => (
          <div key={admin.username} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] p-10 relative group hover:shadow-2xl transition-all">
            <button className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors">
              <MoreVertical size={20} />
            </button>
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-2xl font-black dark:text-white mb-8 shadow-inner">
              {String(admin.username || '?').charAt(0).toUpperCase()}
            </div>
            <h3 className="text-xl font-black dark:text-white leading-tight">{admin.username}</h3>
            <p className="text-[#0d9488] text-[10px] font-black uppercase tracking-widest mt-1 mb-4">ADMIN</p>
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-10">
              <Mail size={14} /> <span className="truncate">{admin.email}</span>
            </div>
            <div className="pt-8 border-t dark:border-slate-800 flex gap-3">
              <button
                onClick={() => setDeleteTarget(admin)}
                className="w-full py-4 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all font-black text-xs"
              >
                <span className="inline-flex items-center justify-center gap-2"><Trash2 size={16} /> Remove Admin</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[36px] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Flag size={18} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">User Reports</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Who reported whom</p>
          </div>
        </div>
        {loadingReports && (
          <p className="text-sm font-bold text-slate-400">Loading reports...</p>
        )}
        {!loadingReports && reports.length === 0 && (
          <p className="text-sm font-bold text-slate-400">No reports yet.</p>
        )}
        {!loadingReports && reports.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Reporter</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Reported User</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Reason</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Details</th>
                  <th className="p-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Time</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r._id} className="border-b border-slate-50 dark:border-slate-800/50">
                    <td className="p-3 text-sm font-bold dark:text-white">{r.reporter_username}</td>
                    <td className="p-3 text-sm font-bold text-rose-600">{r.reported_username}</td>
                    <td className="p-3 text-xs font-black uppercase text-amber-600">{r.reason}</td>
                    <td className="p-3 text-xs text-slate-500 max-w-[280px] truncate">{r.details || '-'}</td>
                    <td className="p-3 text-xs font-bold text-slate-400">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

