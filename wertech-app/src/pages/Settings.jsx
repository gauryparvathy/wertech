import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Lock, Shield, LogOut, Ban, ChevronRight, X } from 'lucide-react';
import { getApiMessage, toastError, toastSuccess } from '../utils/feedback';
import { logoutFromServer } from '../utils/authClient';
import PremiumSettingsPanel from '../components/PremiumSettingsPanel';

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`w-14 h-7 rounded-full transition-all duration-500 relative ${
        enabled ? 'bg-teal-600 shadow-lg shadow-teal-600/20' : 'bg-slate-200'
      }`}
    >
      <motion.div
        animate={{ x: enabled ? 28 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm"
      />
    </button>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const currentUsername = localStorage.getItem('username') || '';
  // Sync state with localStorage so the theme stays the same on refresh
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [publicProfile, setPublicProfile] = useState(true);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [blockedAccounts, setBlockedAccounts] = useState([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [blockedError, setBlockedError] = useState('');
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // This useEffect injects the 'dark' class into the root document
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    const loadPrivacy = async () => {
      if (!currentUsername) return;
      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(currentUsername)}/profile?viewer_username=${encodeURIComponent(currentUsername)}`
        );
        const data = await response.json();
        if (!response.ok) return;
        setPublicProfile((data.profile_visibility || 'public') !== 'private');
      } catch (err) {
        // no-op
      }
    };
    loadPrivacy();
  }, [currentUsername]);

  const handleToggleProfileVisibility = async () => {
    if (!currentUsername) return;
    const nextPublic = !publicProfile;
    setPublicProfile(nextPublic);
    setSavingVisibility(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(currentUsername)}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile_visibility: nextPublic ? 'public' : 'private'
        })
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setPublicProfile(!nextPublic);
        toastError(getApiMessage(data, 'Could not update profile visibility.'));
        return;
      }
      toastSuccess(`Profile visibility set to ${nextPublic ? 'public' : 'private'}.`);
    } catch (err) {
      setPublicProfile(!nextPublic);
      toastError('Could not update profile visibility.');
    } finally {
      setSavingVisibility(false);
    }
  };

  const loadBlockedAccounts = async () => {
    if (!currentUsername) return;
    setLoadingBlocked(true);
    setBlockedError('');
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(currentUsername)}/blocked`);
      const data = await response.json();
      if (!response.ok) {
        setBlockedError(getApiMessage(data, 'Could not load blocked accounts.'));
        return;
      }
      setBlockedAccounts(Array.isArray(data.users) ? data.users : []);
    } catch (err) {
      setBlockedError('Could not load blocked accounts.');
    } finally {
      setLoadingBlocked(false);
    }
  };

  const openBlockedModal = async () => {
    setShowBlockedModal(true);
    await loadBlockedAccounts();
  };

  const handleUnblock = async (targetUsername) => {
    if (!currentUsername || !targetUsername) return;
    try {
      const response = await fetch('/api/users/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocker_username: currentUsername,
          target_username: targetUsername
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not unblock user.'));
        return;
      }
      setBlockedAccounts((prev) => prev.filter((u) => u.username !== targetUsername));
      toastSuccess(`${targetUsername} unblocked.`);
    } catch (err) {
      toastError('Could not unblock user.');
    }
  };

  const handleLogoutChoice = async (allDevices) => {
    setLogoutBusy(true);
    try {
      await logoutFromServer({ allDevices });
      navigate('/login');
    } finally {
      setLogoutBusy(false);
      setShowLogoutModal(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 max-w-4xl mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-teal-50 dark:bg-teal-900/30 text-teal-600 rounded-[24px]">
          <Lock size={32} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white transition-colors">Account Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your community preferences.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-50 dark:border-slate-800 shadow-sm transition-all duration-500">
        
        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-800/50 rounded-[32px] border border-transparent hover:border-teal-500/30 transition-all">
          <div className="flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${darkMode ? 'bg-indigo-900/40 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
              {darkMode ? <Sun size={28} /> : <Moon size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Dark Mode</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  Beta
                </span>
              </div>
              <p className="text-sm text-slate-400 font-medium">Toggle the theme for the entire app.</p>
            </div>
          </div>
          <ToggleSwitch enabled={darkMode} onToggle={() => setDarkMode((prev) => !prev)} />
        </div>

        {/* Public Profile Toggle */}
        <div className="flex items-center justify-between p-6 rounded-[32px] hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all mt-4">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center">
              <Shield size={28} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Public Profile</h4>
              <p className="text-sm text-slate-400 font-medium">
                {publicProfile
                  ? 'Anyone can view your listings from your profile.'
                  : 'Only friends can view your listings from your profile.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {savingVisibility && <span className="text-[10px] font-black uppercase text-slate-400">Saving...</span>}
            <ToggleSwitch enabled={publicProfile} onToggle={handleToggleProfileVisibility} />
          </div>
        </div>

        <button
          onClick={openBlockedModal}
          className="w-full mt-4 flex items-center justify-between p-6 rounded-[32px] hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all"
        >
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-2xl flex items-center justify-center">
              <Ban size={28} />
            </div>
            <div className="text-left">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white">Blocked Accounts</h4>
              <p className="text-sm text-slate-400 font-medium">View and manage users you blocked.</p>
            </div>
          </div>
          <ChevronRight className="text-slate-300" size={20} />
        </button>

        <button
          onClick={() => setShowLogoutModal(true)}
          disabled={logoutBusy}
          className="w-full mt-10 p-6 rounded-[32px] bg-red-50 dark:bg-red-900/10 text-red-600 font-black flex items-center justify-center gap-3 hover:bg-red-100 transition-all disabled:opacity-60"
        >
          <LogOut size={22} /> {logoutBusy ? 'Logging Out...' : 'Logout Options'}
        </button>
      </div>

      <PremiumSettingsPanel username={currentUsername} />

      {showBlockedModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-[36px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-8 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Blocked Accounts</h3>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            {loadingBlocked && (
              <p className="text-sm font-bold text-slate-400">Loading blocked users...</p>
            )}
            {!loadingBlocked && blockedError && (
              <div className="p-4 rounded-2xl bg-rose-50 text-rose-600 text-sm font-bold space-y-2">
                <p>{blockedError}</p>
                <button
                  onClick={loadBlockedAccounts}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-black hover:bg-rose-700"
                >
                  Retry
                </button>
              </div>
            )}
            {!loadingBlocked && !blockedError && blockedAccounts.length === 0 && (
              <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 font-bold">
                No blocked accounts.
              </div>
            )}
            <div className="space-y-3">
              {!loadingBlocked && !blockedError && blockedAccounts.map((u) => (
                <div
                  key={u.username}
                  className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4"
                >
                  {u.profile_image ? (
                    <img
                      src={u.profile_image}
                      alt={u.username}
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center font-black">
                      {u.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowBlockedModal(false);
                      navigate(`/profile/${encodeURIComponent(u.username)}`);
                    }}
                    className="flex-1 text-left"
                  >
                    <p className="font-black text-slate-900 dark:text-white">{u.username}</p>
                    <p className="text-[10px] font-black uppercase text-teal-600">{u.status || 'Verified'}</p>
                  </button>
                  <button
                    onClick={() => handleUnblock(u.username)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700 transition-all"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[121] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[36px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Confirm Logout</h3>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Are you sure you want to log out? You can sign out only from this device or from all devices.
            </p>
            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleLogoutChoice(false)}
                disabled={logoutBusy}
                className="w-full px-5 py-4 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-all disabled:opacity-60"
              >
                {logoutBusy ? 'Processing...' : 'Logout From This Device'}
              </button>
              <button
                onClick={() => handleLogoutChoice(true)}
                disabled={logoutBusy}
                className="w-full px-5 py-4 rounded-2xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-all disabled:opacity-60"
              >
                {logoutBusy ? 'Processing...' : 'Logout From All Devices'}
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                disabled={logoutBusy}
                className="w-full px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

