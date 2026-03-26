import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, UserMinus, Search } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, userName, busy }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl border dark:border-slate-800 scale-100 animate-in zoom-in duration-300">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-50 dark:bg-red-900/20 mb-6">
            <UserMinus className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Delete User?</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
            Are you sure you want to remove <span className="font-bold text-slate-900 dark:text-slate-200">{userName}</span>? This action will permanently delete them from the database.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 px-6 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 px-6 py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-200 dark:shadow-none transition-all disabled:opacity-60"
          >
            {busy ? 'Deleting...' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  );
};

function formatWtk(n) {
  return `${Number(n || 0).toLocaleString()} WTK`;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyStatusUsername, setBusyStatusUsername] = useState('');
  const [busyDelete, setBusyDelete] = useState(false);

  const showNotification = (msg) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const loadUsers = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Could not load users');
      }
      const rows = Array.isArray(data) ? data : [];
      setUsers(rows);
    } catch (err) {
      setError(err?.message || 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    const timer = setInterval(loadUsers, 3000);
    return () => clearInterval(timer);
  }, [loadUsers]);

  const handleApprove = async (username) => {
    if (!username) return;
    setBusyStatusUsername(username);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(username)}/account-status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Could not update user');
      }
      const updated = data?.user;
      setUsers((prev) =>
        prev.map((u) =>
          u.username === username
            ? { ...u, account_state: String(updated?.account_state || u.account_state || 'ACTIVE').toUpperCase() }
            : u
        )
      );
      showNotification(`User updated to ${String(updated?.account_state || '').toUpperCase()}`);
    } catch (err) {
      showNotification(err?.message || 'Could not update user');
    } finally {
      setBusyStatusUsername('');
    }
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete?.username) return;
    setBusyDelete(true);
    try {
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userToDelete.username)}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Could not delete user');
      }
      setUsers((prev) => prev.filter((u) => u.username !== userToDelete.username));
      setModalOpen(false);
      setUserToDelete(null);
      showNotification('User deleted successfully');
    } catch (err) {
      showNotification(err?.message || 'Could not delete user');
    } finally {
      setBusyDelete(false);
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        String(user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
  );

  return (
    <div className="relative">
      {toast.show && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-top-10 duration-300">
          <div className="bg-teal-500 p-1 rounded-full"><Check size={14} /></div>
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[40px] border dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-8 border-b dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h3 className="text-xl font-black dark:text-white">User Directory</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Total Records: {filteredUsers.length}</p>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl flex items-center gap-2 w-full md:w-64">
            <Search size={16} className="text-slate-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email..."
              className="bg-transparent border-none outline-none text-sm w-full dark:text-white"
            />
          </div>
        </div>

        {error && (
          <div className="px-8 py-4 text-sm font-bold text-rose-600 bg-rose-50 border-b border-rose-100">
            {error}
          </div>
        )}

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 uppercase text-[10px] font-black text-slate-400 sticky top-0 z-10">
              <tr>
                <th className="p-8">User Identity</th>
                <th className="p-8">Wallet Balance</th>
                <th className="p-8">Status</th>
                <th className="p-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-slate-800">
              {loading && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-sm font-bold text-slate-400">Loading users...</td>
                </tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-sm font-bold text-slate-400">No users found.</td>
                </tr>
              )}
              {filteredUsers.map((user) => {
                const state = String(user.account_state || 'ACTIVE').toUpperCase();
                return (
                  <tr key={user.username} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all">
                    <td className="p-8">
                      <div className="font-black dark:text-white">{user.username}</div>
                      <div className="text-xs text-slate-400">{user.email}</div>
                    </td>
                    <td className="p-8 font-black text-teal-600">{formatWtk(user.wtk_balance)}</td>
                    <td className="p-8">
                      <span
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all duration-300 ${
                          state === 'ACTIVE'
                            ? 'bg-teal-100 text-teal-600'
                            : state === 'PENDING'
                              ? 'bg-amber-100 text-amber-600'
                              : state === 'SUSPENDED'
                                ? 'bg-slate-200 text-slate-600'
                                : state === 'BANNED'
                                  ? 'bg-rose-100 text-rose-600'
                                  : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {state}
                      </span>
                    </td>
                    <td className="p-8 text-right space-x-2">
                      <button
                        onClick={() => handleApprove(user.username)}
                        disabled={busyStatusUsername === user.username}
                        className={`p-3 rounded-xl transition-all disabled:opacity-60 ${
                          state === 'ACTIVE' ? 'bg-slate-100 text-slate-400' : 'bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white'
                        }`}
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        disabled={busyDelete}
                        className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-60"
                      >
                        <UserMinus size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationModal
        isOpen={modalOpen}
        userName={userToDelete?.username}
        onClose={() => setModalOpen(false)}
        onConfirm={confirmDelete}
        busy={busyDelete}
      />
    </div>
  );
}

