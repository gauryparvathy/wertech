import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Zap, ArrowUpRight, ArrowDownLeft, Wallet, Clock3, IndianRupee, Landmark, ArrowRightLeft } from 'lucide-react';
import { showToast } from '../utils/toast';
import { getApiMessage, toastError, toastInfo, toastSuccess } from '../utils/feedback';
import { subscribeUserEvents } from '../utils/liveEvents';

function formatNumber(n) {
  return Number(n || 0).toLocaleString();
}

function normalizeBalance(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

export default function TokenLedger() {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || '';
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [walletConfig, setWalletConfig] = useState({
    wtk_price_inr: 10,
    min_purchase_wtk: 1,
    max_purchase_wtk: 20,
    developer_upi_id: '',
    payments_enabled: false,
    payouts_enabled: false
  });
  const [buyWtk, setBuyWtk] = useState(1);
  const [withdrawWtk, setWithdrawWtk] = useState(1);
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [buying, setBuying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [peerRecipient, setPeerRecipient] = useState('');
  const [peerAmount, setPeerAmount] = useState(10);
  const [sendingPeer, setSendingPeer] = useState(false);
  const [liveStatus, setLiveStatus] = useState('');

  useEffect(() => {
    const loadLedger = async () => {
      if (!username) {
        setLoading(false);
        return;
      }
      setError('');
      try {
        const [walletRes, txRes] = await Promise.all([
          fetch(`/api/users/${encodeURIComponent(username)}/wallet`),
          fetch(`/api/transactions/user/${encodeURIComponent(username)}`)
        ]);
        const [walletData, txData] = await Promise.all([walletRes.json(), txRes.json()]);

        if (walletRes.ok) {
          setBalance(normalizeBalance(walletData?.wtk_balance));
          if (walletData?.wallet_config) {
            setWalletConfig((prev) => ({
              ...prev,
              ...walletData.wallet_config
            }));
          }
        }
        if (txRes.ok && Array.isArray(txData)) {
          setTransactions(txData);
        } else {
          setTransactions([]);
          if (!txRes.ok) {
            setError(getApiMessage(txData, 'Could not load transaction history.'));
          }
        }
      } catch (err) {
        setTransactions([]);
        setError('Could not load ledger. Please retry.');
      } finally {
        setLoading(false);
      }
    };

    setLoading(true);
    loadLedger();
    const timer = setInterval(loadLedger, 5000);
    return () => clearInterval(timer);
  }, [username, reloadKey]);

  useEffect(() => {
    if (!username) return () => {};
    return subscribeUserEvents(username, {
      onEvent: (type, payload) => {
        if (type === 'wallet_update') {
          setBalance(normalizeBalance(payload?.wtk_balance));
          setReloadKey((prev) => prev + 1);
        }
        if (type === 'transaction_update') {
          if (payload?.kind === 'wallet_purchase' && payload?.status === 'paid') {
            setLiveStatus(`UPI payment confirmed. ${payload.amount || 0} WTK added.`);
            toastSuccess(`UPI payment confirmed. ${payload.amount || 0} WTK added.`);
          } else if (payload?.kind === 'wallet_withdrawal') {
            setLiveStatus(`Withdrawal status updated: ${payload.status || 'processing'}.`);
          } else if (payload?.kind === 'peer_transfer') {
            setLiveStatus(`WTK transfer ${payload.direction === 'incoming' ? 'received from' : 'sent to'} ${payload.counterparty}.`);
          }
          setReloadKey((prev) => prev + 1);
        }
      }
    });
  }, [username]);

  const handlePeerTransfer = async () => {
    const amount = Number(peerAmount || 0);
    if (!peerRecipient.trim()) {
      toastError('Enter the username to receive WTK.');
      return;
    }
    if (!amount || amount <= 0) {
      toastError('Enter a valid WTK amount.');
      return;
    }
    setSendingPeer(true);
    try {
      const response = await fetch('/api/transactions/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          type: 'spent',
          selectedUser: peerRecipient.trim(),
          wtk: amount,
          title: `WTK Sent to ${peerRecipient.trim()}`
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(getApiMessage(data, 'Could not send WTK.'));
      }
      setBalance(normalizeBalance(data?.wtk_balance));
      setPeerRecipient('');
      setPeerAmount(10);
      setLiveStatus(`Sent ${amount} WTK to ${data?.transaction?.title?.replace('WTK Sent to ', '') || 'user'}.`);
      toastSuccess('WTK sent in real time.');
      setReloadKey((prev) => prev + 1);
    } catch (err) {
      toastError(err.message || 'Could not send WTK.');
    } finally {
      setSendingPeer(false);
    }
  };

  const summary = useMemo(() => {
    let earned = 0;
    let spent = 0;
    for (const t of transactions) {
      const value = Number(t?.wtk || 0);
      if (String(t?.type || '').toLowerCase() === 'spent') spent += value;
      if (String(t?.type || '').toLowerCase() === 'earned') earned += value;
    }
    return { earned, spent };
  }, [transactions]);

  const buyAmountInr = Number(buyWtk || 0) * Number(walletConfig?.wtk_price_inr || 10);
  const withdrawAmountInr = Number(withdrawWtk || 0) * Number(walletConfig?.wtk_price_inr || 10);

  const handleDownloadStatement = () => {
    if (!transactions.length) {
      showToast('No transactions available to export.', 'info');
      return;
    }

    const rows = [
      ['date', 'type', 'title', 'wtk', 'status'],
      ...transactions.map((t) => [
        new Date(t.created_at || Date.now()).toISOString(),
        String(t.type || ''),
        String(t.title || '').replaceAll(',', ' '),
        String(t.wtk || 0),
        String(t.status || '')
      ])
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wertech-ledger-${username || 'user'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Ledger statement downloaded.', 'success');
  };

  const handleBuyWtk = async () => {
    const requestedWtk = Number(buyWtk || 0);
    if (!walletConfig?.payments_enabled) {
      toastError('Live UPI payment is not configured on the server yet.');
      return;
    }
    if (requestedWtk < Number(walletConfig?.min_purchase_wtk || 1) || requestedWtk > Number(walletConfig?.max_purchase_wtk || 20)) {
      toastError(`Choose between ${walletConfig?.min_purchase_wtk || 1} and ${walletConfig?.max_purchase_wtk || 20} WTK.`);
      return;
    }

    setBuying(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/wallet/purchase-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wtk: requestedWtk })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(getApiMessage(data, 'Could not start UPI payment.'));
      }
      if (data?.payment_url) {
        window.open(data.payment_url, '_blank', 'noopener,noreferrer');
        toastSuccess(`Payment page opened for Rs ${data.paid_inr}.`);
      } else {
        toastInfo('Payment intent created, but no payment URL was returned.');
      }
    } catch (err) {
      toastError(err.message || 'Could not start UPI payment.');
    } finally {
      setBuying(false);
    }
  };

  const handleWithdraw = async () => {
    const requestedWtk = Number(withdrawWtk || 0);
    const cleanUpiId = String(withdrawUpiId || '').trim();
    if (!walletConfig?.payouts_enabled) {
      toastError('Live UPI withdrawal is not configured on the server yet.');
      return;
    }
    if (!cleanUpiId) {
      toastError('Enter the UPI ID where cash should be sent.');
      return;
    }
    if (requestedWtk <= 0) {
      toastError('Enter a valid WTK amount to withdraw.');
      return;
    }

    setWithdrawing(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(username)}/wallet/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wtk: requestedWtk, upi_id: cleanUpiId })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(getApiMessage(data, 'Could not create withdrawal.'));
      }
      setBalance(normalizeBalance(data?.wtk_balance));
      setReloadKey((prev) => prev + 1);
      toastSuccess(data?.message || 'Withdrawal created.');
    } catch (err) {
      toastError(err.message || 'Could not create withdrawal.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-7 md:p-8 rounded-[28px] border border-slate-100 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 mb-3">Current Wallet Balance</p>
          <div className="flex items-baseline gap-4">
            <h2 className="text-5xl md:text-6xl font-black text-slate-900 leading-none">{balance === null && loading ? '...' : formatNumber(balance)}</h2>
            <span className="text-lg md:text-xl font-medium text-slate-400">WTK</span>
          </div>

          <div className="flex flex-wrap gap-3 mt-7">
            <button
              onClick={() => navigate('/explore')}
              className="bg-cyan-500 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-cyan-600 transition-all active:scale-95"
            >
              <Zap size={16} className="text-white" /> Spend on Explore
            </button>

            <button
              onClick={handleDownloadStatement}
              className="border border-slate-200 text-slate-700 px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
            >
              <Download size={16} /> Download CSV
            </button>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                <ArrowDownLeft size={14} className="text-emerald-500" /> Earned
              </p>
              <h3 className="text-3xl font-black text-emerald-600">+{formatNumber(summary.earned)} WTK</h3>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                <ArrowUpRight size={14} className="text-rose-500" /> Spent
              </p>
              <h3 className="text-3xl font-black text-rose-600">-{formatNumber(summary.spent)} WTK</h3>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 text-xs font-bold text-slate-500 flex items-center gap-2">
            <Wallet size={14} /> Synced from your live wallet and transaction history.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-600 mb-2">Buy WTK With UPI</p>
              <h3 className="text-2xl font-black text-slate-900">1 WTK = Rs {Number(walletConfig?.wtk_price_inr || 10)}</h3>
              <p className="text-sm font-medium text-slate-500 mt-2">
                Buy between {walletConfig?.min_purchase_wtk || 1} and {walletConfig?.max_purchase_wtk || 20} WTK.
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <IndianRupee size={20} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WTK to buy</label>
            <input
              type="number"
              min={walletConfig?.min_purchase_wtk || 1}
              max={walletConfig?.max_purchase_wtk || 20}
              value={buyWtk}
              onChange={(e) => setBuyWtk(e.target.value)}
              className="mt-3 w-full rounded-2xl bg-slate-50 px-4 py-4 text-2xl font-black text-slate-900 outline-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">You pay</p>
              <p className="text-2xl font-black text-slate-900">Rs {buyAmountInr}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Settlement</p>
              <p className="text-sm font-bold text-slate-600">{walletConfig?.developer_upi_id || 'Configured merchant account'}</p>
            </div>
          </div>

          <button
            onClick={handleBuyWtk}
            disabled={buying}
            className="w-full rounded-2xl bg-cyan-500 text-white py-4 font-black hover:bg-cyan-600 transition-all disabled:opacity-60"
          >
            {buying ? 'Creating Payment Link...' : `Pay Rs ${buyAmountInr} for ${buyWtk || 0} WTK`}
          </button>
        </div>

        <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Withdraw WTK As UPI Cash</p>
              <h3 className="text-2xl font-black text-slate-900">Withdraw to your UPI</h3>
              <p className="text-sm font-medium text-slate-500 mt-2">
                Withdrawal is allowed only after at least one successful WTK purchase.
              </p>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Landmark size={20} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 p-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">WTK to withdraw</label>
              <input
                type="number"
                min="1"
                value={withdrawWtk}
                onChange={(e) => setWithdrawWtk(e.target.value)}
                className="mt-3 w-full rounded-2xl bg-slate-50 px-4 py-4 text-2xl font-black text-slate-900 outline-none"
              />
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your UPI ID</label>
              <input
                type="text"
                value={withdrawUpiId}
                onChange={(e) => setWithdrawUpiId(e.target.value)}
                placeholder="name@bank"
                className="mt-3 w-full rounded-2xl bg-slate-50 px-4 py-4 text-base font-bold text-slate-900 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected cash</p>
              <p className="text-2xl font-black text-slate-900">Rs {withdrawAmountInr}</p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500">
              <ArrowRightLeft size={14} />
              Realtime payout
            </div>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={withdrawing}
            className="w-full rounded-2xl bg-emerald-500 text-white py-4 font-black hover:bg-emerald-600 transition-all disabled:opacity-60"
          >
            {withdrawing ? 'Submitting Withdrawal...' : `Withdraw Rs ${withdrawAmountInr}`}
          </button>
        </div>
      </div>

      <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-2">Real-Time User Transfer</p>
            <h3 className="text-2xl font-black text-slate-900">Send WTK to another user instantly</h3>
            <p className="text-sm font-medium text-slate-500 mt-2">Balances and ledger entries update live for both sides.</p>
          </div>
          <div className="h-12 w-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <ArrowRightLeft size={20} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" value={peerRecipient} onChange={(e) => setPeerRecipient(e.target.value)} placeholder="Recipient username" className="w-full rounded-2xl bg-slate-50 px-4 py-4 text-base font-bold text-slate-900 outline-none" />
          <input type="number" min="1" value={peerAmount} onChange={(e) => setPeerAmount(e.target.value)} placeholder="WTK amount" className="w-full rounded-2xl bg-slate-50 px-4 py-4 text-base font-bold text-slate-900 outline-none" />
        </div>
        <button onClick={handlePeerTransfer} disabled={sendingPeer} className="w-full rounded-2xl bg-violet-600 text-white py-4 font-black hover:bg-violet-700 transition-all disabled:opacity-60">
          {sendingPeer ? 'Sending WTK...' : 'Send WTK Now'}
        </button>
        {liveStatus && <p className="text-sm font-bold text-emerald-600">{liveStatus}</p>}
      </div>

      <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-7 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900">Ledger Entries</h3>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{transactions.length} records</p>
        </div>

        {loading && (
          <div className="p-10 text-center text-sm font-bold text-slate-400">Loading ledger...</div>
        )}
        {!loading && error && (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-bold text-rose-500">{error}</p>
            <button
              onClick={() => {
                toastError('Retrying ledger sync...');
                setReloadKey((prev) => prev + 1);
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-700 transition-all"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && transactions.length === 0 && (
          <div className="p-10 text-center text-sm font-bold text-slate-400">No transactions found.</div>
        )}

        {!loading && !error && transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 uppercase text-[10px] font-black text-slate-400">
                <tr>
                  <th className="p-5">Type</th>
                  <th className="p-5">Title</th>
                  <th className="p-5">Amount</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => {
                  const spent = String(t.type || '').toLowerCase() === 'spent';
                  return (
                    <tr key={t._id || `${t.title}-${t.created_at}`} className="border-t border-slate-50">
                      <td className="p-5">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-full ${spent ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {spent ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                          {spent ? 'Spent' : 'Earned'}
                        </span>
                      </td>
                      <td className="p-5 font-bold text-slate-800">{t.title || 'Transaction'}</td>
                      <td className={`p-5 font-black ${spent ? 'text-slate-800' : 'text-emerald-600'}`}>
                        {spent ? '-' : '+'}{formatNumber(t.wtk)} WTK
                      </td>
                      <td className="p-5 text-xs font-black uppercase text-teal-600">{t.status || 'Completed'}</td>
                      <td className="p-5 text-xs font-bold text-slate-400 inline-flex items-center gap-2">
                        <Clock3 size={12} />
                        {t.created_at ? new Date(t.created_at).toLocaleString() : t.date || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

