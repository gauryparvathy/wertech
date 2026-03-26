import { showToast } from './toast';

export function getApiMessage(payload, fallback = 'Something went wrong. Please try again.') {
  if (!payload) return fallback;
  if (typeof payload === 'string' && payload.trim()) return payload.trim();
  if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message.trim();
  if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error.trim();
  if (typeof payload?.details === 'string' && payload.details.trim()) return payload.details.trim();
  return fallback;
}

export function validateRegistrationForm({ username, email, phone, password, verificationChannel, verificationCode }) {
  const cleanUsername = String(username || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanPhone = String(phone || '').trim();
  const cleanPassword = String(password || '');
  const cleanChannel = String(verificationChannel || '').trim();
  const cleanCode = String(verificationCode || '').trim();

  if (!cleanUsername) return 'Username is required.';
  if (cleanUsername.length < 3) return 'Username must be at least 3 characters.';
  if (cleanChannel !== 'email' && cleanChannel !== 'phone') return 'Choose email or phone verification.';
  if (cleanChannel === 'email') {
    if (!cleanEmail) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return 'Enter a valid email address.';
  }
  if (cleanChannel === 'phone') {
    if (!cleanPhone) return 'Phone number is required.';
    const normalizedPhone = cleanPhone.replace(/[^\d+]/g, '');
    if (!/^\+?[1-9]\d{7,14}$/.test(normalizedPhone)) return 'Enter a valid phone number.';
  }
  if (!cleanPassword) return 'Password is required.';
  if (cleanPassword.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(cleanPassword) || !/\d/.test(cleanPassword)) return 'Password must include at least one letter and one number.';
  if (!cleanCode) return 'Verification code is required.';
  return '';
}

export function validateLoginForm({ emailOrUser, password }) {
  const cleanIdentity = String(emailOrUser || '').trim();
  const cleanPassword = String(password || '');
  if (!cleanIdentity) return 'Email, phone, or username is required.';
  if (!cleanPassword) return 'Password is required.';
  return '';
}

export function validatePasswordValue(password) {
  const cleanPassword = String(password || '');
  if (!cleanPassword) return 'Password is required.';
  if (cleanPassword.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(cleanPassword) || !/\d/.test(cleanPassword)) return 'Password must include at least one letter and one number.';
  return '';
}

export function validateBarterRequestForm({ receiver, itemName }) {
  const cleanReceiver = String(receiver || '').trim();
  const cleanItem = String(itemName || '').trim();
  if (!cleanReceiver) return 'Recipient username is required.';
  if (!cleanItem) return 'Item or skill name is required.';
  if (cleanItem.length < 2) return 'Item or skill name must be at least 2 characters.';
  return '';
}

export function toastSuccess(message, duration = 3000) {
  showToast(message, 'success', duration);
}

export function toastError(message, duration = 3500) {
  showToast(message, 'error', duration);
}

export function toastInfo(message, duration = 3000) {
  showToast(message, 'info', duration);
}
