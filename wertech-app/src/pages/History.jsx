import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, CheckCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getApiMessage } from '../utils/feedback';

export default function History() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadTransactions = async () => {
      const username = localStorage.getItem('username');
      if (!username) {
        setLoading(false);
        return;
      }

      setError('');
      try {
        setLoading(true);
        const response = await fetch(`/api/transactions/user/${encodeURIComponent(username)}`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          setError(getApiMessage(data, 'Could not load transaction history.'));
          return;
        }
        setTransactions(data);
      } catch (err) {
        setTransactions([]);
        setError('Could not load transaction history.');
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [reloadKey]);

  return (
    <div className="p-10 max-w-5xl mx-auto space-y-8">
      {/* Navigation */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-400 font-bold hover:text-teal-600 transition-all"
      >
        <ArrowLeft size={20} /> Back to Dashboard
      </button>

      {/* Header */}
      <div>
        <h1 className="text-4xl font-black text-slate-900">Transaction History</h1>
        <p className="text-slate-500 font-medium">Tracking your skill exchanges and token flow.</p>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-[40px] border border-slate-100 overflow-hidden shadow-sm">
        {loading && (
          <div className="p-20 text-center text-slate-400 font-bold">
            Loading transactions...
          </div>
        )}
        {!loading && error && (
          <div className="p-12 text-center space-y-3">
            <p className="text-rose-600 font-bold">{error}</p>
            <button
              onClick={() => setReloadKey((prev) => prev + 1)}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 transition-all"
            >
              Retry
            </button>
          </div>
        )}
        {!loading && !error && transactions.length > 0 ? (
          transactions.map((t, i) => (
            <div 
              key={t._id || t.id} 
              className={`p-8 flex items-center justify-between ${
                i !== transactions.length - 1 ? 'border-b border-slate-50' : ''
              }`}
            >
              <div className="flex items-center gap-6">
                {/* Icon Container: Green for Earned, Rose/Red for Spent */}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  t.type === 'spent' ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'
                }`}>
                  {t.type === 'spent' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                </div>
                
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">{t.title}</h4>
                  <p className="text-slate-400 text-sm font-medium flex items-center gap-1">
                    <Clock size={14}/> {t.date}
                  </p>
                </div>
              </div>

              <div className="text-right">
                {/* Amount: Green for Earned, Slate/Red for Spent */}
                <p className={`text-2xl font-black ${
                  t.type === 'spent' ? 'text-slate-900' : 'text-green-600'
                }`}>
                  {t.type === 'spent' ? '-' : '+'}{t.wtk} <span className="text-xs uppercase">WTK</span>
                </p>
                
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-teal-600 bg-teal-50 px-2 py-1 rounded-full mt-1">
                  <CheckCircle size={10}/> {t.status}
                </span>
              </div>
            </div>
          ))
        ) : !loading && !error ? (
          <div className="p-20 text-center text-slate-400 font-bold">
            No transactions found.
          </div>
        ) : null}
      </div>
    </div>
  );
}

