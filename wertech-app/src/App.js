import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { bootstrapAuthSession, clearAuthSession, getAccessToken } from './utils/authClient';

// Component Imports
import Sidebar from './components/Sidebar';
import AppToaster from './components/AppToaster';
import AppIntro from './components/AppIntro';

// Page Imports
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import MyListings from './pages/MyListings';
import ItemDetails from './pages/ItemDetails';
import BarterChat from './pages/BarterChat';
import Notifications from './pages/Notifications';
import BarterRequest from './pages/BarterRequest';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import CreateListing from './pages/CreateListing';
import History from './pages/History';
import TokenLedger from './pages/TokenLedger';

// Admin Page Imports
import AdminPortal from './pages/AdminPortal'; 
import Analytics from './pages/Analytics';

// --- THE SECURITY GUARD ---
const AdminRoute = ({ children }) => {
  const role = localStorage.getItem('userRole');
  const isAuthenticated = !!getAccessToken() && localStorage.getItem('isAuthenticated') === 'true';

  if (!isAuthenticated || role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

const UserRoute = ({ children }) => {
  const role = localStorage.getItem('userRole');
  const isAuthenticated = !!getAccessToken() && localStorage.getItem('isAuthenticated') === 'true';

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  if (role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return children;
};

function AppLayout() {
  const location = useLocation();
  const routeKey = location.pathname;
  const isAuthPage = ['/login', '/register', '/'].includes(location.pathname);
  const userRole = localStorage.getItem('userRole');
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const shouldCheckIntro = location.pathname === '/' && !isAuthenticated;
    if (!shouldCheckIntro) {
      setShowIntro(false);
      return;
    }

    const hasSeenIntro = sessionStorage.getItem('wertech-intro-seen') === 'true';
    setShowIntro(!hasSeenIntro);
  }, [location.pathname, isAuthenticated]);

  const handleCloseIntro = () => {
    sessionStorage.setItem('wertech-intro-seen', 'true');
    setShowIntro(false);
  };

  return (
    <div className="app-shell flex">
      <AnimatePresence>{showIntro && <AppIntro onDone={handleCloseIntro} />}</AnimatePresence>
      {!isAuthPage && <Sidebar />}
      
      <main className="app-main flex-1">
        <div className="app-content">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
              className="route-stage"
            >
              <Routes>
                <Route
                  path="/"
                  element={
                    isAuthenticated
                      ? (userRole === 'admin'
                          ? <Navigate to="/admin/dashboard" replace />
                          : <Navigate to="/dashboard" replace />)
                      : <Landing />
                  }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* User Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <UserRoute>
                      <Dashboard />
                    </UserRoute>
                  }
                />
                <Route path="/explore" element={<UserRoute><Explore /></UserRoute>} />
                <Route path="/my-listings" element={<UserRoute><MyListings /></UserRoute>} />
                <Route path="/item/:id" element={<UserRoute><ItemDetails /></UserRoute>} />
                <Route path="/messages" element={<UserRoute><BarterChat /></UserRoute>} />
                <Route path="/notifications" element={<UserRoute><Notifications /></UserRoute>} />
                <Route path="/barter-request" element={<UserRoute><BarterRequest /></UserRoute>} />
                <Route path="/profile" element={<UserRoute><Profile /></UserRoute>} />
                <Route path="/profile/:username" element={<UserRoute><Profile /></UserRoute>} />
                <Route
                  path="/settings"
                  element={
                    isAuthenticated && userRole === 'admin'
                      ? <Navigate to="/admin/profiles" replace />
                      : <UserRoute><Settings /></UserRoute>
                  }
                />
                <Route path="/create" element={<UserRoute><CreateListing /></UserRoute>} />
                <Route path="/history" element={<UserRoute><History /></UserRoute>} />
                <Route path="/token-ledger" element={<UserRoute><TokenLedger /></UserRoute>} />

                {/* Admin Routes with Wildcard */}
                <Route 
                  path="/admin/*" 
                  element={
                    <AdminRoute>
                      <AdminPortal />
                    </AdminRoute>
                  } 
                />
                
                <Route 
                  path="/analytics" 
                  element={<AdminRoute><Analytics /></AdminRoute>} 
                />
                
                <Route
                  path="*"
                  element={
                    isAuthenticated && userRole === 'admin'
                      ? <Navigate to="/admin/dashboard" replace />
                      : <Navigate to="/dashboard" replace />
                  }
                />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [authBootstrapped, setAuthBootstrapped] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    const savedTheme = localStorage.getItem('theme');
    root.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      // Auto-logout on new browser session (tab/browser closed and reopened).
      const hasSessionMarker = sessionStorage.getItem('wertech_session_active') === 'true';
      if (!hasSessionMarker) {
        clearAuthSession();
        setAuthBootstrapped(true);
        return;
      }

      await bootstrapAuthSession();
      setAuthBootstrapped(true);
    };

    initAuth();
  }, []);

  if (!authBootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500 font-semibold">
        Verifying session...
      </div>
    );
  }

  return (
    <Router>
      <AppToaster />
      <AppLayout />
    </Router>
  );
}
