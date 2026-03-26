import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Users, AlertCircle, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HUMOR_QUOTES = [
  "Servers are like toddlers: quiet for too long means trouble.",
  "If it works in production, it was never a bug. It was a feature rollout.",
  "Coffee: the original incident response toolkit.",
  "No alerts means one of two things: healthy systems or broken monitoring.",
  "We do not fear traffic spikes. We autoscale and pretend we expected it."
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [metrics, setMetrics] = useState({
    total_economy_wtk: 0,
    total_users: 0,
    reports_count: 0,
    uptime_percent: 99.9
  });
  const [alerts, setAlerts] = useState([]);
  const username = localStorage.getItem('username') || 'Admin';

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [metricsRes, alertsRes] = await Promise.all([
          fetch('/api/admin/dashboard/metrics'),
          fetch('/api/admin/dashboard/alerts')
        ]);
        const [metricsData, alertsData] = await Promise.all([metricsRes.json(), alertsRes.json()]);

        if (metricsRes.ok && metricsData) {
          setMetrics({
            total_economy_wtk: Number(metricsData.total_economy_wtk || 0),
            total_users: Number(metricsData.total_users ?? metricsData.active_users ?? 0),
            reports_count: Number(metricsData.reports_count || 0),
            uptime_percent: Number(metricsData.uptime_percent || 99.9)
          });
        }
        if (alertsRes.ok && Array.isArray(alertsData)) {
          setAlerts(alertsData);
        }
      } catch (err) {
        // no-op
      }
    };

    loadDashboard();
    const timer = setInterval(loadDashboard, 4000);
    return () => clearInterval(timer);
  }, []);

  const greeting = useMemo(() => {
    const hour = now.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, [now]);

  const formattedDate = useMemo(
    () =>
      now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
    [now]
  );

  const formattedTime = useMemo(
    () =>
      now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
    [now]
  );

  const humorQuoteOfDay = useMemo(() => {
    const dateKey = now.toDateString();
    const seed = Array.from(dateKey).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return HUMOR_QUOTES[seed % HUMOR_QUOTES.length];
  }, [now]);

  const formatWtkExact = (value) => `${Number(value || 0).toLocaleString()} WTK`;

  const stats = [
    { title: "Total Economy", value: formatWtkExact(metrics.total_economy_wtk), icon: <Activity className="text-teal-600" /> },
    { title: "Total Users", value: Number(metrics.total_users || 0).toLocaleString(), icon: <Users className="text-blue-600" /> },
    { title: "Reports", value: Number(metrics.reports_count || 0).toLocaleString(), icon: <AlertCircle className="text-red-500" /> },
    { title: "Uptime", value: `${Number(metrics.uptime_percent || 99.9).toFixed(1)}%`, icon: <Globe className="text-green-500" /> }
  ];

  return (
    <div className="space-y-10">
      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border dark:border-slate-800 shadow-sm">
        <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-3">Admin Command Center</p>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {greeting}, {username}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
          {formattedDate} | {formattedTime}
        </p>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 italic">
          "{humorQuoteOfDay}"
        </p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/admin/messages', { state: { targetUsername: 'wertech' } })}
            className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black"
          >
            Open Wertech Support Inbox
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-sm">
            <div className="mb-4">{s.icon}</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.title}</p>
            <h3 className="text-3xl font-black mt-1">{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 border dark:border-slate-800">
        <h3 className="text-xl font-black mb-6">Critical System Alerts</h3>
        <div className="space-y-4">
          {alerts.length === 0 && (
            <div className="p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-3xl">
              <p className="font-bold text-slate-500">No critical alerts right now.</p>
            </div>
          )}
          {alerts.map((a) => (
            <div key={a.id} className="p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl flex justify-between items-center gap-4">
              <p className="font-bold text-red-600">{a.message}</p>
              <button
                onClick={() => navigate(a.action_route || '/admin/profiles')}
                className="text-[10px] font-black uppercase bg-red-600 text-white px-4 py-2 rounded-xl shrink-0"
              >
                {a.action_label || 'Investigate'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

