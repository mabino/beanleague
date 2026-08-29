import React, { useState, useEffect } from 'react';
import { Play, Sparkles, Activity, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { useLiveEvents } from '../context/LiveEventsContext';
import { useAuth } from '../context/AuthContext';

export const SimulationControls = () => {
  const { isConnected, addNotification } = useLiveEvents();
  const { refreshRoster } = useAuth();
  const [usage, setUsage] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const fetchUsage = async () => {
    try {
      const data = await api.getApiUsage();
      setUsage(data);
    } catch (err) {
      console.debug('Failed to get API usage:', err);
    }
  };

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulateTick = async () => {
    try {
      setIsSimulating(true);
      const resp = await api.simulateTick();
      if (resp?.result?.simulated_event) {
        addNotification(resp.result.simulated_event);
      }
      await refreshRoster();
      await fetchUsage();
    } catch (err) {
      console.error('Failed to simulate match tick:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Live SSE Status Badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`}
        />
        <span className="text-slate-400 text-[11px]">
          {isConnected ? 'Live SSE Connected' : 'Connecting SSE...'}
        </span>
      </div>

      {/* API-Football 100/day Limit Guard Widget */}
      {usage && (
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-400 text-[11px]">
            API-Football: <strong className="text-white">{usage.requests_used_today}/{usage.daily_limit}</strong> reqs
          </span>
        </div>
      )}

      {/* Live Match Simulator Button */}
      <button
        onClick={handleSimulateTick}
        disabled={isSimulating}
        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-md shadow-indigo-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
        title="Simulate a real-time goal/assist and test live scoring engine!"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        <span>{isSimulating ? 'Simulating...' : 'Simulate Goal / Event'}</span>
      </button>
    </div>
  );
};
