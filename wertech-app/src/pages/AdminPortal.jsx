import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import your sub-pages
import AdminDashboard from './AdminDashboard';
import AdminUsers from './AdminUsers';
import ModerationQueue from './ModerationQueue'; // CHECK FILENAME
import AdminProfile from './AdminProfile';   // CHECK FILENAME
import BarterChat from './BarterChat';

export default function AdminPortal() {
  return (
    /* We removed the <nav> containing "Admin Panel" */
    <div className="w-full"> 
      <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="profiles" element={<AdminProfile />} />
        <Route path="mod" element={<ModerationQueue />} />
        <Route path="messages" element={<BarterChat />} />
      </Routes>
    </div>
  );
}
