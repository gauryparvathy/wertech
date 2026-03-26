import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { bootstrapAuthSession, clearAuthSession, getAccessToken } from './utils/authClient';

jest.mock('./utils/authClient', () => ({
  bootstrapAuthSession: jest.fn(),
  clearAuthSession: jest.fn(),
  getAccessToken: jest.fn()
}));

jest.mock('./components/Sidebar', () => () => <div>Sidebar</div>);
jest.mock('./components/AppToaster', () => () => <div>Toaster</div>);
jest.mock('./components/AppIntro', () => () => <div>Intro</div>);

jest.mock('./pages/Login', () => () => <div>Login Page</div>);
jest.mock('./pages/Register', () => () => <div>Register Page</div>);
jest.mock('./pages/Landing', () => () => <div>Landing Page</div>);
jest.mock('./pages/Dashboard', () => () => <div>Dashboard Page</div>);
jest.mock('./pages/Explore', () => () => <div>Explore Page</div>);
jest.mock('./pages/MyListings', () => () => <div>My Listings</div>);
jest.mock('./pages/ItemDetails', () => () => <div>Item Details</div>);
jest.mock('./pages/BarterChat', () => () => <div>Barter Chat</div>);
jest.mock('./pages/Notifications', () => () => <div>Notifications</div>);
jest.mock('./pages/BarterRequest', () => () => <div>Barter Request</div>);
jest.mock('./pages/Profile', () => () => <div>Profile</div>);
jest.mock('./pages/Settings', () => () => <div>Settings</div>);
jest.mock('./pages/CreateListing', () => () => <div>Create Listing</div>);
jest.mock('./pages/History', () => () => <div>History</div>);
jest.mock('./pages/TokenLedger', () => () => <div>Token Ledger</div>);
jest.mock('./pages/AdminPortal', () => () => <div>Admin Portal</div>);
jest.mock('./pages/Analytics', () => () => <div>Analytics</div>);

describe('App routing guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('wertech_session_active', 'true');
    bootstrapAuthSession.mockResolvedValue(true);
    getAccessToken.mockReturnValue('');
  });

  test('redirects unauthenticated /dashboard to landing', async () => {
    window.history.pushState({}, '', '/dashboard');
    localStorage.setItem('isAuthenticated', 'false');
    localStorage.setItem('userRole', 'user');

    render(<App />);

    expect(await screen.findByText('Landing Page')).toBeInTheDocument();
  });

  test('allows authenticated user to access /dashboard', async () => {
    window.history.pushState({}, '', '/dashboard');
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', 'user');
    getAccessToken.mockReturnValue('user-token');

    render(<App />);

    expect(await screen.findByText('Dashboard Page')).toBeInTheDocument();
  });

  test('redirects authenticated admin from /dashboard to admin portal', async () => {
    window.history.pushState({}, '', '/dashboard');
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', 'admin');
    getAccessToken.mockReturnValue('admin-token');

    render(<App />);

    expect(await screen.findByText('Admin Portal')).toBeInTheDocument();
  });

  test('clears auth when session marker is missing', async () => {
    sessionStorage.removeItem('wertech_session_active');
    window.history.pushState({}, '', '/');

    render(<App />);

    await waitFor(() => expect(clearAuthSession).toHaveBeenCalledTimes(1));
  });
});
