import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Package, Trash2, ExternalLink, 
  Clock, AlertCircle 
} from 'lucide-react';
import { getApiMessage, toastError, toastSuccess } from '../utils/feedback';

export default function MyListings() {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadMyListings = async () => {
      const username = localStorage.getItem('username');
      if (!username) {
        setLoading(false);
        return;
      }

      setError('');
      try {
        setLoading(true);
        const response = await fetch(
          `/api/listings/user/${encodeURIComponent(username)}?viewer_username=${encodeURIComponent(username)}`
        );
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          setError(getApiMessage(data, 'Could not load your listings.'));
          return;
        }
        setListings(data.filter((item) => item?.owner_username === username));
      } catch (err) {
        setError('Could not load your listings.');
      } finally {
        setLoading(false);
      }
    };

    loadMyListings();
  }, [reloadKey]);

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`/api/listings/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        toastError(getApiMessage(data, 'Could not delete listing.'));
        return;
      }
      const updated = listings.filter(item => item._id !== id);
      setListings(updated);
      toastSuccess('Listing deleted.');
    } catch (err) {
      toastError('Could not delete listing.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="p-10 max-w-6xl mx-auto space-y-10"
    >
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">My Inventory</h1>
          <p className="text-slate-400 font-bold mt-1 text-sm uppercase tracking-widest">Manage your public barters</p>
        </div>
        <button 
          onClick={() => navigate('/create')}
          className="bg-teal-600 hover:bg-teal-700 text-white px-8 py-4 rounded-[24px] font-black flex items-center gap-3 shadow-lg shadow-teal-600/20 transition-all active:scale-95"
        >
          <Plus size={20} strokeWidth={3} /> Add New Listing
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        <AnimatePresence mode="popLayout">
          {loading && (
            <div className="col-span-full py-24 bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border border-slate-200 dark:border-slate-800 text-center text-slate-400 font-bold">
              Loading your listings...
            </div>
          )}
          {!loading && error && (
            <div className="col-span-full py-16 bg-rose-50 rounded-[40px] border border-rose-100 text-center space-y-3">
              <p className="text-rose-600 font-bold">{error}</p>
              <button
                onClick={() => setReloadKey((prev) => prev + 1)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition-all"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && listings.length > 0 ? (
            listings.map((item) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={item._id}
                className="bg-white dark:bg-slate-900 rounded-[40px] p-6 border border-slate-100 dark:border-slate-800 shadow-sm group relative overflow-hidden"
              >
                {/* IMAGE SECTION */}
                <div className="relative h-64 w-full rounded-[30px] mb-6 overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-50 dark:border-slate-800">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <Package size={48} />
                    </div>
                  )}
                  
                  {/* Floating WTK Tag */}
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-white/20">
                    <span className="text-teal-600 font-black text-sm">{item.wtk} WTK</span>
                  </div>
                </div>

                <div className="relative z-10 flex flex-col px-2">
                  <div className="flex justify-between items-start mb-3">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      item.type === 'item' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {item.type === 'item' ? 'Physical Item' : 'Professional Skill'}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 font-bold text-[10px] uppercase">
                      <Clock size={12} /> {item.date || 'Recently Added'}
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-6 line-clamp-1">{item.title}</h3>

                  <div className="mt-auto flex gap-3">
                    <button 
                      onClick={() => navigate(`/item/${item._id}`)}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
                    >
                      <ExternalLink size={14} /> View Details
                    </button>
                    <button 
                      onClick={() => handleDelete(item._id)}
                      className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : !loading && !error ? (
            <div className="col-span-full py-24 bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
              <div className="p-6 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-6">
                <AlertCircle size={40} className="text-slate-300" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Your Inventory is Empty</h2>
              <p className="text-slate-400 font-bold mt-2 mb-6">Start bartering by listing your first item!</p>
              <button 
                onClick={() => navigate('/create')}
                className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-teal-600 transition-all"
              >
                Create Listing Now
              </button>
            </div>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

