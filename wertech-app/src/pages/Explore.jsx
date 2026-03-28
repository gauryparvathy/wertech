import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, SlidersHorizontal, MapPin, X, Zap,
  User, Navigation, Coins, Mail, Share2, ArrowUpRight, Crown
} from 'lucide-react';
import BrandLogo from '../components/BrandLogo';
import { subscribeUserEvents } from '../utils/liveEvents';

const TABS = ['All', 'Users', 'Products', 'Skills', 'Area'];
const HISTORY_KEY = 'wertech_explore_search_history_v1';
const LOCATION_CACHE_KEY = 'wertech_location_cache_v1';
const SEARCH_SUGGESTIONS = ['Search users...', 'Search products...', 'Search skills...', 'Search area...'];
const LEGEND_QUOTES = [
  { text: 'The best way to find yourself is to lose yourself in the service of others.', author: 'Mahatma Gandhi' },
  { text: 'Alone we can do so little; together we can do so much.', author: 'Helen Keller' },
  { text: 'Quality means doing it right when no one is looking.', author: 'Henry Ford' },
  { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
  { text: 'Coming together is a beginning; keeping together is progress.', author: 'Henry Ford' }
];

function toNumberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function haversineDistanceKm(a, b) {
  if (!a || !b) return null;
  const lat1 = toNumberOrNull(a.lat);
  const lng1 = toNumberOrNull(a.lng);
  const lat2 = toNumberOrNull(b.lat);
  const lng2 = toNumberOrNull(b.lng);
  if ([lat1, lng1, lat2, lng2].some((value) => value === null)) return null;
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aa =
    sinLat * sinLat
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return earthRadiusKm * c;
}

function createMapEmbedUrl(currentCoords) {
  if (!currentCoords) return '';
  const lat = Number(currentCoords.lat || 0);
  const lng = Number(currentCoords.lng || 0);
  const delta = 0.08;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
}

async function geocodeLocation(locationLabel) {
  const query = String(locationLabel || '').trim();
  if (!query) return null;
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => []);
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const hit = payload[0];
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export default function Explore() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUsername = localStorage.getItem('username') || '';
  const locationWatchRef = useRef(null);
  const syncedCoordsRef = useRef('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [txAmount, setTxAmount] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [maxDistance, setMaxDistance] = useState(100);
  const [maxPrice, setMaxPrice] = useState(10000);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [showBoostedOnly, setShowBoostedOnly] = useState(false);
  const [sortMode, setSortMode] = useState('relevance');
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locationSyncing, setLocationSyncing] = useState(false);
  const [locationCache, setLocationCache] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCATION_CACHE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  });

  const loadData = useCallback(async () => {
    try {
      const [usersRes, listingsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/listings')
      ]);
      const [usersData, listingsData] = await Promise.all([usersRes.json(), listingsRes.json()]);

      if (usersRes.ok && Array.isArray(usersData)) {
        const mappedUsers = usersData.map((u) => ({
          id: u._id || u.username,
          username: u.username,
          email: u.email,
          location: u.location || 'Unknown',
          locationLat: toNumberOrNull(u.location_lat),
          locationLng: toNumberOrNull(u.location_lng),
          status: u.status || 'Verified',
          profileImage: u.profile_image || '',
          radius: Number(u.radius || 0),
          skills: Array.isArray(u.skills) ? u.skills : [],
          premiumVerified: !!u.premium_verified,
          profileBoostActive: !!u.profile_boost_active,
          premiumTier: u.premium_tier || 'free'
        }));
        setUsers(mappedUsers);
        if (listingsRes.ok && Array.isArray(listingsData)) {
          const byUsername = new Map(mappedUsers.map((u) => [u.username, u]));
          const mappedListings = listingsData.map((item) => {
            const ownerProfile = byUsername.get(item.owner_username);
            return {
              id: item._id,
              title: item.title,
              category: item.type === 'skill' ? 'Skill' : 'Product',
              wtk: Number(item.wtk || 0),
              dist: Number(ownerProfile?.radius || 0),
              locationLat: ownerProfile?.locationLat ?? null,
              locationLng: ownerProfile?.locationLng ?? null,
              user: item.owner_username,
              image: item.image || '',
              desc: item.description || '',
              location: item.location || '',
              date: item.date || '',
              boosted: !!item.boosted,
              premiumVerified: !!item.premium_verified,
              ownerBoosted: !!item.owner_profile_boosted
            };
          });
          setListings(mappedListings);
        }
      } else if (listingsRes.ok && Array.isArray(listingsData)) {
        const mappedListings = listingsData.map((item) => ({
          id: item._id,
          title: item.title,
          category: item.type === 'skill' ? 'Skill' : 'Product',
          wtk: Number(item.wtk || 0),
          dist: 0,
          user: item.owner_username,
          image: item.image || '',
          desc: item.description || '',
          location: item.location || '',
          date: item.date || '',
          boosted: !!item.boosted,
          premiumVerified: !!item.premium_verified,
          ownerBoosted: !!item.owner_profile_boosted
        }));
        setListings(mappedListings);
      }
    } catch (err) {
      // no-op
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, [loadData]);

  useEffect(() => {
    if (!currentUsername) return () => {};
    return subscribeUserEvents(currentUsername, {
      onEvent: (type) => {
        if (type === 'listing_update' || type === 'notification_update') {
          loadData();
        }
      }
    });
  }, [currentUsername, loadData]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (Array.isArray(saved)) {
        const normalized = saved
          .map((item) => {
            if (typeof item === 'string') {
              const text = item.trim();
              if (!text) return null;
              return { id: text.toLowerCase(), query: text, created_at: new Date().toISOString() };
            }
            const text = String(item?.query || '').trim();
            if (!text) return null;
            return {
              id: text.toLowerCase(),
              query: text,
              created_at: item?.created_at || new Date().toISOString()
            };
          })
          .filter(Boolean);
        const dedupMap = new Map();
        for (const item of normalized) {
          if (!dedupMap.has(item.id)) dedupMap.set(item.id, item);
        }
        setSearchHistory(Array.from(dedupMap.values()));
      }
    } catch (err) {
      setSearchHistory([]);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let timeout;
    const rotateQuote = () => {
      const delay = 4500 + Math.floor(Math.random() * 2500);
      timeout = setTimeout(() => {
        setQuoteIndex((prev) => {
          if (LEGEND_QUOTES.length <= 1) return prev;
          let next = prev;
          while (next === prev) {
            next = Math.floor(Math.random() * LEGEND_QUOTES.length);
          }
          return next;
        });
        rotateQuote();
      }, delay);
    };
    rotateQuote();
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(locationCache));
  }, [locationCache]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Live location is not available on this device.');
      return undefined;
    }

    locationWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const nextCoords = {
          lat: Number(position.coords.latitude),
          lng: Number(position.coords.longitude),
          accuracy: Number(position.coords.accuracy || 0)
        };
        setCurrentCoords(nextCoords);
        setLocationError('');
        setSortMode((prev) => (prev === 'relevance' ? 'nearby' : prev));
      },
      (error) => {
        setLocationError(error?.message || 'Could not access live location.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 15000
      }
    );

    return () => {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!currentCoords || !currentUsername) return;
    const syncKey = `${currentCoords.lat.toFixed(5)}:${currentCoords.lng.toFixed(5)}`;
    if (syncedCoordsRef.current === syncKey) return;

    const syncLocation = async () => {
      setLocationSyncing(true);
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(currentUsername)}/profile`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location_lat: currentCoords.lat,
            location_lng: currentCoords.lng
          })
        });
        if (response.ok) {
          syncedCoordsRef.current = syncKey;
        }
      } catch (error) {
        // no-op
      } finally {
        setLocationSyncing(false);
      }
    };

    syncLocation();
  }, [currentCoords, currentUsername]);

  useEffect(() => {
    const uniqueLocations = Array.from(
      new Set(
        [
          ...users.map((user) => ({
            key: String(user.location || '').trim(),
            hasCoords: Number.isFinite(user.locationLat) && Number.isFinite(user.locationLng)
          })),
          ...listings.map((item) => ({
            key: String(item.location || '').trim(),
            hasCoords: Number.isFinite(item.locationLat) && Number.isFinite(item.locationLng)
          }))
        ]
          .filter((entry) => entry.key && !entry.hasCoords && !locationCache[entry.key])
          .map((entry) => entry.key)
      )
    ).slice(0, 12);

    if (uniqueLocations.length === 0) return;

    let cancelled = false;
    const hydrateLocations = async () => {
      const updates = {};
      for (const place of uniqueLocations) {
        try {
          const coords = await geocodeLocation(place);
          if (coords) updates[place] = coords;
        } catch (error) {
          // no-op
        }
      }
      if (!cancelled && Object.keys(updates).length > 0) {
        setLocationCache((prev) => ({ ...prev, ...updates }));
      }
    };

    hydrateLocations();
    return () => {
      cancelled = true;
    };
  }, [users, listings, locationCache]);

  const query = searchQuery.trim().toLowerCase();

  const usersWithDistance = useMemo(
    () =>
      users.map((user) => {
        const coords = Number.isFinite(user.locationLat) && Number.isFinite(user.locationLng)
          ? { lat: user.locationLat, lng: user.locationLng }
          : locationCache[String(user.location || '').trim()] || null;
        const distanceKm = currentCoords ? haversineDistanceKm(currentCoords, coords) : null;
        return {
          ...user,
          coords,
          distanceKm,
          distanceLabel: distanceKm !== null ? `${distanceKm.toFixed(1)} km` : 'Distance unavailable'
        };
      }),
    [users, currentCoords, locationCache]
  );

  const listingsWithDistance = useMemo(
    () =>
      listings.map((item) => {
        const coords = Number.isFinite(item.locationLat) && Number.isFinite(item.locationLng)
          ? { lat: item.locationLat, lng: item.locationLng }
          : locationCache[String(item.location || '').trim()] || null;
        const distanceKm = currentCoords ? haversineDistanceKm(currentCoords, coords) : null;
        return {
          ...item,
          coords,
          distanceKm,
          effectiveDist: distanceKm !== null ? distanceKm : Number(item.dist || 0),
          distanceLabel: distanceKm !== null ? `${distanceKm.toFixed(1)} km` : `${Number(item.dist || 0)} km`
        };
      }),
    [listings, currentCoords, locationCache]
  );

  const persistHistory = (next) => {
    setSearchHistory(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const saveSearchHistory = (rawQuery) => {
    const clean = String(rawQuery || '').trim();
    if (!clean) return;
    const key = clean.toLowerCase();
    const nextItem = {
      id: key,
      query: clean,
      created_at: new Date().toISOString()
    };
    const deduped = searchHistory.filter((item) => item.id !== key);
    persistHistory([nextItem, ...deduped].slice(0, 50));
  };

  const removeHistoryItem = (id) => {
    const next = searchHistory.filter((item) => item.id !== id);
    persistHistory(next);
  };

  const clearAllHistory = () => {
    persistHistory([]);
    setShowClearHistoryModal(false);
  };

  const filteredUsers = useMemo(
    () =>
      usersWithDistance.filter((u) => {
        if (!query) return true;
        const username = String(u.username || '').toLowerCase();
        const email = String(u.email || '').toLowerCase();
        const area = String(u.location || '').toLowerCase();
        const skills = Array.isArray(u.skills) ? u.skills.map((s) => String(s).toLowerCase()) : [];

        if (activeTab === 'Users') {
          return username.includes(query) || email.includes(query);
        }
        if (activeTab === 'Skills') {
          return skills.some((s) => s.includes(query));
        }
        if (activeTab === 'Area') {
          return area.includes(query);
        }
        return (
          username.includes(query) ||
          email.includes(query) ||
          area.includes(query) ||
          skills.some((s) => s.includes(query))
        );
      }),
    [usersWithDistance, query, activeTab]
  );

  const filteredListings = useMemo(
    () =>
      listingsWithDistance.filter((item) => {
        const matchesSearch =
          !query ||
          String(item.title || '').toLowerCase().includes(query) ||
          String(item.user || '').toLowerCase().includes(query) ||
          String(item.category || '').toLowerCase().includes(query) ||
          String(item.desc || '').toLowerCase().includes(query) ||
          String(item.location || '').toLowerCase().includes(query);
        const matchesDist = Number(item.effectiveDist || 0) <= Number(maxDistance);
        const matchesPrice = Number(item.wtk || 0) <= Number(maxPrice);
        const matchesPremium = !showPremiumOnly || !!item.premiumVerified;
        const matchesBoosted = !showBoostedOnly || !!item.boosted || !!item.ownerBoosted;
        return matchesSearch && matchesDist && matchesPrice && matchesPremium && matchesBoosted;
      }),
    [listingsWithDistance, query, maxDistance, maxPrice, showPremiumOnly, showBoostedOnly]
  );

  const sortedUsers = useMemo(() => {
    const items = [...filteredUsers];
    if (sortMode === 'premium') {
      items.sort((a, b) => Number(b.premiumVerified || b.profileBoostActive) - Number(a.premiumVerified || a.profileBoostActive));
    } else if (sortMode === 'nearby') {
      items.sort((a, b) => Number(a.distanceKm ?? Number.MAX_SAFE_INTEGER) - Number(b.distanceKm ?? Number.MAX_SAFE_INTEGER));
    }
    return items.filter((item) => (!showPremiumOnly || item.premiumVerified) && (!showBoostedOnly || item.profileBoostActive));
  }, [filteredUsers, showPremiumOnly, showBoostedOnly, sortMode]);

  const sortedListings = useMemo(() => {
    const items = [...filteredListings];
    if (sortMode === 'premium') {
      items.sort((a, b) => Number(b.boosted || b.ownerBoosted || b.premiumVerified) - Number(a.boosted || a.ownerBoosted || a.premiumVerified));
    } else if (sortMode === 'nearby') {
      items.sort((a, b) => Number(a.effectiveDist ?? Number.MAX_SAFE_INTEGER) - Number(b.effectiveDist ?? Number.MAX_SAFE_INTEGER));
    } else if (sortMode === 'value') {
      items.sort((a, b) => Number(a.wtk || 0) - Number(b.wtk || 0));
    }
    return items;
  }, [filteredListings, sortMode]);

  const showUsers = activeTab === 'All' || activeTab === 'Users' || activeTab === 'Skills' || activeTab === 'Area';
  const showProducts = activeTab === 'All' || activeTab === 'Products';
  const visibleHistory = showAllHistory ? searchHistory : searchHistory.slice(0, 6);
  const nearestUser = sortedUsers.find((item) => item.distanceKm !== null) || null;
  const nearestListing = sortedListings.find((item) => item.distanceKm !== null) || null;
  const mapEmbedUrl = currentCoords ? createMapEmbedUrl(currentCoords) : '';
  const showHistoryPanel = searchFocused || (!!searchQuery.trim() && searchHistory.length > 0);

  useEffect(() => {
    const openListingId = location.state?.openListingId;
    if (!openListingId || listings.length === 0) return;
    const match = listings.find((item) => String(item.id) === String(openListingId));
    if (!match) return;
    setSelectedItem(match);
  }, [location.state, listings]);

  const handleListingTransaction = async () => {
    if (!selectedItem?.user || !currentUsername) return;
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
          selectedUser: selectedItem.user,
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
        setShowTransactionModal(false);
        setTxStatus('');
        navigate('/history');
      }, 900);
    } catch (err) {
      setTxStatus('Could not complete transaction.');
    }
  };

  if (initialLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-7xl mx-auto relative">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 h-[76px] rounded-[24px] bg-white/80 border border-slate-100 animate-pulse w-full" />
          <div className="h-[76px] w-full md:w-[230px] rounded-[24px] bg-white/80 border border-slate-100 animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-10 w-24 rounded-2xl bg-white/80 border border-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-[24px] lg:rounded-[32px] border border-slate-100 p-5 lg:p-8 animate-pulse">
          <div className="h-5 w-40 rounded-full bg-slate-100" />
          <div className="mt-5 h-10 w-3/4 rounded-2xl bg-slate-100" />
          <div className="mt-3 h-4 w-1/3 rounded-full bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white rounded-[36px] border border-slate-100 overflow-hidden animate-pulse">
              <div className="h-52 bg-slate-100" />
              <div className="p-5 lg:p-8 space-y-4">
                <div className="h-6 w-2/3 rounded-full bg-slate-100" />
                <div className="h-4 w-1/3 rounded-full bg-slate-100" />
                <div className="h-12 rounded-2xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 sm:p-6 lg:p-8 space-y-6 lg:space-y-8 max-w-7xl mx-auto relative">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-teal-600" size={18} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveSearchHistory(searchQuery);
                }
              }}
              placeholder={SEARCH_SUGGESTIONS[suggestionIndex]}
              className="w-full pl-14 pr-12 py-4 md:py-5 bg-white dark:bg-slate-900 rounded-[22px] md:rounded-[24px] border border-slate-100 dark:border-slate-800 outline-none ring-2 ring-transparent focus:ring-teal-500 transition-all font-bold shadow-sm dark:text-white"
            />
            {searchQuery && (
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {activeTab !== 'Users' && (
            <button
              onClick={() => setShowFilters(true)}
              className={`shrink-0 h-12 w-12 md:h-[60px] md:w-[60px] rounded-[18px] md:rounded-[22px] transition-all flex items-center justify-center shadow-lg ${showFilters ? 'bg-teal-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
              title="Product filters"
            >
              <SlidersHorizontal size={18} />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                saveSearchHistory(searchQuery);
              }}
              className={`shrink-0 px-3.5 py-2 rounded-full font-black text-[11px] uppercase tracking-[0.16em] transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-rose-500 via-orange-500 to-lime-700 text-white'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-teal-400 hover:text-teal-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {showHistoryPanel && searchHistory.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Recent Searches</p>
              <div className="flex items-center gap-3 text-[11px] font-bold">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowAllHistory((prev) => !prev)}
                  className="text-slate-400 hover:text-teal-600 transition-all"
                >
                  {showAllHistory ? 'Show less' : 'See all'}
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowClearHistoryModal(true)}
                  className="text-slate-400 hover:text-rose-500 transition-all"
                >
                  Clear all
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleHistory.map((item) => (
                <div key={item.id} className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5">
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSearchQuery(item.query);
                      saveSearchHistory(item.query);
                    }}
                    className="text-xs font-bold text-slate-600 dark:text-slate-200"
                  >
                    {item.query}
                  </button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => removeHistoryItem(item.id)}
                    className="text-slate-400 hover:text-rose-500 transition-all"
                    title="Remove search history"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setShowPremiumOnly((prev) => !prev)} className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${showPremiumOnly ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>Premium Only</button>
        <button onClick={() => setShowBoostedOnly((prev) => !prev)} className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${showBoostedOnly ? 'bg-cyan-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>Boosted Only</button>
        <select value={sortMode} onChange={(e) => setSortMode(e.target.value)} className="px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest bg-white text-slate-500 border border-slate-200 outline-none">
          <option value="relevance">Relevance</option>
          <option value="premium">Premium First</option>
          <option value="nearby">Nearby</option>
          <option value="value">Best Value</option>
        </select>
        {currentCoords && <span className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-widest">Live Nearby On</span>}
        {locationSyncing && <span className="px-4 py-2 rounded-2xl bg-cyan-50 text-cyan-700 text-xs font-black uppercase tracking-widest">Syncing Location</span>}
        {!currentCoords && locationError && <span className="px-4 py-2 rounded-2xl bg-rose-50 text-rose-600 text-xs font-black">{locationError}</span>}
      </div>

      <AnimatePresence>
        {showClearHistoryModal && (
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-md rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-7"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Clear Search History</h3>
                <button
                  onClick={() => setShowClearHistoryModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-300 font-medium">
                Do you want to clear all search history?
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowClearHistoryModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={clearAllHistory}
                  className="px-5 py-2.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all"
                >
                  Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFilters && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowFilters(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 z-[70] p-6 lg:p-10 shadow-2xl space-y-8 lg:space-y-10">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black dark:text-white">Product Filters</h2>
                <button onClick={() => setShowFilters(false)} className="p-2 dark:text-white"><X /></button>
              </div>
              {currentCoords && (
                <div className="rounded-[28px] overflow-hidden border border-slate-100 dark:border-slate-800">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600">Map Preview</p>
                    <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-300">Nearby map is available inside filters.</p>
                  </div>
                  {mapEmbedUrl ? (
                    <iframe title="Nearby map" src={mapEmbedUrl} className="w-full h-48 border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  ) : (
                    <div className="h-48 flex items-center justify-center text-slate-400 font-bold">Map preview unavailable right now.</div>
                  )}
                </div>
              )}
              {(nearestUser || nearestListing) && (
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nearest Matches</p>
                  {nearestUser && (
                    <button onClick={() => navigate(`/profile/${encodeURIComponent(nearestUser.username)}`)} className="w-full text-left p-4 rounded-[24px] bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-600">Nearest User</p>
                      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{nearestUser.username}</p>
                      <p className="text-xs font-black text-cyan-600 mt-2">{nearestUser.distanceLabel}</p>
                    </button>
                  )}
                  {nearestListing && (
                    <button onClick={() => setSelectedItem(nearestListing)} className="w-full text-left p-4 rounded-[24px] bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Nearest Listing</p>
                      <p className="mt-2 text-lg font-black text-slate-900 dark:text-white">{nearestListing.title}</p>
                      <p className="text-xs font-black text-cyan-600 mt-2">{nearestListing.distanceLabel}</p>
                    </button>
                  )}
                </div>
              )}
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                  <label className="flex items-center gap-2"><Navigation size={12} /> Max Distance</label>
                  <span>{maxDistance} km</span>
                </div>
                <input type="range" min="1" max="100" step="1" value={maxDistance} onChange={(e) => setMaxDistance(e.target.value)} className="w-full accent-teal-600" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                  <label className="flex items-center gap-2"><Coins size={12} /> Max WTK</label>
                  <span>{maxPrice} WTK</span>
                </div>
                <input type="range" min="10" max="10000" step="10" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full accent-teal-600" />
              </div>
              <button onClick={() => { setMaxDistance(100); setMaxPrice(10000); setSearchQuery(''); }} className="w-full py-4 text-slate-400 font-bold text-xs uppercase hover:text-red-500">Reset Filters</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {showUsers && (
        <section className="space-y-4">
          {!query && (
            <div className="p-2 md:p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="max-w-3xl">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Wertech Inspiration</p>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${quoteIndex}-${LEGEND_QUOTES[quoteIndex].author}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.35 }}
                    >
                      <p className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                        "{LEGEND_QUOTES[quoteIndex].text}"
                      </p>
                      <p className="mt-3 text-sm font-bold text-teal-600">- {LEGEND_QUOTES[quoteIndex].author}</p>
                    </motion.div>
                  </AnimatePresence>
                </div>
                <motion.div
                  animate={{ y: [0, -6, 0], rotate: [0, -3, 0, 3, 0] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                  className="self-start md:self-center"
                >
                  <BrandLogo size={44} withText={false} />
                </motion.div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {query && sortedUsers.map((u) => (
              <div key={u.id} className="bg-white dark:bg-slate-900 rounded-[30px] p-6 border dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                  {u.profileImage ? (
                    <img src={u.profileImage} alt={u.username} className="w-14 h-14 rounded-2xl object-cover border border-slate-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-black text-xl">
                      {u.username?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 dark:text-white truncate">{u.username}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <p className="text-[10px] font-black uppercase text-teal-600">{u.status}</p>
                      {u.premiumVerified && <span className="text-[10px] font-black uppercase text-amber-600 inline-flex items-center gap-1"><Crown size={11} /> Pro</span>}
                      {u.profileBoostActive && <span className="text-[10px] font-black uppercase text-cyan-600 inline-flex items-center gap-1"><Zap size={11} /> Boosted</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-500 space-y-1">
                  <p className="flex items-center gap-2"><Mail size={14} /> {u.email}</p>
                  <p className="flex items-center gap-2"><MapPin size={14} /> {u.location}</p>
                  <p className="flex items-center gap-2 text-cyan-600 font-bold"><Navigation size={14} /> {u.distanceLabel}</p>
                  <p className="text-[11px] text-teal-600 font-bold truncate">
                    Skills: {(u.skills || []).slice(0, 3).join(', ') || 'No skills'}
                  </p>
                </div>
                <button
                  onClick={() => navigate(`/profile/${encodeURIComponent(u.username)}`)}
                  className="mt-5 w-full py-3 rounded-2xl bg-slate-900 text-white font-bold hover:bg-teal-600 transition-all"
                >
                  View Profile
                </button>
              </div>
            ))}
            {query && sortedUsers.length === 0 && (
              <div className="col-span-full bg-white rounded-[24px] border border-slate-100 p-8 text-center text-slate-400 font-bold">
                No users match your search.
              </div>
            )}
          </div>
        </section>
      )}

      {showProducts && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-8">
            <AnimatePresence mode="popLayout">
              {sortedListings.map((item) => (
                <motion.div layout key={item.id} className="bg-white dark:bg-slate-900 rounded-[28px] lg:rounded-[40px] border dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-2xl transition-all">
                  {item.image && (
                    <div className="h-52 overflow-hidden relative">
                      <img src={item.image} alt="" className="w-full h-full object-cover" />
                      <span className="absolute top-4 left-4 bg-white/90 dark:bg-slate-900/90 px-4 py-1.5 rounded-full text-[9px] font-black text-teal-600 uppercase">{item.category}</span>
                      {(item.boosted || item.ownerBoosted) && <span className="absolute top-4 right-4 bg-amber-500 text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase inline-flex items-center gap-1"><Zap size={10} /> Boosted</span>}
                    </div>
                  )}
                  <div className="p-5 lg:p-8">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-black dark:text-white leading-tight">{item.title}</h3>
                      <p className="text-2xl font-black text-teal-600">{item.wtk}</p>
                    </div>
                    <div className="flex items-center justify-between text-slate-400 text-[10px] font-black uppercase border-t dark:border-slate-800 pt-5">
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-teal-600" /> {item.distanceLabel}</span>
                      <span className="flex items-center gap-1"><User size={12} /> {item.user}</span>
                    </div>
                    {item.premiumVerified && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-amber-600 inline-flex items-center gap-1"><Crown size={11} /> Verified Pro Owner</p>}
                    <button onClick={() => setSelectedItem(item)} className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-teal-600 transition-all">View Details</button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {sortedListings.length === 0 && (
            <div className="bg-white rounded-[24px] border border-slate-100 p-8 text-center text-slate-400 font-bold">
              No products match your search/filter.
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[28px] lg:rounded-[40px] overflow-hidden relative shadow-2xl border dark:border-slate-800">
              <button onClick={() => setSelectedItem(null)} className="absolute top-6 right-6 z-10 p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all"><X size={20} /></button>
              <div className="grid grid-cols-1 md:grid-cols-2">
                {selectedItem.image ? (
                  <img src={selectedItem.image} className="h-64 md:h-full object-cover" alt="" />
                ) : (
                  <div className="h-64 md:h-full bg-slate-100 dark:bg-slate-800" />
                )}
                <div className="p-5 sm:p-6 lg:p-10 space-y-5 lg:space-y-6">
                  <div>
                    <span className="text-teal-600 font-black text-[10px] uppercase tracking-widest">{selectedItem.category}</span>
                    <h2 className="text-3xl font-black dark:text-white mt-1">{selectedItem.title}</h2>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {selectedItem.premiumVerified && <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1"><Crown size={11} /> Verified Pro</span>}
                      {(selectedItem.boosted || selectedItem.ownerBoosted) && <span className="px-3 py-1 rounded-full bg-cyan-50 text-cyan-600 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-1"><Zap size={11} /> Boosted Reach</span>}
                    </div>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{selectedItem.desc}</p>
                  <div className="pt-6 border-t dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-3xl font-black text-teal-600">{selectedItem.wtk} WTK</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Owner: {selectedItem.user}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                      {selectedItem.user !== currentUsername && (
                        <button
                          onClick={() => {
                            setTxAmount(String(selectedItem.wtk || ''));
                            setTxStatus('');
                            setShowTransactionModal(true);
                          }}
                          className="bg-emerald-600 text-white px-5 py-3.5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"
                        >
                          Transaction <ArrowUpRight size={16} />
                        </button>
                      )}
                      <button
                        onClick={() =>
                          navigate('/messages', {
                            state: {
                              shareListing: {
                                listing_id: selectedItem.id,
                                title: selectedItem.title,
                                owner_username: selectedItem.user,
                                wtk: selectedItem.wtk,
                                type: selectedItem.category === 'Skill' ? 'skill' : 'item',
                                image: selectedItem.image || '',
                                location: selectedItem.location || ''
                              }
                            }
                          })
                        }
                        className="bg-slate-900 text-white px-5 py-3.5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
                      >
                        Share <Share2 size={16} />
                      </button>
                      <button
                        onClick={() => navigate('/barter-request', { state: { item: selectedItem } })}
                        className="bg-teal-600 text-white px-5 py-3.5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-teal-700 transition-all"
                      >
                        Propose Trade <Zap size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTransactionModal && selectedItem && (
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="w-full max-w-md rounded-[32px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl p-7"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">Confirm Transaction</h3>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-300 font-medium">
                Send WTK to <span className="font-black text-slate-900 dark:text-white">{selectedItem.user}</span> for this listing.
              </p>
              <input
                type="number"
                min="1"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full mt-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 dark:text-white outline-none"
                placeholder="Enter WTK amount"
              />
              {txStatus && (
                <p className="mt-3 text-xs font-bold text-amber-600">{txStatus}</p>
              )}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleListingTransaction}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all"
                >
                  Pay Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

