import React, { useState, useEffect } from 'react';
import { Activity, Radio, Database, ShieldCheck, RefreshCw, X, Clock, CheckCircle2, AlertCircle, Wifi, Server, Flame } from 'lucide-react';
import { api } from '../api/client';
import { useLiveEvents } from '../context/LiveEventsContext';

export const SystemStatusModal = ({ isOpen, onClose }) => {
  const { isConnected } = useLiveEvents();
  const [statusData, setStatusData] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTelemetry = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [sys, events] = await Promise.all([
        api.getSystemStatus(),
        api.getRecentEvents().catch(() => [])
      ]);
      setStatusData(sys);
      setRecentEvents(events || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch system status.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTelemetry();
      const interval = setInterval(fetchTelemetry, 15000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">System Telemetry & Status</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Operational</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live stream health, database telemetry, and data feed adapters
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchTelemetry}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto pr-1 space-y-5">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Grid Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* SSE Live Stream Card */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Real-Time SSE</span>
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
              </div>
              <div className="text-lg font-black text-white">
                {isConnected ? 'Active & Streaming' : 'Connecting...'}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                Endpoint: /api/events/live
              </p>
            </div>

            {/* Database Telemetry */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>SQLite Database</span>
                </span>
                <span className="text-[10px] font-bold text-emerald-400 font-mono">WAL Mode</span>
              </div>
              <div className="text-lg font-black text-white">
                {statusData?.database?.registered_players || 0} Players
              </div>
              <p className="text-[11px] text-slate-500">
                {statusData?.database?.fantasy_teams || 0} teams • {statusData?.database?.fixtures_synced || 0} fixtures
              </p>
            </div>

            {/* API Feeds & Quotas */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Data Providers</span>
                </span>
                <span className="text-[10px] font-bold text-purple-400">TheSportsDB</span>
              </div>
              <div className="text-lg font-black text-white">
                {statusData?.api_usage ? `${statusData.api_usage.requests_used}/${statusData.api_usage.daily_limit} reqs` : 'Live Polling'}
              </div>
              <p className="text-[11px] text-slate-500">
                Live match poller: {statusData?.poller?.interval_minutes || 15}m cycle
              </p>
            </div>
          </div>

          {/* Active Fixtures In-Play */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Live Matchday Tracker</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {statusData?.database?.active_in_play_matches || 0} Matches In-Play
              </span>
            </div>
            <p className="text-xs text-slate-400">
              The real-time match coordinator polls today's fixtures and delivers immediate goal events to all active managers without requiring manual page reloads.
            </p>
          </div>

          {/* Recent Match Events Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                Recent Broadcast Events Stream ({recentEvents.length})
              </span>
            </div>

            <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-inner max-h-56 overflow-y-auto">
              {recentEvents.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No match events broadcast in this window yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-800 bg-slate-900/50">
                      <th className="py-2 pl-3">Min</th>
                      <th className="py-2">Event</th>
                      <th className="py-2">Player</th>
                      <th className="py-2">Club</th>
                      <th className="py-2 pr-3 text-right">Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {recentEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-900/40">
                        <td className="py-2 pl-3 font-mono text-emerald-400 font-bold">
                          {ev.minute ? `${ev.minute}'` : '-'}
                        </td>
                        <td className="py-2 font-bold text-white uppercase">
                          {ev.event_type}
                        </td>
                        <td className="py-2 text-slate-300 font-semibold">
                          {ev.player_name}
                        </td>
                        <td className="py-2 text-slate-400">
                          {ev.real_team_name}
                        </td>
                        <td className="py-2 pr-3 text-right text-slate-500 truncate max-w-[120px]">
                          {ev.home_team_name} vs {ev.away_team_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>BeanLeague v2.1.0 • Live Matchday Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
