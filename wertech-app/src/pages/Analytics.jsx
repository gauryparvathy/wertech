import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  TrendingUp, Download, CheckCircle 
} from 'lucide-react';

export default function Analytics() {
  const [showToast, setShowToast] = useState(false);
  const [trendData, setTrendData] = useState([]);
  const [pulseData, setPulseData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLiveAnalytics = useCallback(async () => {
    try {
      setError('');
      const response = await fetch('/api/admin/analytics/live');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Could not load analytics');
      }
      setTrendData(Array.isArray(data?.trend) ? data.trend : []);
      setPulseData(Array.isArray(data?.pulse) ? data.pulse : []);
    } catch (err) {
      setError(err?.message || 'Could not load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLiveAnalytics();
    const timer = setInterval(loadLiveAnalytics, 4000);
    return () => clearInterval(timer);
  }, [loadLiveAnalytics]);

  const graphData = useMemo(() => {
    const safe = Array.isArray(trendData) ? trendData : [];
    const maxValue = Math.max(...safe.map((d) => Number(d?.value || 0)), 1);
    return safe.map((item) => {
      const value = Number(item?.value || 0);
      const ratio = maxValue > 0 ? value / maxValue : 0;
      const height = Math.max(10, Math.round(ratio * 100));
      return {
        day: item?.day || 'N/A',
        value,
        height: `${height}%`
      };
    });
  }, [trendData]);

  const pulseColorMap = {
    tx: 'bg-blue-500',
    barter: 'bg-indigo-500',
    report: 'bg-rose-500',
    user: 'bg-emerald-500'
  };

  const handleExport = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="p-10 max-w-7xl mx-auto space-y-10">
      
      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase italic">Analytics</h1>
          <p className="text-slate-400 font-bold text-[10px] tracking-[0.2em] mt-1 uppercase">Usage Patterns & Growth</p>
        </div>
        <button 
          onClick={handleExport}
          className="px-6 py-4 bg-slate-900 text-white rounded-[20px] font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-blue-600 transition-all"
        >
          <Download size={16} /> Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ACTIVITY TRENDS - BLUE GRAPH SECTION */}
        <div className="lg:col-span-8 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <TrendingUp className="text-blue-600" /> Activity Trends
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-4 py-2 rounded-full">
              Real-time
            </span>
          </div>
          
          {/* THE GRAPH FLOOR */}
          <div className="h-80 w-full flex items-end justify-between gap-4 px-4 border-b-2 border-slate-50">
            {loading && graphData.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold text-sm">
                Loading activity...
              </div>
            )}
            {!loading && graphData.length === 0 && (
              <div className="w-full h-full flex items-center justify-center text-slate-400 font-semibold text-sm">
                No activity yet.
              </div>
            )}
            {graphData.map((item, i) => (
              <div key={`${item.day}-${i}`} className="flex-1 flex flex-col items-center h-full justify-end group">
                {/* BLUE BAR */}
                <div 
                  className="w-full bg-blue-600 rounded-t-xl transition-all duration-300 hover:bg-blue-700 cursor-pointer relative"
                  style={{ height: item.height }}
                >
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.value}
                  </div>
                </div>
                {/* DAY LABEL */}
                <span className="text-[10px] font-black text-slate-400 uppercase mt-4 mb-2">
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SYSTEM PULSE LOG */}
        <div className="lg:col-span-4 bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8">System Pulse</h3>
          <div className="space-y-6">
            {loading && pulseData.length === 0 && (
              <p className="text-slate-400 font-semibold text-sm">Loading pulse...</p>
            )}
            {!loading && pulseData.length === 0 && (
              <p className="text-slate-400 font-semibold text-sm">No pulse events yet.</p>
            )}
            {pulseData.map((log, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${pulseColorMap[log.kind] || 'bg-slate-800'}`} />
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-800">{log.user || 'Unknown user'}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{log.action || 'Activity'}</p>
                </div>
              </div>
            ))}
            {error && (
              <p className="text-xs font-bold text-rose-500">{error}</p>
            )}
          </div>
        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-8 py-4 rounded-[20px] shadow-2xl flex items-center gap-3 z-50">
          <CheckCircle className="text-blue-400" size={20} />
          <span className="font-black uppercase text-[10px] tracking-widest">Analytics Exported</span>
        </div>
      )}
    </div>
  );
}

