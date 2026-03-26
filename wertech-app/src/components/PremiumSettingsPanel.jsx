import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, BookOpenText, Crown, LifeBuoy, Rocket, Search, Users } from 'lucide-react';
import { getApiMessage, toastError, toastSuccess } from '../utils/feedback';

const EMPTY_PREMIUM = {
  has_premium: false,
  premium_tier: 'free',
  premium_verified: false,
  premium_badge_text: 'Verified Pro',
  profile_boost_active: false,
  profile_boost_until: null,
  profile_theme: 'ocean',
  profile_banner: '',
  accent_color: '#14b8a6',
  premium_insights_enabled: false,
  priority_support_enabled: false,
  premium_plan: {
    price_inr: 500,
    member_discount_percent: 20,
    welcome_bonus_wtk: 50,
    referral_reward_wtk: 75,
    profile_boost_cost_wtk: 60,
    listing_boost_cost_wtk: 40
  },
  referral_unlock_progress: { count: 0, target: 2, reward_claimed: false },
  analytics: null,
  circles: []
};

const HELP_ARTICLES = [
  {
    question: 'How do I create an account with email or phone?',
    answer: 'Open registration, choose email or phone profile creation, enter the address or number, and confirm the OTP or verification message before the profile becomes active.'
  },
  {
    question: 'Why is my username not validating on mobile?',
    answer: 'Use only letters, numbers, underscores, or dots, avoid spaces, and wait a moment after typing so the app can finish the availability check.'
  },
  {
    question: 'How do I sign in from a new device?',
    answer: 'If the app sees a new device, it sends a verification code to your verified email or phone. Enter that code to confirm it is really you.'
  },
  {
    question: 'How do I reset my password?',
    answer: 'Use Forgot Password on the login page, choose email or phone, then pick OTP code or reset link and set a new password after verification.'
  },
  {
    question: 'How do messages, audio calls, and video calls work?',
    answer: 'Open a chat with a user to send messages, then start an audio or video call from that conversation when both sides are available.'
  },
  {
    question: 'How do nearby results work in Explore?',
    answer: 'Allow location permission and Explore will automatically sort closer users and listings first, plus show a nearby map view when coordinates are available.'
  },
  {
    question: 'How do coins, UPI, and user transfers work?',
    answer: 'The wallet supports buying platform coins, transferring them to another user, and other transaction flows that appear in your ledger and live updates.'
  },
  {
    question: 'Who can use support and complaints?',
    answer: 'Every user can use support from settings. Get Help shows common answers, and Send Complaint routes the issue to support email, admin dashboard alerts, and the verified Wertech admin inbox.'
  }
];

const REGION_TO_CURRENCY = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  AU: 'AUD',
  NZ: 'NZD',
  AE: 'AED',
  SA: 'SAR',
  QA: 'QAR',
  KW: 'KWD',
  OM: 'OMR',
  BH: 'BHD',
  SG: 'SGD',
  MY: 'MYR',
  IN: 'INR',
  NP: 'NPR',
  BD: 'BDT',
  LK: 'LKR',
  PK: 'PKR',
  EU: 'EUR',
  DE: 'EUR',
  FR: 'EUR',
  IT: 'EUR',
  ES: 'EUR',
  NL: 'EUR',
  IE: 'EUR'
};

const FALLBACK_INR_EXCHANGE_RATES = {
  USD: 0.012,
  CAD: 0.016,
  GBP: 0.0094,
  AUD: 0.018,
  NZD: 0.02,
  AED: 0.044,
  SAR: 0.045,
  QAR: 0.044,
  KWD: 0.0037,
  OMR: 0.0046,
  BHD: 0.0045,
  SGD: 0.016,
  MYR: 0.057,
  NPR: 1.6,
  BDT: 1.3,
  LKR: 3.6,
  PKR: 3.3,
  EUR: 0.011
};

function detectRegionalCurrency() {
  const locale = navigator.language || 'en-IN';
  const regionMatch = locale.match(/-([A-Z]{2})$/i);
  const region = regionMatch?.[1]?.toUpperCase() || 'IN';
  return {
    locale,
    region,
    currency: REGION_TO_CURRENCY[region] || 'USD'
  };
}

function formatCurrency(amount, currency, locale) {
  try {
    return new Intl.NumberFormat(locale || 'en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount >= 100 ? 0 : 2
    }).format(amount);
  } catch (error) {
    return `${currency} ${Number(amount || 0).toFixed(2)}`;
  }
}

export default function PremiumSettingsPanel({ username }) {
  const navigate = useNavigate();
  const [premium, setPremium] = useState(EMPTY_PREMIUM);
  const [supportTickets, setSupportTickets] = useState([]);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportDescription, setSupportDescription] = useState('');
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const [helpQuery, setHelpQuery] = useState('');
  const [circleName, setCircleName] = useState('');
  const [circleDescription, setCircleDescription] = useState('');
  const [regionalCurrency, setRegionalCurrency] = useState({ locale: 'en-IN', region: 'IN', currency: 'INR', rate: 1, isApproximate: false });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleUnlockPremium = async () => {
    if (!username) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not start premium checkout.'));
        return;
      }
      if (data?.payment_url) {
        window.open(data.payment_url, '_blank', 'noopener,noreferrer');
        const amountInr = Number(data.amount_inr || premium.premium_plan?.price_inr || 500);
        const localAmountLabel = regionalCurrency.currency === 'INR'
          ? ''
          : ` (${formatCurrency(amountInr * Number(regionalCurrency.rate || 1), regionalCurrency.currency, regionalCurrency.locale)})`;
        toastSuccess(`Checkout opened for Rs ${amountInr}${localAmountLabel}.`);
      } else {
        toastSuccess(data?.message || 'Premium checkout created.');
      }
      await loadData();
    } catch (error) {
      toastError('Could not start premium checkout.');
    } finally {
      setBusy(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    try {
      const [premiumRes, supportRes] = await Promise.all([
        fetch(`/api/users/${encodeURIComponent(username)}/premium`),
        fetch(`/api/support/tickets?username=${encodeURIComponent(username)}`)
      ]);
      const [premiumData, supportData] = await Promise.all([
        premiumRes.json().catch(() => ({})),
        supportRes.json().catch(() => ([]))
      ]);
      if (premiumRes.ok) {
        setPremium({ ...EMPTY_PREMIUM, ...premiumData });
      } else {
        setPremium(EMPTY_PREMIUM);
      }
      setSupportTickets(Array.isArray(supportData) ? supportData : []);
    } catch (error) {
      setPremium(EMPTY_PREMIUM);
      setSupportTickets([]);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let cancelled = false;
    const regionalInfo = detectRegionalCurrency();
    if (regionalInfo.currency === 'INR') {
      setRegionalCurrency({ ...regionalInfo, rate: 1, isApproximate: false });
      return undefined;
    }

    const fallbackRate = FALLBACK_INR_EXCHANGE_RATES[regionalInfo.currency] || FALLBACK_INR_EXCHANGE_RATES.USD;
    setRegionalCurrency({ ...regionalInfo, rate: fallbackRate, isApproximate: true });

    fetch('https://open.er-api.com/v6/latest/INR')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return;
        const liveRate = Number(data?.rates?.[regionalInfo.currency]);
        if (Number.isFinite(liveRate) && liveRate > 0) {
          setRegionalCurrency({ ...regionalInfo, rate: liveRate, isApproximate: false });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const postAction = async (url, body, successMessage) => {
    setBusy(true);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not complete premium action.'));
        return false;
      }
      if (data.wtk_balance !== undefined) {
        localStorage.setItem('userBalance', String(data.wtk_balance || 0));
      }
      if (data.has_premium !== undefined) {
        localStorage.setItem('hasSubscribed', String(!!data.has_premium));
      }
      toastSuccess(successMessage);
      await loadData();
      return true;
    } catch (error) {
      toastError('Could not complete premium action.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const referralCount = Number(premium.referral_unlock_progress?.count || 0);
  const referralTarget = Number(premium.referral_unlock_progress?.target || 2);
  const planPrice = Number(premium.premium_plan?.price_inr || 500);
  const memberDiscount = Number(premium.premium_plan?.member_discount_percent || 0);
  const welcomeBonus = Number(premium.premium_plan?.welcome_bonus_wtk || 0);
  const referralReward = Number(premium.premium_plan?.referral_reward_wtk || 0);
  const profileBoostCost = Number(premium.premium_plan?.profile_boost_cost_wtk || 60);
  const listingBoostCost = Number(premium.premium_plan?.listing_boost_cost_wtk || 40);
  const normalizedHelpQuery = helpQuery.trim().toLowerCase();
  const filteredHelpArticles = HELP_ARTICLES.filter((article) => {
    if (!normalizedHelpQuery) return true;
    const haystack = `${article.question} ${article.answer}`.toLowerCase();
    return haystack.includes(normalizedHelpQuery);
  });
  const localPlanPrice = planPrice * Number(regionalCurrency.rate || 1);
  const localPriceLabel = regionalCurrency.currency === 'INR'
    ? formatCurrency(planPrice, 'INR', regionalCurrency.locale)
    : formatCurrency(localPlanPrice, regionalCurrency.currency, regionalCurrency.locale);
  const unlockLabel = regionalCurrency.currency === 'INR'
    ? `Unlock For Rs ${planPrice}`
    : `Unlock For Rs ${planPrice} / ${localPriceLabel}`;

  const openComplaintInbox = () => {
    const normalizedSubject = supportSubject.trim();
    const normalizedDescription = supportDescription.trim();
    const complaintDraft = [
      '[Complaint For Verified Wertech Support]',
      normalizedSubject ? `Subject: ${normalizedSubject}` : 'Subject: Support request',
      normalizedDescription ? `Details: ${normalizedDescription}` : 'Details: Please describe the issue here.'
    ].join('\n');
    navigate('/messages', {
      state: {
        targetUsername: 'wertech',
        complaintDraft
      }
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-50 dark:border-slate-800 shadow-sm space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-[0.2em]">
            <Crown size={12} /> Premium
          </div>
          <h2 className="mt-4 text-3xl font-black text-slate-900 dark:text-white">Premium Version</h2>
          <p className="text-slate-400 font-medium mt-2">Paid membership for verified profiles, boosts, circles, analytics, rewards, and member discounts.</p>
        </div>
        {!premium.has_premium && (
          <button type="button" onClick={handleUnlockPremium} disabled={busy} className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black disabled:opacity-60">
            {busy ? 'Starting Checkout...' : unlockLabel}
          </button>
        )}
      </div>

      {loading ? <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-bold">Loading premium tools...</div> : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="p-5 rounded-[28px] bg-amber-50 border border-amber-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Membership Price</p>
              <p className="mt-2 text-3xl font-black text-slate-900">Rs {planPrice}</p>
              <p className="mt-2 text-lg font-black text-amber-700">{localPriceLabel}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">One paid upgrade to unlock the member-only studio for your current region.{regionalCurrency.isApproximate ? ' Local value is an approximate fallback until the live rate loads.' : ''}</p>
            </div>
            <div className="p-5 rounded-[28px] bg-cyan-50 border border-cyan-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">Welcome Reward</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{welcomeBonus} WTK</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">Added after the Rs {planPrice} payment is confirmed.{regionalCurrency.currency === 'INR' ? '' : ` That's about ${localPriceLabel} in your region.`}</p>
            </div>
            <div className="p-5 rounded-[28px] bg-emerald-50 border border-emerald-100">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Member Discount</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{memberDiscount}% off</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">Applies to profile and listing boosts for members only.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-[28px] bg-slate-50 dark:bg-slate-800/40"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tier</p><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{premium.premium_tier === 'pro' ? 'Pro' : 'Free'}</p></div>
            <div className="p-5 rounded-[28px] bg-slate-50 dark:bg-slate-800/40"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Badge</p><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{premium.premium_verified ? 'Verified' : 'Standard'}</p></div>
            <div className="p-5 rounded-[28px] bg-slate-50 dark:bg-slate-800/40"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Boost</p><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{premium.profile_boost_active ? 'Live' : 'Idle'}</p></div>
            <div className="p-5 rounded-[28px] bg-slate-50 dark:bg-slate-800/40"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Referrals</p><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{referralCount}/{referralTarget}</p></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="p-6 rounded-[32px] border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-4"><Rocket className="text-amber-500" size={22} /><h3 className="text-xl font-black text-slate-900 dark:text-white">Boosts And Rewards</h3></div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Profile boost status: {premium.profile_boost_active ? 'Active now' : 'Not active'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">Boost ends: {premium.profile_boost_until ? new Date(premium.profile_boost_until).toLocaleString() : 'No active boost'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">Member boost prices: {profileBoostCost} WTK for profile boost, {listingBoostCost} WTK for listing boost.</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2">Referral reward after {referralTarget} referrals: {referralReward} WTK.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                  <button type="button" onClick={() => postAction(`/api/users/${encodeURIComponent(username)}/premium/boost-profile`, null, 'Profile boost activated.')} disabled={!premium.has_premium || busy} className="px-4 py-3 rounded-2xl bg-amber-500 text-white font-black disabled:opacity-50">Boost Profile</button>
                  <button type="button" onClick={() => postAction(`/api/users/${encodeURIComponent(username)}/premium/claim-referral-reward`, null, 'Referral premium reward claimed.')} disabled={!premium.has_premium || busy || !!premium.referral_unlock_progress?.reward_claimed || referralCount < referralTarget} className="px-4 py-3 rounded-2xl bg-slate-900 text-white font-black disabled:opacity-50">Claim Referral Reward</button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-[32px] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4"><Users className="text-violet-600" size={22} /><h3 className="text-xl font-black text-slate-900 dark:text-white">Premium Circles</h3></div>
              {!premium.has_premium && <p className="text-sm font-bold text-amber-600 mb-4">Only paid subscribers can create or manage private circles.</p>}
              <div className="space-y-3">
                <input value={circleName} onChange={(e) => setCircleName(e.target.value)} placeholder="Circle name" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white font-semibold outline-none" disabled={!premium.has_premium} />
                <textarea value={circleDescription} onChange={(e) => setCircleDescription(e.target.value)} placeholder="What is this circle for?" rows={3} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white font-semibold outline-none resize-none" disabled={!premium.has_premium} />
                <button type="button" onClick={() => postAction('/api/circles', { owner_username: username, name: circleName, description: circleDescription }, 'Subscriber circle created.').then((ok) => { if (ok) { setCircleName(''); setCircleDescription(''); } })} disabled={!premium.has_premium || busy || !circleName.trim()} className="w-full px-4 py-3 rounded-2xl bg-violet-600 text-white font-black disabled:opacity-50">Create Circle</button>
              </div>
              <div className="mt-5 space-y-3">{(premium.circles || []).map((circle) => <div key={circle.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40"><p className="font-black text-slate-900 dark:text-white">{circle.name}</p><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{circle.description || 'Private premium community circle'}</p><p className="text-[11px] font-black uppercase tracking-wider text-violet-600 mt-2">{circle.member_count} members</p></div>)}{(premium.circles || []).length === 0 && <p className="text-sm text-slate-400 font-semibold">No premium circles yet.</p>}</div>
            </div>

            <div className="p-6 rounded-[32px] border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-4"><LifeBuoy className="text-rose-600" size={22} /><h3 className="text-xl font-black text-slate-900 dark:text-white">Support Desk</h3></div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black uppercase tracking-[0.18em]">
                  <BadgeCheck size={14} />
                  Verified Wertech Support
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Complaints go to support email, admin alerts, and the verified `wertech` inbox.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <button type="button" onClick={() => setShowHelpCenter((current) => !current)} className="w-full px-4 py-3 rounded-2xl bg-sky-100 text-sky-700 font-black">
                  {showHelpCenter ? 'Hide Help' : 'Get Help'}
                </button>
                <button type="button" onClick={openComplaintInbox} className="w-full px-4 py-3 rounded-2xl bg-rose-600 text-white font-black">
                  Send Complaint
                </button>
              </div>
              {showHelpCenter && (
                <div className="mb-5 p-5 rounded-[28px] bg-sky-50 dark:bg-slate-800/50 border border-sky-100 dark:border-slate-700">
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpenText className="text-sky-600" size={20} />
                    <div>
                      <p className="font-black text-slate-900 dark:text-white">Help Center</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Search common answers for account, wallet, calls, explore, and support questions.</p>
                    </div>
                  </div>
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input value={helpQuery} onChange={(e) => setHelpQuery(e.target.value)} placeholder="Search help topics" className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 dark:text-white font-semibold outline-none border border-sky-100 dark:border-slate-700" />
                  </div>
                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {filteredHelpArticles.map((article) => (
                      <div key={article.question} className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-sky-100 dark:border-slate-700">
                        <p className="font-black text-slate-900 dark:text-white">{article.question}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 font-medium">{article.answer}</p>
                      </div>
                    ))}
                    {filteredHelpArticles.length === 0 && <p className="text-sm text-slate-400 font-semibold">No help answers matched that search yet. Try a simpler keyword like login, wallet, call, explore, or complaint.</p>}
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <input value={supportSubject} onChange={(e) => setSupportSubject(e.target.value)} placeholder="Support subject" className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white font-semibold outline-none" />
                <textarea value={supportDescription} onChange={(e) => setSupportDescription(e.target.value)} placeholder="Tell us what happened" rows={3} className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 dark:text-white font-semibold outline-none resize-none" />
              </div>
              <div className="mt-5 space-y-3">{supportTickets.map((ticket) => <div key={ticket.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40"><div className="flex items-center justify-between gap-3"><p className="font-black text-slate-900 dark:text-white">{ticket.subject}</p><span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${ticket.priority === 'priority' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>{ticket.priority}</span></div><p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{ticket.status}</p><div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-[0.16em]"><BadgeCheck size={12} /> Wertech Verified Complaint Route</div></div>)}{supportTickets.length === 0 && <p className="text-sm text-slate-400 font-semibold">No support tickets yet.</p>}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
