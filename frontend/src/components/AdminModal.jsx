import React, { useState } from 'react';
import { Lock, Unlock, KeyRound, Sparkles, RefreshCw, Database, ShieldAlert, CheckCircle2, Play, AlertTriangle, X, Terminal, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { useLiveEvents } from '../context/LiveEventsContext';
import { useAuth } from '../context/AuthContext';

export const AdminModal = ({ isOpen, onClose }) => {
  const { addNotification } = useLiveEvents();
  const { refreshRoster } = useAuth();

  const [adminPin, setAdminPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [logs, setLogs] = useState([]);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!adminPin.trim()) return;

    try {
      setIsVerifying(true);
      setAuthError(null);
      await api.verifyAdminPin(adminPin.trim());
      setIsAuthenticated(true);
    } catch (err) {
      setAuthError(err.message || 'Invalid Admin Security PIN.');
    } finally {
      setIsVerifying(false);
    }
  };

  const executeAdminAction = async (actionFn, successMsg) => {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);
      const resp = await actionFn(adminPin.trim());
      setActionSuccess(successMsg || resp?.message || 'Operation executed successfully.');
      if (resp?.result?.simulated_event) {
        addNotification(resp.result.simulated_event);
      }
      await refreshRoster();
    } catch (err) {
      setActionError(err.message || 'Action execution failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFetchLogs = async () => {
    try {
      setActionLoading(true);
      const logEntries = await api.adminGetLogs(adminPin.trim(), 25);
      setLogs(logEntries);
    } catch (err) {
      setActionError(err.message || 'Failed to retrieve logs.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLock = () => {
    setIsAuthenticated(false);
    setAdminPin('');
    setActionSuccess(null);
    setActionError(null);
    setLogs([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${isAuthenticated ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
              {isAuthenticated ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Admin & Developer Portal</h2>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${isAuthenticated ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                  {isAuthenticated ? 'UNLOCKED' : 'LOCKED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Protected testing sandbox, matchday simulation & pipeline maintenance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && (
              <button
                onClick={handleLock}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold text-xs transition flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock</span>
              </button>
            )}
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
          {!isAuthenticated ? (
            /* PIN Verification Screen */
            <form onSubmit={handleVerify} className="py-8 px-4 max-w-md mx-auto text-center space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Enter Admin Security PIN</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Enter the server administrator PIN to unlock simulation & pipeline tools.
                </p>
              </div>

              <input
                type="password"
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="Admin Security PIN..."
                className="w-full text-center px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-sm font-mono text-white tracking-widest placeholder-slate-600 focus:outline-none focus:border-amber-400"
                autoFocus
                required
              />

              {authError && (
                <p className="text-xs text-rose-400 font-semibold">{authError}</p>
              )}

              <button
                type="submit"
                disabled={isVerifying}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-2xl shadow-lg transition active:scale-95 text-xs"
              >
                {isVerifying ? 'Verifying PIN...' : 'Unlock Admin Portal'}
              </button>
            </form>
          ) : (
            /* Authenticated Admin Dashboard */
            <div className="space-y-6">
              {actionSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-400/60 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {actionError && (
                <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-rose-300 text-xs font-bold flex items-center gap-2 shadow-lg">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* 1. Match Simulation Sandbox */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Matchday Simulator (Sandbox Testing)
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400">
                  Simulate live match events, points calculations, 2X Captain multiplier, and SSE stream notifications.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => executeAdminAction((pin) => api.adminSimulateTick(pin), 'Simulated goal/event broadcast successfully!')}
                    disabled={actionLoading}
                    className="p-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-200 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5 text-purple-400" />
                    <span>Simulate Goal/Tick</span>
                  </button>

                  <button
                    onClick={() => executeAdminAction((pin) => api.adminTriggerPoller(pin), 'Matchday poller cycle completed.')}
                    disabled={actionLoading}
                    className="p-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-200 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Force Live Poller</span>
                  </button>

                  <button
                    onClick={() => executeAdminAction((pin) => api.adminRecalculateScores(pin), 'Scoring engine executed & standings recalculated.')}
                    disabled={actionLoading}
                    className="p-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Recalculate Scores</span>
                  </button>
                </div>
              </div>

              {/* 2. Database & Pipeline Controls */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    Pipeline & Data Feeds
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => executeAdminAction((pin) => api.adminTriggerSeeder(pin, false), 'Daily seeder completed with live feeds.')}
                    disabled={actionLoading}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <span>Run Seeder (Live)</span>
                  </button>

                  <button
                    onClick={() => executeAdminAction((pin) => api.adminTriggerSeeder(pin, true), 'Daily seeder completed in mock mode.')}
                    disabled={actionLoading}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <span>Run Seeder (Mock)</span>
                  </button>

                  <button
                    onClick={() => executeAdminAction((pin) => api.adminResetUsage(pin), 'API-Football local quota counter reset.')}
                    disabled={actionLoading}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reset Quota Count</span>
                  </button>
                </div>
              </div>

              {/* 3. Audit Logs */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-slate-400" />
                    <span>API Audit Logs</span>
                  </span>
                  <button
                    onClick={handleFetchLogs}
                    className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                  >
                    Load Logs
                  </button>
                </div>

                {logs.length > 0 && (
                  <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 max-h-48 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-300">
                    {logs.map((l) => (
                      <div key={l.id} className="flex items-center justify-between py-0.5 border-b border-slate-900">
                        <span>[{l.timestamp}] {l.endpoint}</span>
                        <span className={`font-bold ${l.status_code === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          HTTP {l.status_code}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>BeanLeague Security Sandbox</span>
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
