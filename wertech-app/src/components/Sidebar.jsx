import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Compass, MessageSquare, 
  Handshake, BarChart3, Bell, UserCircle, 
  Settings, LogOut, History, Coins,
  Users, ShieldCheck, UserCheck // Added UserCheck icon
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { logoutFromServer } from '../utils/authClient';
import { subscribeUserEvents } from '../utils/liveEvents';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = localStorage.getItem('userRole');
  const currentUsername = localStorage.getItem('username') || '';
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // 1. ADMIN TABS - Fixed Syntax & Icons
  const adminItems = [
    { 
      name: 'Admin Profile', 
      icon: <UserCheck size={20}/>, // Use an icon here, not the Profile component
      path: '/admin/profiles' // Fixed path: added leading slash and matched your page name
    },
    { name: 'System Overview', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { name: 'User Directory', icon: <Users size={20} />, path: '/admin/users' },
    { name: 'Moderation', icon: <ShieldCheck size={20} />, path: '/admin/mod' },
    { name: 'Treasury Ledger', icon: <BarChart3 size={20} />, path: '/analytics' },
  ];

  // 2. USER TABS
  const userItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { name: 'Explore', icon: <Compass size={20} />, path: '/explore' },
    { name: 'My Listings', icon: <Handshake size={20} />, path: '/my-listings' },
    { name: 'Messages', icon: <MessageSquare size={20} />, path: '/messages' },
    { name: 'History', icon: <History size={20} />, path: '/history' },
    { name: 'Token Ledger', icon: <Coins size={20} />, path: '/token-ledger' },
    { name: 'Notifications', icon: <Bell size={20} />, path: '/notifications' },
    { name: 'Profile', icon: <UserCircle size={20} />, path: '/profile' },
    { name: 'Settings', icon: <Settings size={20} />, path: '/settings' },
  ];

  const navItems = userRole === 'admin' ? adminItems : userItems;

  useEffect(() => {
    if (userRole === 'admin' || !currentUsername) return;

    const loadUnread = async () => {
      try {
        const [msgRes, notifRes] = await Promise.all([
          fetch(`/api/messages/unread-count/${encodeURIComponent(currentUsername)}`),
          fetch(`/api/notifications/unread-count/${encodeURIComponent(currentUsername)}`)
        ]);
        const [msgData, notifData] = await Promise.all([msgRes.json(), notifRes.json()]);
        if (msgRes.ok) setUnreadCount(Number(msgData.unread || 0));
        if (notifRes.ok) setUnreadNotifications(Number(notifData.unread || 0));
      } catch (err) {
        // no-op
      }
    };

    loadUnread();
    const unsubscribe = subscribeUserEvents(currentUsername, {
      onEvent: (type) => {
        if (type === 'message_update' || type === 'notification_update') {
          loadUnread();
        }
      }
    });
    return () => unsubscribe();
  }, [userRole, currentUsername, location.pathname]);

  const handleLogout = async () => {
    await logoutFromServer();
    window.location.href = '/login'; 
  };

  const handleNavClick = async (item) => {
    if (
      item.path === '/notifications' &&
      userRole !== 'admin' &&
      currentUsername
    ) {
      try {
        await fetch(`/api/notifications/read-all/${encodeURIComponent(currentUsername)}`, {
          method: 'PATCH'
        });
        setUnreadNotifications(0);
      } catch (err) {
        // no-op
      }
    }
    navigate(item.path);
  };

  return (
    <div className="w-72 app-card border-r border-fuchsia-100/70 dark:border-indigo-300/20 h-screen p-8 flex flex-col transition-colors duration-500 sticky top-0 rounded-none">
      
      <div className="mb-12 px-2">
        <div className="flex items-center gap-2">
          <BrandLogo size={34} textClassName="text-2xl" />
        </div>
        {userRole === 'admin' && (
          <div className="mt-1">
            <span className="text-[9px] bg-fuchsia-50 text-fuchsia-600 px-2 py-0.5 rounded-md font-black uppercase tracking-wider border border-fuchsia-100">
              Admin Mode
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
        {userRole === 'admin' && (
           <p className="text-[10px] text-slate-400 font-black uppercase tracking-[2px] mb-4 ml-4">
             Management Console
           </p>
        )}
        
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-[22px] font-bold transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-600 via-cyan-500 to-cyan-300 bg-[length:180%_180%] animate-[shimmer-flow_5s_ease_infinite] text-white shadow-lg shadow-cyan-500/20 scale-[1.02]' 
                  : 'text-slate-500 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:text-cyan-600 dark:hover:text-cyan-300'
              }`}
            >
              {item.icon}
              <span className="text-sm tracking-tight">{item.name}</span>
              {item.path === '/messages' && unreadCount > 0 && (
                <span className="ml-auto min-w-[22px] h-[22px] px-2 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {item.path === '/notifications' && unreadNotifications > 0 && (
                <span className="ml-auto min-w-[22px] h-[22px] px-2 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full flex items-center gap-4 px-6 py-4 rounded-[22px] font-black text-slate-400 hover:bg-rose-50/70 hover:text-rose-500 transition-all duration-300"
        >
          <LogOut size={20} />
          <span className="text-sm uppercase tracking-widest">Exit Session</span>
        </button>
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-7">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Confirm Logout</h3>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <LogOut size={16} />
              </button>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-300 font-medium">
              Do you want to logout from your account?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

