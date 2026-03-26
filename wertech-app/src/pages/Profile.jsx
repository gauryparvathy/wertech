import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  MapPin, ShieldCheck, Coins, Edit3, 
  Package, ExternalLink, X, Save, Plus, Navigation, Locate, Camera, Trash2, Zap, UserPlus, UserCheck, Clock4, Lock, UserMinus, Users, ChevronRight, MessageCircle, Share2, MoreVertical, Ban, Flag, BarChart3
} from 'lucide-react';
import { getApiMessage, toastError, toastInfo, toastSuccess } from '../utils/feedback';

export default function Profile() {
  const { username: routeUsername } = useParams();
  const navigate = useNavigate();
  const currentUsername = localStorage.getItem('username') || '';
  const targetUsername = routeUsername || currentUsername;
  const isOwnProfile = !routeUsername || routeUsername === currentUsername;
  const fileInputRef = useRef(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isUnfriendConfirmOpen, setIsUnfriendConfirmOpen] = useState(false);
  const [isProfileActionsOpen, setIsProfileActionsOpen] = useState(false);
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [myListings, setMyListings] = useState([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [friendsList, setFriendsList] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [canChangeUsername, setCanChangeUsername] = useState(true);
  const [nextUsernameChangeAt, setNextUsernameChangeAt] = useState(null);
  const [canChangeEmail, setCanChangeEmail] = useState(true);
  const [nextEmailChangeAt, setNextEmailChangeAt] = useState(null);
  const [canViewListings, setCanViewListings] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [isBlockedByViewer, setIsBlockedByViewer] = useState(false);
  const [hasBlockedViewer, setHasBlockedViewer] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [reportDetails, setReportDetails] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [friendshipStatus, setFriendshipStatus] = useState('none');
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [privateAnalytics, setPrivateAnalytics] = useState(null);
  
  // PROFILE STATE
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    profileImage: "",
    location: "Kalamassery, Kochi",
    skills: ["Web Design", "Gardening", "Plumbing"],
    radius: 15,
    profileBanner: "",
    profileTheme: "ocean",
    accentColor: "#14b8a6",
    premiumVerified: false,
    premiumBadgeText: "Verified Member",
    profileBoostActive: false,
    hasPremium: false
  });

  const [editForm, setEditForm] = useState({ ...profile });

  useEffect(() => {
    if (!targetUsername) return;

    const loadProfile = async () => {
      try {
        const response = await fetch(
          `/api/users/${encodeURIComponent(targetUsername)}/profile?viewer_username=${encodeURIComponent(currentUsername)}`
        );
        const data = await response.json();
        if (!response.ok) return;

        const nextProfile = {
          name: data.username || targetUsername,
          email: data.email || '',
          profileImage: data.profile_image || '',
          location: data.location || "Kalamassery, Kochi",
          skills: Array.isArray(data.skills) && data.skills.length > 0 ? data.skills : ["Web Design", "Gardening", "Plumbing"],
          radius: Number(data.radius || 15),
          profileBanner: data.profile_banner || '',
          profileTheme: data.profile_theme || 'ocean',
          accentColor: data.accent_color || '#14b8a6',
          premiumVerified: !!data.premium_verified,
          premiumBadgeText: data.premium_badge_text || 'Verified Member',
          profileBoostActive: !!data.profile_boost_active,
          hasPremium: !!data.has_premium
        };
        setProfile(nextProfile);
        setEditForm(nextProfile);
        setFriendsCount(Number(data.friends_count || 0));
        setCanViewListings(Boolean(data.can_view_listings));
        setProfileVisibility(String(data.profile_visibility || 'public'));
        setIsBlockedByViewer(Boolean(data.is_blocked_by_viewer));
        setHasBlockedViewer(Boolean(data.has_blocked_viewer));
        setFriendshipStatus(String(data.friendship_status || 'none'));
        setPrivateAnalytics(data.private_analytics || null);
        if (isOwnProfile) {
          setCanChangeUsername(Boolean(data.can_change_username));
          setNextUsernameChangeAt(data.next_username_change_at || null);
          setCanChangeEmail(Boolean(data.can_change_email));
          setNextEmailChangeAt(data.next_email_change_at || null);
        } else {
          setCanChangeUsername(false);
          setCanChangeEmail(false);
        }
      } catch (err) {
        const fallback = {
          name: targetUsername,
          email: "",
          profileImage: "",
          location: "Kalamassery, Kochi",
          skills: ["Web Design", "Gardening", "Plumbing"],
          radius: 15,
          profileBanner: '',
          profileTheme: 'ocean',
          accentColor: '#14b8a6',
          premiumVerified: false,
          premiumBadgeText: 'Verified Member',
          profileBoostActive: false,
          hasPremium: false
        };
        setProfile(fallback);
        setEditForm(fallback);
        setFriendsCount(0);
        setCanViewListings(isOwnProfile);
        setProfileVisibility('public');
        setIsBlockedByViewer(false);
        setHasBlockedViewer(false);
        setFriendshipStatus(isOwnProfile ? 'self' : 'none');
        setPrivateAnalytics(null);
      } finally {
        setInitialLoading(false);
      }
    };

      const loadMyListings = async (targetUsername) => {
      const cacheKey = `myListings_${targetUsername}`;
      try {
        const response = await fetch(
          `/api/listings/user/${encodeURIComponent(targetUsername)}?viewer_username=${encodeURIComponent(currentUsername)}`
        );
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          const cachedListings = JSON.parse(localStorage.getItem(cacheKey)) || [];
          setMyListings(cachedListings);
          return;
        }
        localStorage.setItem(cacheKey, JSON.stringify(data));
        setMyListings(data);
      } catch (err) {
        const cachedListings = JSON.parse(localStorage.getItem(cacheKey)) || [];
        setMyListings(cachedListings);
      }
    };

    loadProfile();
    loadMyListings(targetUsername);
  }, [targetUsername, isOwnProfile, currentUsername]);

  const sendFriendRequest = async () => {
    if (!currentUsername || !targetUsername || isOwnProfile) return;
    setFriendActionLoading(true);
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_username: currentUsername,
          to_username: targetUsername
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not send friend request.'));
        return;
      }
      setFriendshipStatus('request_sent');
      toastSuccess('Friend request sent.');
    } catch (err) {
      toastError('Could not send friend request.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const openFriendsModal = async () => {
    if (!targetUsername) return;
    setIsFriendsModalOpen(true);
    setLoadingFriends(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(targetUsername)}/friends`);
      const data = await response.json();
      if (!response.ok) {
        setFriendsList([]);
        return;
      }
      setFriendsCount(Number(data.count || 0));
      setFriendsList(Array.isArray(data.friends) ? data.friends : []);
    } catch (err) {
      setFriendsList([]);
    } finally {
      setLoadingFriends(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!currentUsername || !targetUsername || isOwnProfile) return;
    setFriendActionLoading(true);
    try {
      const response = await fetch('/api/friends/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_username: currentUsername,
          requester_username: targetUsername
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not accept friend request.'));
        return;
      }
      setFriendshipStatus('friends');
      setFriendsCount((prev) => prev + 1);
      setCanViewListings(true);
      try {
        const listingsRes = await fetch(
          `/api/listings/user/${encodeURIComponent(targetUsername)}?viewer_username=${encodeURIComponent(currentUsername)}`
        );
        const listingsData = await listingsRes.json();
        if (listingsRes.ok && Array.isArray(listingsData)) {
          setMyListings(listingsData);
        }
      } catch (err) {
        // no-op
      }
      toastSuccess('Friend request accepted.');
    } catch (err) {
      toastError('Could not accept friend request.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const rejectFriendRequest = async () => {
    if (!currentUsername || !targetUsername || isOwnProfile) return;
    setFriendActionLoading(true);
    try {
      const response = await fetch('/api/friends/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_username: currentUsername,
          requester_username: targetUsername
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not reject friend request.'));
        return;
      }
      setFriendshipStatus('none');
      toastInfo('Friend request rejected.');
    } catch (err) {
      toastError('Could not reject friend request.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const unfriendUser = async () => {
    if (!currentUsername || !targetUsername || isOwnProfile) return;
    setFriendActionLoading(true);
    try {
      const response = await fetch('/api/friends/unfriend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          target_username: targetUsername
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not remove friend.'));
        return;
      }
      setFriendshipStatus('none');
      setFriendsCount((prev) => Math.max(0, prev - 1));
      try {
        const profileRes = await fetch(
          `/api/users/${encodeURIComponent(targetUsername)}/profile?viewer_username=${encodeURIComponent(currentUsername)}`
        );
        const profileData = await profileRes.json();
        if (profileRes.ok) {
          setCanViewListings(Boolean(profileData.can_view_listings));
          setProfileVisibility(String(profileData.profile_visibility || 'public'));
        }

        const listingsRes = await fetch(
          `/api/listings/user/${encodeURIComponent(targetUsername)}?viewer_username=${encodeURIComponent(currentUsername)}`
        );
        const listingsData = await listingsRes.json();
        if (listingsRes.ok && Array.isArray(listingsData)) {
          setMyListings(listingsData);
        }
      } catch (err) {
        // no-op
      }
      toastInfo('Friend removed.');
    } catch (err) {
      toastError('Could not remove friend.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const blockUser = async () => {
    if (!currentUsername || !targetUsername || isOwnProfile) return;
    setFriendActionLoading(true);
    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocker_username: currentUsername,
          target_username: targetUsername
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not block user.'));
        return;
      }
      setIsBlockedByViewer(true);
      setFriendshipStatus('blocked');
      setCanViewListings(false);
      setMyListings([]);
      setIsBlockConfirmOpen(false);
      setIsProfileActionsOpen(false);
      toastInfo(`${targetUsername} has been blocked.`);
    } catch (err) {
      toastError('Could not block user.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const unblockUser = async () => {
    if (!currentUsername || !targetUsername || isOwnProfile) return;
    setFriendActionLoading(true);
    try {
      const response = await fetch('/api/users/unblock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocker_username: currentUsername,
          target_username: targetUsername
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not unblock user.'));
        return;
      }
      setIsBlockedByViewer(false);
      setFriendshipStatus('none');
      setIsProfileActionsOpen(false);
      toastSuccess('User unblocked.');
    } catch (err) {
      toastError('Could not unblock user.');
    } finally {
      setFriendActionLoading(false);
    }
  };

  const submitReport = async () => {
    if (!currentUsername || !targetUsername || isOwnProfile) return;
    try {
      const response = await fetch('/api/reports/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporter_username: currentUsername,
          reported_username: targetUsername,
          reason: reportReason,
          details: reportDetails
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not submit report.'));
        return;
      }
      setIsReportModalOpen(false);
      setIsProfileActionsOpen(false);
      setReportReason('Spam');
      setReportDetails('');
      toastSuccess('Report submitted successfully.');
    } catch (err) {
      toastError('Could not submit report.');
    }
  };

  const completeListingTransaction = async () => {
    if (!selectedListing?.owner_username || !currentUsername) return;
    const amount = Number(txAmount);
    if (!amount || amount <= 0) {
      setTxStatus('Enter a valid WTK amount.');
      return;
    }
    try {
      const response = await fetch('/api/transactions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: currentUsername,
          type: 'spent',
          selectedUser: selectedListing.owner_username,
          wtk: amount
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setTxStatus(data.message || 'Transaction failed.');
        return;
      }
      setTxStatus('Transaction completed. Added to history.');
      setTimeout(() => {
        setIsTransactionModalOpen(false);
        setTxStatus('');
        navigate('/history');
      }, 900);
    } catch (err) {
      setTxStatus('Could not complete transaction.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!currentUsername || !isOwnProfile) return;

    try {
      const response = await fetch(`/api/users/${encodeURIComponent(currentUsername)}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editForm.name,
          email: editForm.email,
          profile_image: editForm.profileImage || '',
          location: editForm.location,
          skills: editForm.skills,
          radius: editForm.radius,
          profile_theme: editForm.profileTheme || 'ocean',
          profile_banner: editForm.profileBanner || '',
          accent_color: editForm.accentColor || '#14b8a6'
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not update profile.'));
        return;
      }

      const updated = {
        name: data.username,
        email: data.email || '',
        profileImage: data.profile_image || '',
        location: data.location,
        skills: data.skills,
        radius: Number(data.radius || 15),
        profileBanner: data.profile_banner || '',
        profileTheme: data.profile_theme || 'ocean',
        accentColor: data.accent_color || '#14b8a6',
        premiumVerified: profile.premiumVerified,
        premiumBadgeText: profile.premiumBadgeText,
        profileBoostActive: profile.profileBoostActive,
        hasPremium: profile.hasPremium
      };
      setProfile(updated);
      setEditForm(updated);
      setCanChangeUsername(Boolean(data.can_change_username));
      setNextUsernameChangeAt(data.next_username_change_at || null);
      setCanChangeEmail(Boolean(data.can_change_email));
      setNextEmailChangeAt(data.next_email_change_at || null);

      if (data.username && data.username !== currentUsername) {
        localStorage.setItem('username', data.username);
      }
      if (data.wtk_balance !== undefined) {
        localStorage.setItem('userBalance', String(data.wtk_balance || 0));
      }
      try {
        const refreshedListings = await fetch(`/api/listings/user/${encodeURIComponent(data.username)}`);
        const listingData = await refreshedListings.json();
        if (refreshedListings.ok && Array.isArray(listingData)) {
          setMyListings(listingData);
          localStorage.setItem(`myListings_${data.username}`, JSON.stringify(listingData));
        }
      } catch (listingErr) {
        // no-op
      }
      setIsEditModalOpen(false);
      toastSuccess(data.profile_bonus_awarded ? 'Profile updated. +500 WTK profile bonus unlocked.' : 'Profile updated successfully.');
    } catch (err) {
      toastError('Could not update profile.');
    }
  };

  const addSkill = () => {
    if (newSkillInput.trim() && !editForm.skills.includes(newSkillInput.trim())) {
      setEditForm({
        ...editForm,
        skills: [...editForm.skills, newSkillInput.trim()]
      });
      setNewSkillInput("");
    }
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toastError('Image must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const value = String(reader.result || '');
      setEditForm((prev) => ({ ...prev, profileImage: value }));
    };
    reader.readAsDataURL(file);
  };

  const removeSkill = (skillToRemove) => {
    setEditForm({
      ...editForm,
      skills: editForm.skills.filter(s => s !== skillToRemove)
    });
  };

  if (initialLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 max-w-5xl mx-auto space-y-8">
        <div className="bg-white rounded-[50px] p-12 shadow-sm border border-slate-50">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-full bg-slate-100 animate-pulse" />
            <div className="flex-1 space-y-4 w-full">
              <div className="h-12 w-64 rounded-2xl bg-slate-100 animate-pulse mx-auto md:mx-0" />
              <div className="h-5 w-48 rounded-full bg-slate-100 animate-pulse mx-auto md:mx-0" />
              <div className="h-10 w-72 rounded-2xl bg-slate-100 animate-pulse mx-auto md:mx-0" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 h-72 rounded-[40px] bg-white border border-slate-100 animate-pulse" />
          <div className="lg:col-span-2 h-72 rounded-[40px] bg-white border border-slate-100 animate-pulse" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-10 max-w-5xl mx-auto space-y-8">
      
      {/* HEADER CARD - BALANCE AREA COMPLETELY REMOVED */}
      <div
        className="bg-white dark:bg-slate-900 rounded-[50px] p-12 flex flex-col md:flex-row justify-between items-center shadow-sm border border-slate-50 dark:border-slate-800 gap-8 transition-colors"
        style={{
          backgroundImage: profile.profileBanner
            ? `linear-gradient(135deg, ${profile.accentColor}18, transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.86))`
            : undefined,
          borderColor: `${profile.accentColor}22`
        }}
      >
        <div className="flex flex-col md:flex-row items-center gap-8">
          {/* Avatar */}
          <div className="relative">
            {profile.profileImage ? (
              <img
                src={profile.profileImage}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-slate-900 shadow-inner"
              />
            ) : (
              <div className="w-32 h-32 bg-teal-50 dark:bg-teal-900/30 rounded-full flex items-center justify-center text-5xl font-black text-teal-600 shadow-inner">
                {profile.name?.[0] || 'U'}
              </div>
            )}
            <div className="absolute bottom-2 right-2 bg-yellow-400 p-2 rounded-xl border-4 border-white dark:border-slate-900 shadow-lg">
              <Coins size={20} className="text-white" />
            </div>
          </div>
          
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-black text-slate-900 dark:text-white leading-tight">{profile.name}</h1>
            <p className="text-sm font-semibold text-slate-400 mt-1">{profile.email}</p>
            {profile.profileBanner && (
              <p className="mt-3 text-sm font-semibold" style={{ color: profile.accentColor }}>
                {profile.profileBanner}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-slate-400 font-bold">
              <span className="flex items-center gap-1"><MapPin size={16}/> {profile.location}</span>
              <span className="hidden md:block text-slate-200">|</span>
              <span className="flex items-center gap-1 uppercase text-xs tracking-widest" style={{ color: profile.accentColor }}>
                <Navigation size={16}/> {profile.radius}KM DISCOVERY
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="text-[10px] font-black px-4 py-2 rounded-full inline-flex items-center gap-2 uppercase tracking-widest border" style={{ color: profile.accentColor, borderColor: `${profile.accentColor}44`, backgroundColor: `${profile.accentColor}12` }}>
                <ShieldCheck size={14}/> {profile.premiumVerified ? profile.premiumBadgeText : 'Verified Member'}
              </div>
              {profile.profileBoostActive && (
                <div className="bg-amber-50 text-amber-600 text-[10px] font-black px-4 py-2 rounded-full inline-flex items-center gap-2 uppercase tracking-widest border border-amber-100">
                  <Zap size={14}/> Boosted Profile
                </div>
              )}
            </div>
            <div className="mt-3">
              <button
                onClick={openFriendsModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                <Users size={14} /> {friendsCount} Friends <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ONLY THE EDIT ACTION REMAINS */}
        {isOwnProfile && (
          <button 
            onClick={() => { setEditForm({...profile}); setIsEditModalOpen(true); }}
            className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-10 py-5 rounded-2xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-2 active:scale-95 border border-transparent dark:border-slate-700"
          >
            <Edit3 size={18} /> Edit Profile
          </button>
        )}
        {!isOwnProfile && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {(profileVisibility === 'public' || friendshipStatus === 'friends') && !isBlockedByViewer && !hasBlockedViewer && (
                <button
                  onClick={() => navigate('/messages', { state: { targetUsername } })}
                  className="flex-1 bg-cyan-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-cyan-700 transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle size={18} /> Message
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setIsProfileActionsOpen((prev) => !prev)}
                  className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-teal-600 transition-all"
                >
                  <MoreVertical size={18} />
                </button>
                {isProfileActionsOpen && (
                  <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl p-2 z-20">
                    {isBlockedByViewer ? (
                      <button
                        onClick={unblockUser}
                        className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-emerald-600 hover:bg-emerald-50"
                      >
                        Unblock User
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsBlockConfirmOpen(true)}
                        className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50"
                      >
                        Block User
                      </button>
                    )}
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="w-full text-left px-3 py-2 rounded-xl text-sm font-bold text-amber-600 hover:bg-amber-50"
                    >
                      Report User
                    </button>
                  </div>
                )}
              </div>
            </div>

            {(isBlockedByViewer || hasBlockedViewer) && (
              <div className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 text-xs font-black uppercase tracking-widest inline-flex items-center gap-2">
                <Ban size={14} /> {isBlockedByViewer ? 'You blocked this user' : 'You are blocked by this user'}
              </div>
            )}

            {friendshipStatus === 'friends' && !isBlockedByViewer && !hasBlockedViewer && (
              <div className="flex items-center gap-2">
                <button className="bg-emerald-100 text-emerald-700 px-6 py-4 rounded-2xl font-black flex items-center gap-2 border border-emerald-200">
                  <UserCheck size={18} /> Friends
                </button>
                <button
                  onClick={() => setIsUnfriendConfirmOpen(true)}
                  disabled={friendActionLoading}
                  className="bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl font-black hover:bg-rose-100 transition-all flex items-center gap-2 border border-rose-200 disabled:opacity-60"
                >
                  <UserMinus size={18} /> {friendActionLoading ? 'Removing...' : 'Unfriend'}
                </button>
              </div>
            )}
            {friendshipStatus === 'request_sent' && !isBlockedByViewer && !hasBlockedViewer && (
              <button className="bg-amber-100 text-amber-700 px-8 py-4 rounded-2xl font-black flex items-center gap-2 border border-amber-200">
                <Clock4 size={18} /> Request Sent
              </button>
            )}
            {friendshipStatus === 'request_received' && !isBlockedByViewer && !hasBlockedViewer && (
              <div className="flex items-center gap-2">
                <button
                  onClick={acceptFriendRequest}
                  disabled={friendActionLoading}
                  className="bg-teal-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-teal-700 transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  <UserCheck size={18} /> {friendActionLoading ? 'Accepting...' : 'Accept Request'}
                </button>
                <button
                  onClick={rejectFriendRequest}
                  disabled={friendActionLoading}
                  className="bg-rose-50 text-rose-600 px-6 py-4 rounded-2xl font-black hover:bg-rose-100 transition-all flex items-center gap-2 border border-rose-200 disabled:opacity-60"
                >
                  <X size={18} /> {friendActionLoading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            )}
            {friendshipStatus !== 'friends' && friendshipStatus !== 'request_sent' && friendshipStatus !== 'request_received' && friendshipStatus !== 'blocked' && !isBlockedByViewer && !hasBlockedViewer && (
              <button
                onClick={sendFriendRequest}
                disabled={friendActionLoading}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black hover:bg-teal-600 transition-all flex items-center gap-2 disabled:opacity-60"
              >
                <UserPlus size={18} /> {friendActionLoading ? 'Sending...' : 'Add Friend'}
              </button>
            )}
          </div>
        )}
      </div>

      {isOwnProfile && privateAnalytics && (
        <section className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border border-slate-50 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="text-cyan-600" size={22} />
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">Your Analytics</h3>
              <p className="text-sm text-slate-400 font-medium">Visible only to you on your own profile.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-[28px] bg-slate-50 dark:bg-slate-800/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profile Views</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{privateAnalytics.profile_views ?? 0}</p>
            </div>
            <div className="p-5 rounded-[28px] bg-slate-50 dark:bg-slate-800/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Listing Views</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{privateAnalytics.listing_views ?? 0}</p>
            </div>
            <div className="p-5 rounded-[28px] bg-slate-50 dark:bg-slate-800/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Closed Deals</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{privateAnalytics.completed_deals ?? 0}</p>
            </div>
            <div className="p-5 rounded-[28px] bg-slate-50 dark:bg-slate-800/40">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Friends</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{privateAnalytics.friends ?? friendsCount}</p>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* SKILLS TAGS */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-50 dark:border-slate-800 shadow-sm h-fit">
          <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6">Skill Tags</h3>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map(skill => (
              <span key={skill} className="px-4 py-2 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-xl font-bold text-xs border border-teal-100 dark:border-teal-800">
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* PUBLIC LISTINGS */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 border border-slate-50 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-3 mb-8">
              <Package className="text-teal-600" /> {isOwnProfile ? 'My Listings' : `${profile.name}'s Listings`}
            </h3>
            <div className="space-y-4">
              {!canViewListings && !isOwnProfile ? (
                <div className="text-slate-400 font-bold text-center py-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                  <p className="inline-flex items-center gap-2">
                    <Lock size={16} /> This profile is private. Become friends to view listings.
                  </p>
                </div>
              ) : myListings.length > 0 ? myListings.map(item => (
                <button
                  key={item._id}
                  onClick={() => setSelectedListing(item)}
                  className="w-full text-left group flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-teal-600 shadow-sm"><ExternalLink size={20} /></div>
                    <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
                  </div>
                  <span className="text-teal-600 font-black">{item.wtk} WTK</span>
                </button>
              )) : (
                <p className="text-slate-400 font-bold text-center py-10 italic border-2 border-dashed border-slate-50 dark:border-slate-800 rounded-3xl">No active listings.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isBlockConfirmOpen && (
          <div className="fixed inset-0 z-[109] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[36px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-2xl font-black dark:text-white">Block User</h3>
                <button
                  onClick={() => setIsBlockConfirmOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold">
                Block <span className="text-slate-900 dark:text-white">{targetUsername}</span>? They won't be able to message or send requests.
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsBlockConfirmOpen(false)}
                  className="px-5 py-3 rounded-2xl font-black border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={blockUser}
                  disabled={friendActionLoading}
                  className="px-5 py-3 rounded-2xl font-black bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-60 inline-flex items-center gap-2"
                >
                  <Ban size={16} /> {friendActionLoading ? 'Blocking...' : 'Block'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[109] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[36px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-2xl font-black dark:text-white">Report User</h3>
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none"
                >
                  <option>Spam</option>
                  <option>Scam</option>
                  <option>Harassment</option>
                  <option>Fake Listing</option>
                  <option>Other</option>
                </select>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Details (optional)</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  rows={4}
                  className="w-full p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none resize-none"
                  placeholder="Add short details..."
                />
              </div>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-5 py-3 rounded-2xl font-black border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReport}
                  className="px-5 py-3 rounded-2xl font-black bg-amber-600 text-white hover:bg-amber-700 transition-all inline-flex items-center gap-2"
                >
                  <Flag size={16} /> Submit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isUnfriendConfirmOpen && (
          <div className="fixed inset-0 z-[109] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[36px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-2xl font-black dark:text-white">Remove Friend</h3>
                <button
                  onClick={() => setIsUnfriendConfirmOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold">
                Remove <span className="text-slate-900 dark:text-white">{targetUsername}</span> from friends?
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsUnfriendConfirmOpen(false)}
                  className="px-5 py-3 rounded-2xl font-black border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsUnfriendConfirmOpen(false);
                    await unfriendUser();
                  }}
                  disabled={friendActionLoading}
                  className="px-5 py-3 rounded-2xl font-black bg-rose-600 text-white hover:bg-rose-700 transition-all disabled:opacity-60 inline-flex items-center gap-2"
                >
                  <UserMinus size={16} /> {friendActionLoading ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] p-10 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black dark:text-white">Profile Settings</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-all"><X size={24} /></button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Profile Photo</label>
                  <div className="mt-3 flex items-center gap-4">
                    {editForm.profileImage ? (
                      <img
                        src={editForm.profileImage}
                        alt="Preview"
                        className="w-20 h-20 rounded-full object-cover border-2 border-slate-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Camera size={24} />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-all"
                      >
                        Upload
                      </button>
                      {editForm.profileImage && (
                        <button
                          type="button"
                          onClick={() => setEditForm((prev) => ({ ...prev, profileImage: '' }))}
                          className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-all inline-flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileImageChange}
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Username (Profile Name)</label>
                  <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    disabled={!canChangeUsername}
                    className="w-full mt-2 p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all disabled:opacity-60" />
                  {!canChangeUsername && nextUsernameChangeAt && (
                    <p className="text-[11px] mt-2 text-rose-500 font-bold">
                      Username can be changed again after {new Date(nextUsernameChangeAt).toLocaleDateString()}.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    disabled={!canChangeEmail}
                    className="w-full mt-2 p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all disabled:opacity-60"
                  />
                  {!canChangeEmail && nextEmailChangeAt && (
                    <p className="text-[11px] mt-2 text-rose-500 font-bold">
                      Email can be changed again after {new Date(nextEmailChangeAt).toLocaleDateString()}.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Location</label>
                  <div className="relative">
                    <input type="text" value={editForm.location} onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                      className="w-full mt-2 p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all" />
                    <Locate className="absolute right-5 top-7 text-teal-600 cursor-pointer" size={20} />
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Discovery Radius</label>
                    <span className="text-teal-600 font-black">{editForm.radius} km</span>
                  </div>
                  <input 
                    type="range" min="1" max={editForm.hasPremium ? "250" : "100"} 
                    value={editForm.radius} 
                    onChange={(e) => setEditForm({...editForm, radius: parseInt(e.target.value)})}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Profile Banner</label>
                  <textarea
                    value={editForm.profileBanner || ''}
                    onChange={(e) => setEditForm({ ...editForm, profileBanner: e.target.value })}
                    rows={3}
                    className="w-full mt-2 p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all resize-none"
                    placeholder="A short line that appears on your profile header"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Theme</label>
                    <select
                      value={editForm.profileTheme || 'ocean'}
                      onChange={(e) => setEditForm({ ...editForm, profileTheme: e.target.value })}
                      className="w-full mt-2 p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all"
                    >
                      <option value="ocean">Ocean</option>
                      <option value="sunset">Sunset</option>
                      <option value="forest">Forest</option>
                      <option value="midnight">Midnight</option>
                      <option value="coral">Coral</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Accent Color</label>
                    <input
                      type="text"
                      value={editForm.accentColor || '#14b8a6'}
                      onChange={(e) => setEditForm({ ...editForm, accentColor: e.target.value })}
                      className="w-full mt-2 p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all"
                      placeholder="#14b8a6"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-2">Skills</label>
                  <div className="flex gap-2 mt-2 mb-4">
                    <input type="text" value={newSkillInput} onChange={(e) => setNewSkillInput(e.target.value)} placeholder="New Skill Name"
                      className="flex-1 p-5 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all" />
                    <button type="button" onClick={addSkill} className="p-5 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-all"><Plus size={24} /></button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editForm.skills.map(skill => (
                      <div key={skill} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-700">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)}><X size={14} className="hover:text-red-500"/></button>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" className="w-full bg-teal-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-lg hover:bg-teal-700 transition-all active:scale-95">
                  <Save size={20} /> Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFriendsModalOpen && (
          <div className="fixed inset-0 z-[108] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[36px] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-2xl font-black dark:text-white">Friends ({friendsCount})</h3>
                <button
                  onClick={() => setIsFriendsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={20} />
                </button>
              </div>

              {loadingFriends && (
                <p className="text-slate-400 font-bold text-sm">Loading friends...</p>
              )}

              {!loadingFriends && friendsList.length === 0 && (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 font-bold">
                  No friends yet.
                </div>
              )}

              <div className="space-y-3">
                {!loadingFriends && friendsList.map((friend) => (
                  <button
                    key={friend.username}
                    onClick={() => {
                      setIsFriendsModalOpen(false);
                      navigate(`/profile/${encodeURIComponent(friend.username)}`);
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-4"
                  >
                    {friend.profile_image ? (
                      <img
                        src={friend.profile_image}
                        alt={friend.username}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-900/30 text-teal-600 flex items-center justify-center font-black">
                        {friend.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-black text-slate-900 dark:text-white">{friend.username}</p>
                      <p className="text-[10px] font-black uppercase text-teal-600">{friend.status || 'Verified'}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-300" />
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isTransactionModalOpen && selectedListing && (
          <div className="fixed inset-0 z-[111] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-md rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-7"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Confirm Transaction</h3>
                <button
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-300 font-medium">
                Send WTK to <span className="font-black text-slate-900 dark:text-white">{selectedListing.owner_username}</span>.
              </p>
              <input
                type="number"
                min="1"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full mt-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none"
                placeholder="Enter WTK amount"
              />
              {txStatus && <p className="mt-3 text-xs font-bold text-amber-600">{txStatus}</p>}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={completeListingTransaction}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all"
                >
                  Pay Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedListing && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[40px] overflow-hidden relative shadow-2xl border dark:border-slate-800"
            >
              <button
                onClick={() => setSelectedListing(null)}
                className="absolute top-6 right-6 z-10 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all"
              >
                <X size={20} />
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2">
                {selectedListing.image ? (
                  <img
                    src={selectedListing.image}
                    className="h-64 md:h-full object-cover"
                    alt={selectedListing.title}
                  />
                ) : (
                  <div className="h-64 md:h-full bg-slate-100 dark:bg-slate-800" />
                )}
                <div className="p-10 space-y-6">
                  <div>
                    <span className="text-teal-600 font-black text-[10px] uppercase tracking-widest">
                      {selectedListing.type === 'skill' ? 'Skill' : 'Product'}
                    </span>
                    <h2 className="text-3xl font-black dark:text-white mt-1">{selectedListing.title}</h2>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                    {selectedListing.description || 'No description provided.'}
                  </p>
                  <div className="pt-6 border-t dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-black text-teal-600">{selectedListing.wtk} WTK</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase">
                        Owner: {selectedListing.owner_username}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">
                        {selectedListing.location || 'Unknown location'}
                      </p>
                    </div>
                    {!isOwnProfile && (
                      <div className="flex items-center gap-2">
                        {selectedListing.owner_username !== currentUsername && (
                          <button
                            onClick={() => {
                              setTxAmount(String(selectedListing.wtk || ''));
                              setTxStatus('');
                              setIsTransactionModalOpen(true);
                            }}
                            className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-emerald-700 transition-all"
                          >
                            Transaction <Coins size={16} />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            navigate('/messages', {
                              state: {
                                shareListing: {
                                  listing_id: selectedListing._id,
                                  title: selectedListing.title,
                                  owner_username: selectedListing.owner_username,
                                  wtk: selectedListing.wtk,
                                  type: selectedListing.type === 'skill' ? 'skill' : 'item',
                                  image: selectedListing.image || '',
                                  location: selectedListing.location || ''
                                }
                              }
                            })
                          }
                          className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-slate-800 transition-all"
                        >
                          Share <Share2 size={16} />
                        </button>
                        <button
                          onClick={() => navigate('/barter-request', {
                            state: {
                              item: {
                                ...selectedListing,
                                user: selectedListing.owner_username,
                                desc: selectedListing.description || ''
                              }
                            }
                          })}
                          className="bg-teal-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-teal-700 transition-all"
                        >
                          Propose Trade <Zap size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

