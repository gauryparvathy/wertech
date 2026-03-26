import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { Send, Handshake, Clock, Check, X } from 'lucide-react';
import { getApiMessage, toastError, toastSuccess, validateBarterRequestForm } from '../utils/feedback';

export default function BarterRequest() {
  const location = useLocation();
  const selectedItem = location.state?.item || null;
  const prefillReceiver = selectedItem?.owner_username || selectedItem?.user || '';
  const prefillItem = selectedItem?.title || selectedItem?.item || '';

  const [requests, setRequests] = useState([]);
  const [receiver, setReceiver] = useState(prefillReceiver);
  const [itemName, setItemName] = useState(prefillItem);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState('');
  const [sending, setSending] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  
  const currentUser = localStorage.getItem('username') || 'Unknown';

  useEffect(() => {
    setReceiver(prefillReceiver);
    setItemName(prefillItem);
  }, [prefillReceiver, prefillItem]);

  useEffect(() => {
    const loadRequests = async () => {
      if (!currentUser) return;
      setRequestsError('');
      try {
        setLoadingRequests(true);
        const response = await fetch(`/api/barters/user/${encodeURIComponent(currentUser)}`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          setRequestsError(getApiMessage(data, 'Could not load barter requests.'));
          return;
        }
        setRequests(data);
      } catch (err) {
        setRequestsError('Could not load barter requests.');
      } finally {
        setLoadingRequests(false);
      }
    };

    loadRequests();
    const timer = setInterval(loadRequests, 3000);
    return () => clearInterval(timer);
  }, [currentUser, reloadKey]);

  const handleSend = async (e) => {
    e.preventDefault();
    const validationError = validateBarterRequestForm({ receiver, itemName });
    if (validationError) {
      toastError(validationError);
      return;
    }
    const cleanReceiver = String(receiver || '').trim();
    const cleanItem = String(itemName || '').trim();
    if (!currentUser || !cleanReceiver || !cleanItem) return;

    try {
      setSending(true);
      const response = await fetch('/api/barters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_username: currentUser,
          receiver_username: cleanReceiver,
          item: cleanItem,
          wtk: Number(selectedItem?.wtk || 0)
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not send barter request.'));
        return;
      }

      setRequests((prev) => [data, ...prev]);
      toastSuccess('Barter request sent.');
      setReceiver(prefillReceiver);
      setItemName(prefillItem);
    } catch (err) {
      toastError('Could not send barter request.');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    if (!id || !newStatus || !currentUser) return;
    try {
      const response = await fetch(`/api/barters/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requester_username: currentUser,
          status: newStatus
        })
      });
      const data = await response.json();
      if (!response.ok) {
        toastError(getApiMessage(data, 'Could not update barter status.'));
        return;
      }
      setRequests((prev) => prev.map((req) => (req._id === id ? data : req)));
      toastSuccess(`Request ${String(newStatus || '').toLowerCase()}.`);
    } catch (err) {
      toastError('Could not update barter status.');
    }
  };

  return (
    <div className="p-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
      
      {/* SEND REQUEST FORM */}
      <div className="lg:col-span-5 bg-white rounded-[40px] p-10 shadow-sm border border-slate-50 h-fit">
        <div className="flex items-center gap-4 mb-10">
          <div className="p-4 bg-teal-50 text-teal-600 rounded-3xl">
            <Handshake size={32} />
          </div>
          <h2 className="text-3xl font-black text-slate-800">Send Request</h2>
        </div>

        <form onSubmit={handleSend} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Recipient</label>
            <input
              name="receiver"
              required
              placeholder="To: Username"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              className="w-full p-5 bg-slate-50 rounded-[24px] border-none outline-none focus:ring-2 ring-teal-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Item/Skill Desired</label>
            <input
              name="item"
              required
              placeholder="e.g. Graphic Design"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full p-5 bg-slate-50 rounded-[24px] border-none outline-none focus:ring-2 ring-teal-500"
            />
          </div>
          <button className="w-full py-5 bg-[#0d9488] text-white rounded-[24px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all">
            {sending ? 'Sending...' : 'Send Barter'} <Send size={18} />
          </button>
        </form>
      </div>

      {/* REQUEST LEDGER (SEND & RECEIVE) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center gap-3 mb-4 ml-4">
          <Clock size={22} className="text-teal-600" />
          <h3 className="text-xl font-black text-slate-800">Request Ledger</h3>
        </div>
        
        <div className="space-y-4 overflow-y-auto max-h-[700px] pr-2">
          {loadingRequests && (
            <div className="bg-white rounded-[40px] p-20 text-center border border-slate-100 text-slate-400 font-bold">
              Loading barter activity...
            </div>
          )}
          {!loadingRequests && requestsError && (
            <div className="bg-rose-50 rounded-[40px] p-10 text-center border border-rose-100 space-y-3">
              <p className="text-rose-600 font-bold">{requestsError}</p>
              <button
                onClick={() => setReloadKey((prev) => prev + 1)}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition-all"
              >
                Retry
              </button>
            </div>
          )}
          {!loadingRequests && !requestsError && requests.length === 0 ? (
            <div className="bg-white rounded-[40px] p-20 text-center border-2 border-dashed border-slate-100 text-slate-300 font-bold">
              No barter activity yet.
            </div>
          ) : (
            requests.map(req => {
              const isIncoming = req.receiver_username === currentUser;
              return (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} key={req._id} className="bg-white p-6 rounded-[35px] border border-slate-50 shadow-sm flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-black ${isIncoming ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                        {isIncoming ? "IN" : "OUT"}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest">
                          {isIncoming ? `From: ${req.sender_username}` : `To: ${req.receiver_username}`}
                        </h4>
                        <p className="font-bold text-lg text-slate-800">{req.item}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      req.status === 'ACCEPTED' ? 'bg-teal-600 text-white' : 
                      req.status === 'DECLINED' ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {/* ACTION BUTTONS FOR INCOMING REQUESTS */}
                  {isIncoming && req.status === 'PENDING' && (
                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => updateStatus(req._id, 'ACCEPTED')}
                        className="flex-1 py-3 bg-teal-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-700 transition-all"
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button 
                        onClick={() => updateStatus(req._id, 'DECLINED')}
                        className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

