import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, ShieldCheck, Zap, Plus, X, 
  Save, ListChecks, Send, Clock, ArrowRight, Sparkles, Rocket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toastError, toastSuccess } from '../utils/feedback';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // --- 1. STATE MANAGEMENT ---
  const [myListings, setMyListings] = useState([]);
  const [currentRating, setCurrentRating] = useState(4.9);
  const [ratingInput, setRatingInput] = useState(4.9);
  
  const [isDoneModalOpen, setIsDoneModalOpen] = useState(false);
  const [isBarterModalOpen, setIsBarterModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  
  const [txAmount, setTxAmount] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [quickTxUsers, setQuickTxUsers] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [activeBarters, setActiveBarters] = useState([]);
  const [statusMsg, setStatusMsg] = useState(''); 
  const [statusType, setStatusType] = useState(''); 
  const currentUsername = localStorage.getItem('username') || '';
  const [initialLoading, setInitialLoading] = useState(true);
  const [premiumSummary, setPremiumSummary] = useState(null);
  const [premiumRecommendations, setPremiumRecommendations] = useState({ suggested_matches: [], suggested_listings: [] });
  const [balance, setBalance] = useState(() => {
    const savedBalance = localStorage.getItem('userBalance');
    return savedBalance ? parseInt(savedBalance) : 0;
  });

  useEffect(() => {
    const savedRating = localStorage.getItem('userRating');
    if (savedRating) {
        const rate = parseFloat(savedRating);
        setCurrentRating(rate);
        setRatingInput(rate);
    }

    const alreadyAssigned = JSON.parse(localStorage.getItem(`assignedWtkUsers_${currentUsername}`)) || [];
    setAssignedUsers(alreadyAssigned);

    const loadUsers = async () => {
      try {
        const response = await fetch('/api/users');
        const users = await response.json();
        if (!response.ok || !Array.isArray(users)) return;

        const uniqueUsers = [...new Set(users.map((u) => u.username).filter(Boolean))]
          .filter((name) => name !== currentUsername);
        setQuickTxUsers(uniqueUsers);
      } catch (err) {
        setQuickTxUsers([]);
      }
    };

    const loadMyListings = async () => {
        if (!currentUsername) return;
        try {
          const response = await fetch(
            `/api/listings/user/${encodeURIComponent(currentUsername)}?viewer_username=${encodeURIComponent(currentUsername)}`
          );
          const data = await response.json();
          if (!response.ok || !Array.isArray(data)) return;
          setMyListings(data.filter((item) => item?.owner_username === currentUsername));
        } catch (err) {
          // no-op
        }
      };

    const loadWallet = async () => {
      if (!currentUsername) return;
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(currentUsername)}/wallet`);
        const data = await response.json();
        if (!response.ok) return;
        const dbBalance = Number(data.wtk_balance || 0);
        setBalance(dbBalance);
        localStorage.setItem('userBalance', String(dbBalance));
      } catch (err) {
        // keep local fallback
      }
    };

    Promise.allSettled([loadWallet(), loadMyListings(), loadUsers()]).finally(() => {
      setInitialLoading(false);
    });

    const loadPremium = async () => {
      if (!currentUsername) return;
      try {
        const [premiumRes, recommendationRes] = await Promise.all([
          fetch(`/api/users/${encodeURIComponent(currentUsername)}/premium`),
          fetch(`/api/users/${encodeURIComponent(currentUsername)}/premium/recommendations`)
        ]);
        const [premiumData, recommendationData] = await Promise.all([
          premiumRes.json().catch(() => ({})),
          recommendationRes.json().catch(() => ({ suggested_matches: [], suggested_listings: [] }))
        ]);
        if (premiumRes.ok) setPremiumSummary(premiumData);
        if (recommendationRes.ok) setPremiumRecommendations(recommendationData);
      } catch (err) {
        setPremiumSummary(null);
      }
    };
    loadPremium();
  }, [currentUsername]);

  useEffect(() => {
    const loadActiveBarters = async () => {
      if (!currentUsername) return;
      try {
        const response = await fetch(
          `/api/barters/user/${encodeURIComponent(currentUsername)}?active_only=true`
        );
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) return;
        setActiveBarters(data);
      } catch (err) {
        // no-op
      }
    };

    loadActiveBarters();
    const timer = setInterval(loadActiveBarters, 3000);
    return () => clearInterval(timer);
  }, [currentUsername]);

  const formatBarterStatus = (value) => String(value || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());

  // --- 2. LOGIC ---
  const updateRating = () => {
    const newRate = parseFloat(ratingInput);
    if (newRate >= 0 && newRate <= 5) {
      setCurrentRating(newRate);
      localStorage.setItem('userRating', newRate.toString());
      setIsRatingModalOpen(false);
    }
  };

  const handleTransaction = async (type) => {
    const amount = parseInt(txAmount);
    if (!selectedUser) {
      setStatusMsg("Please select a user");
      setStatusType("error");
      return;
    }
    if (assignedUsers.includes(selectedUser)) {
      setStatusMsg("This user already received an assignment. Please choose a different user.");
      setStatusType("error");
      return;
    }
    if (!txAmount || amount <= 0) {
      setStatusMsg("Please enter the No. of WTK");
      setStatusType("error");
      return;
    }
    if (type === 'spent' && amount > balance) {
      setStatusMsg("Insufficient Balance!");
      setStatusType("error");
      return;
    }

    try {
      const response = await fetch('/api/transactions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          type,
          selectedUser,
          wtk: amount
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setStatusMsg(data.message || 'Transaction failed');
        setStatusType("error");
        return;
      }

      const newBalance = Number(data.wtk_balance || 0);
      setBalance(newBalance);
      localStorage.setItem('userBalance', String(newBalance));
      setStatusMsg(data.message || (type === 'spent' ? 'WTK sent successfully!' : 'WTK request sent successfully!'));
      setStatusType("success");
      setTxAmount('');
      const updatedAssigned = [...assignedUsers, selectedUser];
      setAssignedUsers(updatedAssigned);
      localStorage.setItem(`assignedWtkUsers_${currentUsername}`, JSON.stringify(updatedAssigned));
      setSelectedUser('');

      setTimeout(() => {
        setIsDoneModalOpen(false);
        setStatusMsg('');
      }, 1500);
    } catch (err) {
      setStatusMsg('Could not connect to server');
      setStatusType("error");
    }
  };

  if (initialLoading) {
    return (
      <div className="p-10 space-y-10">
        <div className="flex justify-between items-center">
          <div className="h-11 w-52 rounded-2xl bg-white/80 border border-slate-100 animate-pulse" />
          <div className="h-14 w-44 rounded-2xl bg-white/80 border border-slate-100 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-48 rounded-[40px] bg-white/80 border border-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="space-y-6">
          <div className="h-8 w-48 rounded-2xl bg-white/80 border border-slate-100 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-36 rounded-[32px] bg-white/80 border border-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="p-10 space-y-10">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Dashboard</h1>
        <button 
          onClick={() => navigate('/create')} 
          className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-teal-700 shadow-lg shadow-teal-600/20 transition-all active:scale-95"
        >
          <Plus size={20} /> New Listing
        </button>
      </div>

      {/* TOP CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="bg-teal-600 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
          <Coins className="mb-6 opacity-80" size={32} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Available Balance</p>
          <h2 className="text-5xl font-black mt-2">{balance.toLocaleString()} <span className="text-lg opacity-60">WTK</span></h2>
        </div>

        {/* --- FIXED TRUST RATING CARD --- */}
        <button 
          onClick={() => setIsRatingModalOpen(true)} 
          className="text-left bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-50 dark:border-slate-800 shadow-sm hover:border-teal-500 transition-all group relative overflow-hidden"
        >
          <ShieldCheck className="mb-6 text-teal-600 group-hover:scale-110 transition-transform" size={32} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trust Rating</p>
          <div className="flex items-baseline gap-1 mt-2">
            <h2 className="text-4xl font-black dark:text-white">{currentRating.toFixed(1)}</h2>
            <span className="text-lg text-slate-300 font-bold">/5.0</span>
          </div>
          {/* Visual Progress Bar */}
          <div className="mt-4 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-teal-500 rounded-full transition-all duration-700" 
              style={{ width: `${(currentRating / 5) * 100}%` }} 
            />
          </div>
        </button>

        <button onClick={() => setIsBarterModalOpen(true)} className="text-left bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-50 dark:border-slate-800 shadow-sm hover:border-yellow-500 transition-all group">
          <Zap className="mb-6 text-yellow-500 group-hover:scale-110 transition-transform" size={32} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Barters</p>
          <h2 className="text-4xl font-black mt-2 dark:text-white">{activeBarters.length}</h2>
        </button>

        <button onClick={() => { setStatusMsg(''); setIsDoneModalOpen(true); }} className="text-left bg-white dark:bg-slate-900 p-10 rounded-[40px] border border-slate-50 dark:border-slate-800 shadow-sm hover:border-teal-500 transition-all group">
          <ListChecks className="mb-6 text-teal-600 group-hover:scale-110 transition-transform" size={32} />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quick Transaction</p>
          <h2 className="text-4xl font-black mt-2 dark:text-white">Done</h2>
        </button>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-8">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-50 dark:border-slate-800 shadow-sm">
          <div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Command Center</h3>
            <p className="text-sm text-slate-400 font-medium">Reach, trust, and conversion signals in one place.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tier</p><p className="mt-2 text-2xl font-black dark:text-white">{premiumSummary?.premium_tier === 'pro' ? 'Pro' : 'Free'}</p></div>
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profile Views</p><p className="mt-2 text-2xl font-black dark:text-white">{premiumSummary?.analytics?.profile_views ?? 0}</p></div>
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Listing Views</p><p className="mt-2 text-2xl font-black dark:text-white">{premiumSummary?.analytics?.listing_views ?? 0}</p></div>
            <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Closed Deals</p><p className="mt-2 text-2xl font-black dark:text-white">{premiumSummary?.analytics?.completed_deals ?? 0}</p></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {premiumSummary?.premium_verified && <span className="px-4 py-2 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2"><Sparkles size={12} /> {premiumSummary.premium_badge_text || 'Verified Pro'}</span>}
            {premiumSummary?.profile_boost_active && <span className="px-4 py-2 rounded-full bg-cyan-50 text-cyan-600 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2"><Rocket size={12} /> Profile Boost Live</span>}
            <button onClick={() => navigate('/settings')} className="px-4 py-2 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">Manage Settings</button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-50 dark:border-slate-800 shadow-sm">
          <h3 className="text-2xl font-black text-slate-900 dark:text-white">Smart Matches</h3>
          <div className="mt-5 space-y-3">
            {(premiumRecommendations.suggested_matches || []).slice(0, 3).map((match) => (
              <button key={match.username} onClick={() => navigate(`/profile/${encodeURIComponent(match.username)}`)} className="w-full text-left p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-black text-slate-900 dark:text-white">{match.username}</p>
                  <span className="text-[10px] font-black uppercase tracking-widest text-teal-600">{match.overlap_count} shared skills</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{(match.matching_skills || []).join(', ') || 'Suggested barter partner'}</p>
              </button>
            ))}
            {(premiumRecommendations.suggested_matches || []).length === 0 && (
              <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 text-slate-400 font-bold">Add more skills to unlock smarter match suggestions.</div>
            )}
          </div>
        </div>
      </section>

      {/* MY LISTINGS */}
      <section className="space-y-6">
        <h3 className="text-2xl font-black text-slate-900 dark:text-white">My New Listings</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {myListings.length > 0 ? myListings.map((item) => (
            <div key={item._id || item.id} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-50 dark:border-slate-800 shadow-sm">
              <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate">{item.title}</h4>
              <p className="text-teal-600 font-black mt-2">{item.wtk} WTK</p>
              {item.boosted && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-amber-600">Boosted Listing</p>}
              {premiumSummary?.has_premium && (
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/listings/${encodeURIComponent(item._id || item.id)}/boost`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: currentUsername })
                      });
                      const data = await response.json().catch(() => ({}));
                      if (!response.ok) {
                        toastError(data.message || 'Could not boost listing.');
                        return;
                      }
                      toastSuccess('Listing boost activated.');
                      setMyListings((prev) => prev.map((entry) => ((entry._id || entry.id) === (item._id || item.id) ? { ...entry, boosted: true } : entry)));
                    } catch (err) {
                      toastError('Could not boost listing.');
                    }
                  }}
                  className="mt-4 px-4 py-2 rounded-2xl bg-amber-500 text-white text-xs font-black uppercase tracking-widest"
                >
                  Boost Listing
                </button>
              )}
            </div>
          )) : (
            <div className="col-span-full p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] text-center text-slate-400 font-medium">
              No active listings found. Click "New Listing" to start.
            </div>
          )}
        </div>
      </section>

      {/* --- MODAL: EDIT TRUST RATING --- */}
      <AnimatePresence>
        {isRatingModalOpen && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-10 shadow-2xl border dark:border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black dark:text-white">Update Rating</h2>
                <button onClick={() => setIsRatingModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X size={24} /></button>
              </div>
              <p className="text-sm text-slate-500 mb-6 font-medium">Manually adjust your community trust score (0.0 - 5.0).</p>
              
              <div className="flex items-center gap-4 mb-8">
                 <input 
                    type="range" min="0" max="5" step="0.1" 
                    value={ratingInput} 
                    onChange={(e) => setRatingInput(e.target.value)}
                    className="flex-1 accent-teal-600"
                 />
                 <span className="text-2xl font-black dark:text-white w-12 text-center">{parseFloat(ratingInput).toFixed(1)}</span>
              </div>

              <button 
                onClick={updateRating} 
                className="w-full bg-teal-600 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
              >
                <Save size={20}/> Save Rating
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ACTIVE BARTERS */}
      <AnimatePresence>
        {isBarterModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[50px] overflow-hidden flex flex-col shadow-2xl border dark:border-slate-800">
              <div className="p-10 border-b dark:border-slate-800 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black dark:text-white">Active Barters</h2>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Ongoing Exchanges</p>
                </div>
                <button onClick={() => setIsBarterModalOpen(false)} className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-red-500 hover:text-white transition-all"><X size={20} /></button>
              </div>
              <div className="p-8 overflow-y-auto max-h-[60vh] space-y-4">
                {activeBarters.map((barter) => {
                  const partner = barter.sender_username === currentUsername
                    ? barter.receiver_username
                    : barter.sender_username;
                  return (
                  <button
                    key={barter._id}
                    onClick={() => navigate(`/profile/${encodeURIComponent(partner)}`)}
                    className="w-full text-left flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[30px] group transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-teal-100 dark:bg-teal-900/30 rounded-2xl flex items-center justify-center text-teal-600"><Clock size={24} /></div>
                      <div>
                        <h4 className="font-black dark:text-white text-sm">{barter.item}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">With {partner}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-6">
                      <div>
                        <span className="block text-[10px] font-black text-teal-600 uppercase tracking-tighter">{formatBarterStatus(barter.status)}</span>
                        <span className="font-bold dark:text-slate-300">{Number(barter.wtk || 0)} WTK</span>
                      </div>
                      <ArrowRight size={18} className="text-slate-300" />
                    </div>
                  </button>
                )})}
                {activeBarters.length === 0 && (
                  <div className="p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[30px] text-center text-slate-400 font-bold">
                    No active barters right now.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: QUICK TRANSACTION */}
      <AnimatePresence>
        {isDoneModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[40px] p-10 shadow-2xl border border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black dark:text-white">WTK Transfer</h2>
                <button onClick={() => setIsDoneModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"><X size={24} /></button>
              </div>

              <AnimatePresence mode="wait">
                {statusMsg && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className={`mb-6 p-4 rounded-2xl text-center font-bold text-sm border ${statusType === 'error' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-teal-50 text-teal-600 border-teal-100'}`}>
                    {statusMsg}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <select
                className="w-full p-4 mb-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-center text-base font-bold dark:text-white focus:ring-2 focus:ring-teal-500"
                onChange={(e) => { setSelectedUser(e.target.value); if(statusMsg) setStatusMsg(''); }}
                value={selectedUser}
              >
                <option value="">Select User</option>
                {quickTxUsers.map((user) => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>

              <input type="number" placeholder="Enter WTK Amount" className="w-full p-4 mb-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-center text-2xl font-black dark:text-white focus:ring-2 focus:ring-teal-500" onChange={(e) => { setTxAmount(e.target.value); if(statusMsg) setStatusMsg(''); }} value={txAmount} />

              <div className="flex">
                <button onClick={() => handleTransaction('spent')} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-95"><Send size={18}/> Send</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

