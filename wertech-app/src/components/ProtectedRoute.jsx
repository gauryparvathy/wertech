import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  // In a real app, you'd check your Auth state (Firebase/Supabase)
  // For now, we check a flag in localStorage
  const userRole = localStorage.getItem('userRole'); 

  if (userRole !== 'admin') {
    // If not an admin, redirect to home or login
    return <Navigate to="/" replace />;
  }

  return children;
}