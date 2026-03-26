import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { showToast } from '../utils/toast';
import { 
  ArrowLeft, PartyPopper, MapPin, 
  Coins, Plus, Camera, X 
} from 'lucide-react';

export default function CreateListing() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  // States
  const [type, setType] = useState('item'); // 'item' or 'skill'
  const [showSuccess, setShowSuccess] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [descLength, setDescLength] = useState(0);

  // Image Handler (Base64 for LocalStorage)
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('File is too large. Please upload under 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const username = localStorage.getItem('username');

    if (!username) {
      showToast('Please login again before publishing.', 'error');
      return;
    }
    
    const newListing = {
      owner_username: username,
      title: formData.get('title'),
      wtk: formData.get('wtk'),
      location: formData.get('location'),
      description: formData.get('description'),
      image: imagePreview,
      type: type
    };

    try {
      const response = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newListing)
      });

      const raw = await response.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch (parseErr) {
        data = {};
      }

      if (!response.ok) {
        showToast(data.message || `Could not publish listing (HTTP ${response.status}).`, 'error');
        return;
      }

      if (data?.listing) {
        const cacheKey = `myListings_${username}`;
        const cached = JSON.parse(localStorage.getItem(cacheKey)) || [];
        localStorage.setItem(cacheKey, JSON.stringify([data.listing, ...cached]));
      }
    } catch (err) {
      showToast('Server connection failed. Listing not published.', 'error');
      return;
    }

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      navigate('/my-listings'); 
    }, 2300);
  };

  return (
    <div className="p-10 max-w-3xl mx-auto space-y-8">
      {/* HEADER & BACK NAV */}
      <div className="flex justify-between items-center">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-2 text-slate-400 font-bold hover:text-teal-600 transition-all group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> 
          <span className="uppercase text-xs tracking-widest">Cancel</span>
        </button>
        <div className="flex items-center gap-2 text-teal-600">
           <span className="font-black text-xs uppercase tracking-widest">New Listing</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-10 shadow-xl border border-slate-100 dark:border-slate-800 space-y-10">
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">What are you bartering?</h1>
          <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[10px]">Fill in the details to reach the community</p>
        </div>

        {/* TYPE TOGGLE */}
        <div className="flex bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl gap-2">
          {['item', 'skill'].map((t) => (
            <button 
              key={t}
              type="button"
              onClick={() => setType(t)} 
              className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                type === t 
                ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t === 'item' ? 'Physical Item' : 'Professional Skill'}
            </button>
          ))}
        </div>

        <form onSubmit={handlePublish} className="space-y-6">
          {/* IMAGE UPLOAD SECTION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Item Image</label>
            <div 
              onClick={() => !imagePreview && fileInputRef.current.click()}
              className={`relative h-64 w-full rounded-[30px] border-2 border-dashed flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all ${
                imagePreview ? 'border-teal-500' : 'border-slate-200 hover:border-teal-400 bg-slate-50 dark:bg-slate-800/50'
              }`}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setImagePreview(null); }}
                    className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <div className="text-center group">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-sm inline-block mb-3 group-hover:scale-110 transition-transform">
                    <Camera className="text-teal-600" size={24} />
                  </div>
                  <p className="text-slate-500 font-bold text-sm">Drop your photo here</p>
                  <p className="text-slate-300 text-[10px] uppercase font-black tracking-tighter mt-1">PNG or JPG (Max 5MB)</p>
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageChange} 
              className="hidden" 
              accept="image/*" 
            />
          </div>

          {/* TITLE */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Listing Title</label>
            <input 
              name="title" 
              required 
              placeholder="e.g. Vintage Acoustic Guitar" 
              className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[24px] outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all" 
            />
          </div>

          {/* VALUE & LOCATION */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">WTK Value</label>
              <div className="relative">
                <input 
                  name="wtk" 
                  required 
                  type="number" 
                  placeholder="500" 
                  className="w-full p-6 pl-14 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[24px] outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all" 
                />
                <Coins className="absolute left-6 top-1/2 -translate-y-1/2 text-teal-600" size={20} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Location</label>
              <div className="relative">
                <input 
                  name="location" 
                  required 
                  placeholder="City, State" 
                  className="w-full p-6 pl-14 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[24px] outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all" 
                />
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-teal-600" size={20} />
              </div>
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2 relative">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Description</label>
            <textarea 
              name="description"
              rows="4"
              maxLength={400}
              onChange={(e) => setDescLength(e.target.value.length)}
              placeholder="Tell us about the condition, age, or specifics..."
              className="w-full p-6 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-[30px] outline-none ring-2 ring-transparent focus:ring-teal-500 font-bold transition-all resize-none"
            />
            <span className="absolute bottom-4 right-6 text-[10px] font-bold text-slate-300">
                {descLength}/400
            </span>
          </div>

          <button 
            type="submit" 
            className="w-full bg-teal-600 text-white py-6 rounded-[28px] font-black text-lg hover:bg-teal-700 shadow-xl shadow-teal-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
          >
            <Plus size={24} strokeWidth={3} />
            Publish Listing
          </button>
        </form>
      </div>

      {/* SUCCESS OVERLAY */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-12 rounded-[50px] text-center max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="w-24 h-24 bg-teal-50 dark:bg-teal-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <PartyPopper size={48} className="text-teal-600" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">Live!</h2>
              <p className="text-slate-400 font-bold mt-2">Your barter is now public.</p>
              
              <div className="mt-8 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: "0%" }} 
                  animate={{ width: "100%" }} 
                  transition={{ duration: 2.0, ease: "easeInOut" }} 
                  className="h-full bg-teal-600" 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

