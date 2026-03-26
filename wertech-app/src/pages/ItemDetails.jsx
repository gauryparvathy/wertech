import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Coins, MapPin, Share2, Zap } from 'lucide-react';

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadListing = async () => {
      if (!id) {
        setError('Missing listing id');
        setLoading(false);
        return;
      }
      try {
        const response = await fetch(`/api/listings/${encodeURIComponent(id)}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || 'Could not load listing');
        }
        setListing(data);
      } catch (err) {
        setError(err?.message || 'Could not load listing');
      } finally {
        setLoading(false);
      }
    };
    loadListing();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-sm font-bold text-slate-400">Loading listing...</div>;
  }

  if (error || !listing) {
    return (
      <div className="p-10 space-y-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-slate-500 font-bold hover:text-teal-600">
          <ArrowLeft size={16} /> Back
        </button>
        <p className="text-sm font-bold text-rose-600">{error || 'Listing not found'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 p-4 sm:p-8">
      {listing.image ? (
        <img src={listing.image} alt={listing.title} className="w-full aspect-square object-cover rounded-[40px] shadow-inner bg-slate-100" />
      ) : (
        <div className="aspect-square bg-slate-200 rounded-[40px] shadow-inner" />
      )}

      <div>
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-slate-500 font-bold hover:text-teal-600 mb-6">
          <ArrowLeft size={16} /> Back
        </button>

        <span className="text-teal-600 font-bold uppercase tracking-widest text-xs">
          {listing.type === 'skill' ? 'Skill Exchange' : 'Item Exchange'}
        </span>
        <h1 className="text-4xl font-black text-slate-900 mt-2 mb-4">{listing.title}</h1>
        <p className="text-slate-500 mb-6">{listing.description || 'No description provided.'}</p>

        <div className="bg-white p-6 rounded-3xl border mb-8 space-y-3">
          <p className="font-bold text-slate-800 inline-flex items-center gap-2"><Coins size={16} /> {Number(listing.wtk || 0)} WTK</p>
          <p className="text-slate-600 inline-flex items-center gap-2"><MapPin size={16} /> {listing.location || 'Unknown location'}</p>
          <p className="text-xs font-black uppercase text-slate-400">Owner: {listing.owner_username}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/barter-request', { state: { item: listing } })}
            className="py-4 rounded-2xl bg-teal-600 text-white font-black text-sm inline-flex justify-center items-center gap-2 hover:bg-teal-700"
          >
            <Zap size={16} /> Propose Trade
          </button>
          <button
            onClick={() => navigate('/messages', { state: { targetUsername: listing.owner_username } })}
            className="py-4 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800"
          >
            Message Owner
          </button>
          <button
            onClick={() => navigate('/messages', {
              state: {
                shareListing: {
                  listing_id: listing._id,
                  title: listing.title,
                  owner_username: listing.owner_username,
                  wtk: listing.wtk,
                  type: listing.type === 'skill' ? 'skill' : 'item',
                  image: listing.image || '',
                  location: listing.location || ''
                }
              }
            })}
            className="py-4 rounded-2xl bg-slate-100 text-slate-700 font-black text-sm inline-flex justify-center items-center gap-2 hover:bg-slate-200"
          >
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

