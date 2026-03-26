import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Mail, Lock, ArrowRight, Gift, Smartphone, KeyRound } from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { getApiMessage, toastError, toastSuccess, validateRegistrationForm } from '../utils/feedback';
import { fetchPublicApi, resolveApiUrl } from '../utils/authClient';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,}$/;

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    verificationChannel: 'email',
    verificationCode: ''
  });
  const [verificationId, setVerificationId] = useState('');
  const [usernameState, setUsernameState] = useState({
    checking: false,
    available: true,
    message: '',
    hardFailure: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [referrer, setReferrer] = useState(() => localStorage.getItem('wertech_referrer') || '');

  useEffect(() => {
    const refFromQuery = String(searchParams.get('ref') || '').trim();
    if (refFromQuery) {
      localStorage.setItem('wertech_referrer', refFromQuery);
      setReferrer(refFromQuery);
    } else {
      setReferrer(localStorage.getItem('wertech_referrer') || '');
    }
  }, [searchParams]);

  useEffect(() => {
    const username = String(formData.username || '').trim();
    if (!username) {
      setUsernameState({ checking: false, available: true, message: '', hardFailure: false });
      return;
    }
    if (username.length < 3) {
      setUsernameState({ checking: false, available: true, message: 'Use at least 3 characters.', hardFailure: false });
      return;
    }
    if (!USERNAME_PATTERN.test(username)) {
      setUsernameState({ checking: false, available: false, message: 'Use only letters, numbers, or underscores.', hardFailure: true });
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setUsernameState((prev) => ({ ...prev, checking: true, message: '', hardFailure: false }));
      try {
        const response = await fetch(resolveApiUrl(`/api/auth/username-available?username=${encodeURIComponent(username)}`), { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) {
          setUsernameState({ checking: false, available: true, message: '', hardFailure: false });
          return;
        }
        if (data.available) {
          setUsernameState({ checking: false, available: true, message: 'Username looks good.', hardFailure: false });
        } else {
          setUsernameState({ checking: false, available: false, message: 'Username already taken', hardFailure: true });
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setUsernameState({ checking: false, available: true, message: '', hardFailure: false });
      }
    }, 650);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [formData.username]);

  const channelLabel = formData.verificationChannel === 'phone' ? 'Phone Number' : 'Email Address';

  const handleRequestCode = async () => {
    setError('');
    setVerificationStatus('');
    const destinationValue = formData.verificationChannel === 'phone' ? formData.phone : formData.email;
    if (!destinationValue.trim()) {
      setError(`Enter your ${formData.verificationChannel === 'phone' ? 'phone number' : 'email'} first.`);
      return;
    }
    setSendingCode(true);
    try {
      const response = await fetchPublicApi(resolveApiUrl('/api/auth/request-verification-code'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: formData.verificationChannel,
          email: formData.email,
          phone: formData.phone
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = getApiMessage(data, 'Could not send verification code.');
        setError(message);
        toastError(message);
        return;
      }
      setVerificationId(String(data.verification_id || ''));
      const message = data.dev_code
        ? `Verification code sent. Dev code: ${data.dev_code}`
        : `Verification code sent to your ${formData.verificationChannel}.`;
      setVerificationStatus(message);
      toastSuccess(message);
    } catch (err) {
      const message = 'Could not send verification code.';
      setError(message);
      toastError(message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const validationError = validateRegistrationForm(formData);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!verificationId) {
      setError('Request a verification code first.');
      return;
    }
    if (!usernameState.available) {
      setError(usernameState.message || 'Username already taken');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(resolveApiUrl('/api/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          referred_by: referrer,
          verification_channel: formData.verificationChannel,
          verification_code: formData.verificationCode,
          verification_id: verificationId
        })
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        toastSuccess(
          data?.referred_by
            ? 'Account created and verified. You received 500 WTK signup bonus, and your referrer was rewarded.'
            : 'Account created and verified. You received your 500 WTK signup bonus.'
        );
        navigate('/login');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const message = getApiMessage(errorData, 'Registration failed. Please try again.');
        setError(message);
        toastError(message);
      }
    } catch (err) {
      const message = 'Could not connect to server. Please retry.';
      setError(message);
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,183,255,0.24),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(37,99,255,0.2),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(60,242,255,0.18),transparent_40%)]" />
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }} className="relative z-10 grid grid-cols-1 lg:grid-cols-2 max-w-5xl w-full rounded-[36px] overflow-hidden border border-white/40 dark:border-slate-800 shadow-[0_24px_80px_rgba(15,23,42,0.22)] bg-white/70 dark:bg-slate-900/90 backdrop-blur-md">
        <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12, duration: 0.45 }} className="hidden lg:flex relative flex-col justify-between p-12 text-white bg-[linear-gradient(120deg,#2563ff_0%,#00b7ff_52%,#3cf2ff_100%)] bg-[length:180%_180%] animate-[shimmer-flow_4.8s_ease_infinite]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.26),transparent_40%)]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/20 text-xs font-black uppercase tracking-[0.2em]">
              <BrandLogo size={18} withText={false} />
              Wertech
            </div>
            <h2 className="mt-8 text-4xl leading-tight font-black">Secure Account Creation.</h2>
            <p className="mt-4 text-sm font-semibold text-white/85 max-w-sm">
              Verify with email or phone before your account goes live, and protect every sign-in with trusted-device checks.
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18, duration: 0.45 }} className="p-8 sm:p-10 lg:p-12">
          <div className="text-center lg:text-left mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 via-cyan-500 to-cyan-300 text-white rounded-2xl mb-5 shadow-lg shadow-cyan-500/30">
              <ShieldCheck size={28} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Create Account</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Choose email or phone, verify it, then finish registration.</p>
          </div>

          {referrer && (
            <div className="mb-5 p-4 rounded-2xl border border-cyan-100 bg-cyan-50 text-cyan-700 text-sm font-bold flex items-start gap-3">
              <Gift size={18} className="shrink-0 mt-0.5" />
              <div>Joining through <span className="font-black">@{referrer}</span>'s invite.</div>
            </div>
          )}

          {error && <div className="mb-5 p-3 rounded-xl border border-rose-100 bg-rose-50 text-rose-600 font-bold text-sm">{error}</div>}
          {verificationStatus && <div className="mb-5 p-3 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700 font-bold text-sm">{verificationStatus}</div>}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, verificationChannel: 'email', verificationCode: '' }))} className={`p-4 rounded-2xl font-black text-sm border transition-all ${formData.verificationChannel === 'email' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Email Profile</button>
              <button type="button" onClick={() => setFormData((prev) => ({ ...prev, verificationChannel: 'phone', verificationCode: '' }))} className={`p-4 rounded-2xl font-black text-sm border transition-all ${formData.verificationChannel === 'phone' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Phone Profile</button>
            </div>

            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input required type="text" placeholder="Username" className="w-full pl-14 pr-6 py-4 app-input" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
            </div>
            {formData.username.trim() && (
              <p className={`text-xs font-bold ml-1 ${usernameState.checking ? 'text-slate-400' : usernameState.hardFailure ? 'text-rose-600' : usernameState.available && usernameState.message ? 'text-emerald-600' : 'text-rose-600'}`}>
                {usernameState.checking ? 'Checking username...' : usernameState.message}
              </p>
            )}

            <div className="relative">
              {formData.verificationChannel === 'phone' ? <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} /> : <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />}
              <input
                required
                type={formData.verificationChannel === 'phone' ? 'tel' : 'email'}
                placeholder={channelLabel}
                className="w-full pl-14 pr-40 py-4 app-input"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={formData.verificationChannel === 'phone' ? formData.phone : formData.email}
                onChange={(e) => setFormData({ ...formData, [formData.verificationChannel === 'phone' ? 'phone' : 'email']: e.target.value })}
              />
              <button type="button" onClick={handleRequestCode} disabled={sendingCode} className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60">
                {sendingCode ? 'Sending' : 'Send Code'}
              </button>
            </div>

            <div className="relative">
              <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input required type="text" inputMode="numeric" placeholder="Verification Code" className="w-full pl-14 pr-6 py-4 app-input" value={formData.verificationCode} onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value })} />
            </div>

            {formData.verificationChannel === 'email' && (
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="email" placeholder="Backup Email (optional if using phone)" className="w-full pl-14 pr-6 py-4 app-input" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
            )}

            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input required type="password" placeholder="Create Password" className="w-full pl-14 pr-6 py-4 app-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
            </div>

            <button type="submit" disabled={submitting || !usernameState.available} className="w-full app-btn-primary py-4 text-lg flex items-center justify-center gap-3 mt-2">
              {submitting ? 'Creating Account...' : 'Create Verified Account'} <ArrowRight size={20} />
            </button>
          </form>

          <p className="text-center lg:text-left mt-8 text-slate-500 dark:text-slate-400 font-bold text-sm">
            Already a member? <Link to="/login" className="text-cyan-600 hover:underline">Log In</Link>
          </p>
        </motion.div>
      </motion.section>
    </div>
  );
}
