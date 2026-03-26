import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Palette, KeyRound, Smartphone } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { resolveApiUrl, setAuthSession } from '../utils/authClient';
import { getApiMessage, toastError, toastSuccess, validateLoginForm, validatePasswordValue } from '../utils/feedback';

const initialRecoveryForm = {
  channel: 'email',
  recoveryMethod: 'otp',
  email: '',
  phone: '',
  verificationId: '',
  verificationCode: '',
  resetToken: '',
  newPassword: ''
};

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [emailOrUser, setEmailOrUser] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [viewMode, setViewMode] = useState('login');
  const [recoveryForm, setRecoveryForm] = useState(initialRecoveryForm);
  const [recoveryStatus, setRecoveryStatus] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const resetToken = String(query.get('reset_token') || '').trim();
    if (resetToken) {
      setViewMode('recovery-link');
      setChallenge(null);
      setError('');
      setRecoveryStatus('Secure reset link detected. Set a new password to continue.');
      setRecoveryForm((prev) => ({
        ...prev,
        channel: 'email',
        recoveryMethod: 'link',
        resetToken,
        verificationId: '',
        verificationCode: ''
      }));
    }
  }, [location.search]);

  const updateRecoveryForm = (patch) => {
    setRecoveryForm((prev) => ({ ...prev, ...patch }));
  };

  const resetRecoveryState = () => {
    setRecoveryForm((prev) => ({
      ...initialRecoveryForm,
      email: prev.email,
      phone: prev.phone
    }));
    setRecoveryStatus('');
    setError('');
  };

  const completeLogin = (data) => {
    setAuthSession(data);
    toastSuccess('Signed in successfully.');
    navigate(data.role === 'admin' ? '/admin/dashboard' : '/dashboard');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    const validationError = validateLoginForm({ emailOrUser, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(resolveApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailOrUser, password })
      });

      const data = await response.json().catch(() => ({}));
      if (response.status === 202 && data?.requires_verification) {
        setChallenge(data);
        setViewMode('challenge');
        setRecoveryStatus('');
        toastSuccess(data?.message || 'Verification code sent.');
        return;
      }
      if (response.ok) {
        completeLogin(data);
      } else {
        const message = getApiMessage(data, 'Invalid credentials.');
        setError(message);
        toastError(message);
      }
    } catch (err) {
      const message = 'Connection failed. Please try again.';
      setError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyChallenge = async (e) => {
    e.preventDefault();
    if (!challenge?.verification_id || !verificationCode.trim()) {
      setError('Enter the verification code first.');
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch(resolveApiUrl('/api/auth/verify-login-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_id: challenge.verification_id,
          code: verificationCode
        })
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        completeLogin(data);
      } else {
        const message = getApiMessage(data, 'Could not verify sign-in.');
        setError(message);
        toastError(message);
      }
    } catch (err) {
      const message = 'Could not verify sign-in.';
      setError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRecovery = async (e) => {
    e.preventDefault();
    setError('');
    setRecoveryStatus('');
    const destination = recoveryForm.channel === 'phone' ? recoveryForm.phone : recoveryForm.email;
    if (!String(destination || '').trim()) {
      setError(`Enter your ${recoveryForm.channel === 'phone' ? 'phone number' : 'email address'} first.`);
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch(resolveApiUrl('/api/auth/forgot-password/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: recoveryForm.channel,
          recovery_method: recoveryForm.recoveryMethod,
          email: recoveryForm.email,
          phone: recoveryForm.phone
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = getApiMessage(data, 'Could not start password recovery.');
        setError(message);
        toastError(message);
        return;
      }

      setRecoveryStatus(data?.message || 'Recovery instructions sent.');
      if (recoveryForm.recoveryMethod === 'otp' && data?.verification_id) {
        updateRecoveryForm({
          verificationId: String(data.verification_id || ''),
          verificationCode: ''
        });
        setViewMode('recovery-code');
      } else if (recoveryForm.recoveryMethod === 'link') {
        updateRecoveryForm({
          resetToken: String(data?.dev_reset_token || recoveryForm.resetToken || '')
        });
        if (data?.dev_reset_token) {
          setViewMode('recovery-link');
        }
      }
      toastSuccess(data?.message || 'Recovery instructions sent.');
    } catch (err) {
      const message = 'Could not start password recovery.';
      setError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetWithCode = async (e) => {
    e.preventDefault();
    setError('');
    const passwordError = validatePasswordValue(recoveryForm.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (!recoveryForm.verificationId || !recoveryForm.verificationCode.trim()) {
      setError('Enter the password reset code first.');
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch(resolveApiUrl('/api/auth/forgot-password/verify-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verification_id: recoveryForm.verificationId,
          code: recoveryForm.verificationCode,
          new_password: recoveryForm.newPassword
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = getApiMessage(data, 'Could not reset password.');
        setError(message);
        toastError(message);
        return;
      }
      toastSuccess(data?.message || 'Password updated successfully.');
      setRecoveryStatus(data?.message || 'Password updated successfully.');
      setViewMode('login');
      setPassword('');
      setVerificationCode('');
      resetRecoveryState();
    } catch (err) {
      const message = 'Could not reset password.';
      setError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetWithLink = async (e) => {
    e.preventDefault();
    setError('');
    const passwordError = validatePasswordValue(recoveryForm.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (!recoveryForm.resetToken) {
      setError('Reset link is missing or expired.');
      return;
    }
    try {
      setSubmitting(true);
      const response = await fetch(resolveApiUrl('/api/auth/forgot-password/reset-link'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: recoveryForm.resetToken,
          new_password: recoveryForm.newPassword
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = getApiMessage(data, 'Could not reset password.');
        setError(message);
        toastError(message);
        return;
      }
      toastSuccess(data?.message || 'Password updated successfully.');
      setRecoveryStatus(data?.message || 'Password updated successfully.');
      setViewMode('login');
      setPassword('');
      navigate(location.pathname, { replace: true });
      resetRecoveryState();
    } catch (err) {
      const message = 'Could not reset password.';
      setError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const showLoginForm = viewMode === 'login';
  const showChallengeForm = viewMode === 'challenge';
  const showRecoveryRequestForm = viewMode === 'recovery-request';
  const showRecoveryCodeForm = viewMode === 'recovery-code';
  const showRecoveryLinkForm = viewMode === 'recovery-link';

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,183,255,0.24),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(37,99,255,0.2),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(60,242,255,0.18),transparent_40%)]" />
      <motion.div aria-hidden initial={{ y: -30, opacity: 0.4 }} animate={{ y: 20, opacity: 0.8 }} transition={{ repeat: Infinity, repeatType: 'reverse', duration: 6, ease: 'easeInOut' }} className="absolute -top-20 -right-16 h-72 w-72 rounded-full bg-cyan-500/30 blur-3xl" />
      <motion.div aria-hidden initial={{ y: 30, opacity: 0.35 }} animate={{ y: -20, opacity: 0.75 }} transition={{ repeat: Infinity, repeatType: 'reverse', duration: 7, ease: 'easeInOut' }} className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />

      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }} className="relative z-10 grid grid-cols-1 lg:grid-cols-2 max-w-5xl w-full rounded-[36px] overflow-hidden border border-white/40 dark:border-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.22)] bg-white/70 dark:bg-slate-900/90 backdrop-blur-md">
        <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12, duration: 0.45 }} className="hidden lg:flex relative flex-col justify-between p-12 text-white bg-[linear-gradient(120deg,#2563ff_0%,#00b7ff_52%,#3cf2ff_100%)] bg-[length:180%_180%] animate-[shimmer-flow_4.8s_ease_infinite]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.26),transparent_40%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/20 text-xs font-black uppercase tracking-[0.2em]">
              <BrandLogo size={18} withText={false} />
              Wertech
            </div>
            <h2 className="mt-8 text-4xl leading-tight font-black">Protected Sign-In.</h2>
            <p className="mt-4 text-sm font-semibold text-white/85 max-w-sm">
              Passwords stay hashed on the server, and account recovery can happen through one verified email or one verified phone at a time.
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.45 }} className="p-8 sm:p-10 lg:p-12">
          <div className="text-center lg:text-left mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 via-cyan-500 to-cyan-300 text-white rounded-2xl mb-5 shadow-lg shadow-cyan-500/30">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">
              {showRecoveryRequestForm || showRecoveryCodeForm || showRecoveryLinkForm ? 'Recover Password' : 'Welcome Back'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
              {showChallengeForm
                ? `Confirm this new-device sign-in with the code sent to ${challenge?.destination_hint || 'your verified contact'}.`
                : showRecoveryRequestForm
                  ? 'Choose one verified recovery path: email or phone, then OTP or reset link.'
                  : showRecoveryCodeForm
                    ? 'Enter the OTP and create a new password.'
                    : showRecoveryLinkForm
                      ? 'Set a fresh password using your secure recovery link.'
                      : 'Sign in and continue your trade flow.'}
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center gap-3 text-sm font-bold border border-rose-100 dark:border-rose-900/30">
              <AlertCircle size={18} /> {error}
            </motion.div>
          )}

          {recoveryStatus && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-2xl text-sm font-bold border border-emerald-100 dark:border-emerald-900/30">
              {recoveryStatus}
            </motion.div>
          )}

          {showLoginForm && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="text" placeholder="Email, Phone, or Username" className="w-full pl-14 pr-6 py-4 bg-white/85 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 ring-teal-500 dark:text-white transition-all font-semibold border border-slate-200 dark:border-slate-700" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={emailOrUser} onChange={(e) => setEmailOrUser(e.target.value)} />
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="password" placeholder="Password" className="w-full pl-14 pr-6 py-4 bg-white/85 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 ring-teal-500 dark:text-white transition-all font-semibold border border-slate-200 dark:border-slate-700" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-cyan-600/20 hover:from-teal-700 hover:to-cyan-700 transition-all active:scale-[0.985] mt-2">
                {submitting ? 'Signing In...' : 'Sign In'} <ArrowRight size={20} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('recovery-request');
                  setChallenge(null);
                  setVerificationCode('');
                  setError('');
                  setRecoveryStatus('');
                }}
                className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-black"
              >
                Forgot Password?
              </button>
            </form>
          )}

          {showChallengeForm && (
            <form onSubmit={handleVerifyChallenge} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="text" inputMode="numeric" placeholder="Verification Code" className="w-full pl-14 pr-6 py-4 bg-white/85 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 ring-teal-500 dark:text-white transition-all font-semibold border border-slate-200 dark:border-slate-700" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} />
              </div>
              {challenge?.dev_code && <p className="text-xs font-bold text-emerald-600">Dev code: {challenge.dev_code}</p>}
              <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-cyan-600/20 hover:from-teal-700 hover:to-cyan-700 transition-all active:scale-[0.985] mt-2">
                {submitting ? 'Verifying...' : 'Verify And Continue'} <ArrowRight size={20} />
              </button>
              <button type="button" onClick={() => { setChallenge(null); setViewMode('login'); setVerificationCode(''); }} className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-black">Back To Login</button>
            </form>
          )}

          {showRecoveryRequestForm && (
            <form onSubmit={handleRequestRecovery} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => updateRecoveryForm({ channel: 'email' })} className={`py-3 rounded-2xl font-black border ${recoveryForm.channel === 'email' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Email</button>
                <button type="button" onClick={() => updateRecoveryForm({ channel: 'phone' })} className={`py-3 rounded-2xl font-black border ${recoveryForm.channel === 'phone' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Phone</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => updateRecoveryForm({ recoveryMethod: 'otp' })} className={`py-3 rounded-2xl font-black border ${recoveryForm.recoveryMethod === 'otp' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-200'}`}>OTP Code</button>
                <button type="button" onClick={() => updateRecoveryForm({ recoveryMethod: 'link' })} className={`py-3 rounded-2xl font-black border ${recoveryForm.recoveryMethod === 'link' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-200'}`}>Reset Link</button>
              </div>
              <div className="relative">
                {recoveryForm.channel === 'phone' ? <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /> : <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />}
                <input
                  required
                  type={recoveryForm.channel === 'phone' ? 'tel' : 'email'}
                  inputMode={recoveryForm.channel === 'phone' ? 'tel' : 'email'}
                  placeholder={recoveryForm.channel === 'phone' ? 'Phone number with country code' : 'Email address'}
                  className="w-full pl-14 pr-6 py-4 bg-white/85 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 ring-teal-500 dark:text-white transition-all font-semibold border border-slate-200 dark:border-slate-700"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={recoveryForm.channel === 'phone' ? recoveryForm.phone : recoveryForm.email}
                  onChange={(e) => updateRecoveryForm({ [recoveryForm.channel === 'phone' ? 'phone' : 'email']: e.target.value })}
                />
              </div>
              <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-cyan-600/20 hover:from-teal-700 hover:to-cyan-700 transition-all active:scale-[0.985] mt-2">
                {submitting ? 'Sending...' : recoveryForm.recoveryMethod === 'otp' ? 'Send Reset Code' : 'Send Reset Link'} <ArrowRight size={20} />
              </button>
              <button type="button" onClick={() => { setViewMode('login'); resetRecoveryState(); }} className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-black">Back To Login</button>
            </form>
          )}

          {showRecoveryCodeForm && (
            <form onSubmit={handleResetWithCode} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="text" inputMode="numeric" placeholder="Password Reset Code" className="w-full pl-14 pr-6 py-4 bg-white/85 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 ring-teal-500 dark:text-white transition-all font-semibold border border-slate-200 dark:border-slate-700" value={recoveryForm.verificationCode} onChange={(e) => updateRecoveryForm({ verificationCode: e.target.value })} />
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="password" placeholder="New Password" className="w-full pl-14 pr-6 py-4 bg-white/85 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 ring-teal-500 dark:text-white transition-all font-semibold border border-slate-200 dark:border-slate-700" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={recoveryForm.newPassword} onChange={(e) => updateRecoveryForm({ newPassword: e.target.value })} />
              </div>
              <p className="text-xs font-bold text-slate-500">Use at least 8 characters with one letter and one number.</p>
              <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-cyan-600/20 hover:from-teal-700 hover:to-cyan-700 transition-all active:scale-[0.985] mt-2">
                {submitting ? 'Updating...' : 'Reset Password With Code'} <ArrowRight size={20} />
              </button>
              {challenge?.dev_code && <p className="text-xs font-bold text-emerald-600">Dev code: {challenge.dev_code}</p>}
              <button type="button" onClick={() => { setViewMode('recovery-request'); updateRecoveryForm({ verificationCode: '', newPassword: '', verificationId: '' }); }} className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-black">Back</button>
            </form>
          )}

          {showRecoveryLinkForm && (
            <form onSubmit={handleResetWithLink} className="space-y-4">
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="password" placeholder="New Password" className="w-full pl-14 pr-6 py-4 bg-white/85 dark:bg-slate-800 rounded-2xl outline-none focus:ring-2 ring-teal-500 dark:text-white transition-all font-semibold border border-slate-200 dark:border-slate-700" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={recoveryForm.newPassword} onChange={(e) => updateRecoveryForm({ newPassword: e.target.value })} />
              </div>
              <p className="text-xs font-bold text-slate-500">Use at least 8 characters with one letter and one number.</p>
              {recoveryForm.resetToken && !location.search.includes('reset_token=') && (
                <p className="text-xs font-bold text-emerald-600">Dev reset token ready.</p>
              )}
              <button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-cyan-600/20 hover:from-teal-700 hover:to-cyan-700 transition-all active:scale-[0.985] mt-2">
                {submitting ? 'Updating...' : 'Reset Password'} <ArrowRight size={20} />
              </button>
              <button type="button" onClick={() => { navigate(location.pathname, { replace: true }); setViewMode('recovery-request'); updateRecoveryForm({ resetToken: '', newPassword: '' }); }} className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-black">Back</button>
            </form>
          )}

          <div className="flex items-center justify-center lg:justify-start gap-2 mt-6 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-[0.15em]">
            <Palette size={14} className="text-teal-500" />
            High-trust access
          </div>

          <p className="text-center lg:text-left mt-8 text-slate-500 dark:text-slate-400 font-bold text-sm">
            New here? <Link to="/register" className="text-cyan-600 hover:underline">Create an account</Link>
          </p>
        </motion.div>
      </motion.section>
    </div>
  );
}
