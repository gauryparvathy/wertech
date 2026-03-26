import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import { resolveApiUrl, setAuthSession } from '../../utils/authClient';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

jest.mock('../../utils/authClient', () => ({
  resolveApiUrl: jest.fn((path) => `https://api.example.com${path}`),
  setAuthSession: jest.fn()
}));

describe('Login page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveApiUrl.mockImplementation((path) => `https://api.example.com${path}`);
  });

  test('logs in standard user and redirects to dashboard', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        role: 'user',
        username: 'alice',
        wtk_balance: 950,
        has_subscribed: true,
        access_token: 'access-token',
        refresh_token: 'refresh-token'
      })
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Email or Username/i), {
      target: { value: 'alice@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => expect(setAuthSession).toHaveBeenCalledTimes(1));
    expect(resolveApiUrl).toHaveBeenCalledWith('/api/auth/login');
    expect(global.fetch.mock.calls[0][0]).toBe('https://api.example.com/api/auth/login');
    expect(global.fetch.mock.calls[0][1]).toEqual(expect.objectContaining({ method: 'POST' }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('shows API error for invalid credentials', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' })
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/Email or Username/i), {
      target: { value: 'alice@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Password/i), {
      target: { value: 'wrong-password' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Sign In/i }));

    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
  });
});
