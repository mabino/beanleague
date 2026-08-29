import React, { useState, useEffect } from 'react';
import { Lock, Unlock, KeyRound, Sparkles, RefreshCw, Database, ShieldAlert, CheckCircle2, Play, AlertTriangle, X, Terminal, Trash2, Download, Users, FileDown, AlertOctagon, UserX } from 'lucide-react';
import { api } from '../api/client';
import { useLiveEvents } from '../context/LiveEventsContext';
import { useAuth } from '../context/AuthContext';
import { JerseyKit } from './JerseyKit';

export const AdminModal = ({ isOpen, onClose }) => {
  const { addNotification } = useLiveEvents();
  const { refreshRoster } = useAuth();

  const [adminPin, setAdminPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Admin Navigation Tab
  const [adminTab, setAdminTab] = useState('users'); // 'users' | 'export' | 'simulation' | 'logs'

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);
  
  // Data states
  const [seasonsData, setSeasonsData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation prompts
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(null);
  const [confirmClearSeason, setConfirmClearSeason] = useState(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [clearAllInput, setClearAllInput] = useState('');

  const fetchSeasons = async () => {
    if (!isAuthenticated) return;
    try {
      setActionLoading(true);
      const data = await api.adminGetSeasons(adminPin.trim());
      setSeasonsData(data);
    } catch (err) {
      setActionError(err.message || 'Failed to fetch seasons.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchSeasons();
    }
  }, [isAuthenticated]);

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

  const handleExportData = async () => {
    try {
      setActionLoading(true);
      setActionError(null);
      setActionSuccess(null);
      const res = await api.adminExportUserData(adminPin.trim());
      setActionSuccess(`Export completed! Downloaded ${res.filename}`);
    } catch (err) {
      setActionError(err.message || 'Failed to export user data.');
    } finally {
      setActionLoading(false);
    }
  };

  const executeDeleteTeam = async (team) => {
    try {
      setActionLoading(true);
      setActionError(null);
      const resp = await api.adminDeleteTeam(adminPin.trim(), team.team_id);
      setActionSuccess(resp.message || `Deleted ${team.team_name}`);
      setConfirmDeleteTeam(null);
      await fetchSeasons();
      await refreshRoster();
    } catch (err) {
      setActionError(err.message || 'Failed to delete team.');
    } finally {
      setActionLoading(false);
    }
  };

  const executeClearSeason = async (season) => {
    try {
      setActionLoading(true);
      setActionError(null);
      const resp = await api.adminClearSeason(adminPin.trim(), season.season_code);
      setActionSuccess(resp.message || `Cleared season ${season.season_code}`);
      setConfirmClearSeason(null);
      await fetchSeasons();
      await refreshRoster();
    } catch (err) {
      setActionError(err.message || 'Failed to clear season.');
    } finally {
      setActionLoading(false);
    }
  };

  const executeClearAllUsers = async () => {
    if (clearAllInput.trim().toUpperCase() !== 'CLEAR') {
      setActionError('You must type CLEAR to confirm wholesale user data purge.');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);
      const resp = await api.adminClearAllUsers(adminPin.trim());
      setActionSuccess(resp.message || 'Purged all user teams across all seasons.');
      setConfirmClearAll(false);
      setClearAllInput('');
      await fetchSeasons();
      await refreshRoster();
    } catch (err) {
      setActionError(err.message || 'Failed to clear all users.');
    } finally {
      setActionLoading(false);
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
      const logEntries = await api.adminGetLogs(adminPin.trim(), 50);
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
    setSeasonsData([]);
  };

  // Filter teams across seasons
  const totalTeamsCount = seasonsData.reduce((sum, s) => sum + (s.teams_count || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl border ${isAuthenticated ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>
              {isAuthenticated ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Admin Portal & Data Control</h2>
                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${isAuthenticated ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                  {isAuthenticated ? 'AUTHORIZED' : 'LOCKED'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                User data export, selective account clearance & pipeline maintenance
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

        {/* Tab Navigation if Authenticated */}
        {isAuthenticated && (
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs overflow-x-auto">
            <button
              onClick={() => setAdminTab('users')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                adminTab === 'users' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users & Seasons ({totalTeamsCount})</span>
            </button>

            <button
              onClick={() => setAdminTab('export')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                adminTab === 'export' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Export & Backup</span>
            </button>

            <button
              onClick={() => setAdminTab('simulation')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                adminTab === 'simulation' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulation & Sandbox</span>
            </button>

            <button
              onClick={() => {
                setAdminTab('logs');
                handleFetchLogs();
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                adminTab === 'logs' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Audit Logs</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="overflow-y-auto pr-1 space-y-4">
          {!isAuthenticated ? (
            /* PIN Verification Screen */
            <form onSubmit={handleVerify} className="py-8 px-4 max-w-md mx-auto text-center space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
                <KeyRound className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Enter Admin Security PIN</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Protected portal for user data export, user management, and testing tools.
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
            /* Authenticated Admin Views */
            <div className="space-y-4">
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

              {/* TAB 1: USERS & SEASONS CLEARANCE */}
              {adminTab === 'users' && (
                <div className="space-y-4">
                  {/* Search Bar & Bulk Actions */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search manager or PIN..."
                      className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={fetchSeasons}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>

                      <button
                        onClick={() => setConfirmClearAll(true)}
                        className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow"
                      >
                        <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                        <span>Purge All Seasons</span>
                      </button>
                    </div>
                  </div>

                  {/* Seasons Accordion / List */}
                  {seasonsData.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-2xl border border-slate-800">
                      No seasons or user teams found in the database.
                    </div>
                  ) : (
                    seasonsData.map((season) => {
                      const filteredTeams = (season.teams || []).filter(
                        (t) =>
                          t.team_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.manager_code.includes(searchQuery)
                      );

                      return (
                        <div
                          key={season.league_id}
                          className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-white">{season.league_name}</h4>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  {season.season_code}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {season.teams_count} fantasy team(s) registered
                              </p>
                            </div>

                            {season.teams_count > 0 && (
                              <button
                                onClick={() => setConfirmClearSeason(season)}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold rounded-lg transition flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Clear Season</span>
                              </button>
                            )}
                          </div>

                          {/* Teams Table */}
                          {filteredTeams.length === 0 ? (
                            <p className="text-[11px] text-slate-500 italic py-2">
                              No managers matching search in this season.
                            </p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-900">
                                    <th className="pb-1.5">Club & Kit</th>
                                    <th className="pb-1.5">PIN</th>
                                    <th className="pb-1.5">Formation</th>
                                    <th className="pb-1.5">Roster</th>
                                    <th className="pb-1.5 text-right">Points</th>
                                    <th className="pb-1.5 text-right pr-1">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-900">
                                  {filteredTeams.map((t) => (
                                    <tr key={t.team_id} className="hover:bg-slate-900/50">
                                      <td className="py-2 flex items-center gap-2">
                                        <JerseyKit kitConfig={t.kit_config} size={22} />
                                        <span className="font-bold text-slate-200">{t.team_name}</span>
                                      </td>
                                      <td className="py-2 font-mono text-emerald-400 font-bold">
                                        {t.manager_code}
                                      </td>
                                      <td className="py-2 font-mono text-slate-400 text-[11px]">
                                        {t.formation}
                                      </td>
                                      <td className="py-2 text-slate-400">
                                        {t.squad_count} players
                                      </td>
                                      <td className="py-2 text-right font-black text-amber-400">
                                        {t.total_points}
                                      </td>
                                      <td className="py-2 text-right pr-1">
                                        <button
                                          onClick={() => setConfirmDeleteTeam(t)}
                                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 transition"
                                          title="Delete user team"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: EXPORT & BACKUP */}
              {adminTab === 'export' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                      <FileDown className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">Export All User Data (JSON)</h3>
                      <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                        Dumps all seasons, fantasy clubs, squad rosters, custom kits, and embedded YouTube highlights into a structured JSON file.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 max-w-sm mx-auto text-xs text-slate-300 flex justify-around">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Seasons</span>
                        <strong className="text-base font-black text-white">{seasonsData.length}</strong>
                      </div>
                      <div className="w-px bg-slate-800" />
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Teams</span>
                        <strong className="text-base font-black text-emerald-400">{totalTeamsCount}</strong>
                      </div>
                    </div>

                    <button
                      onClick={handleExportData}
                      disabled={actionLoading}
                      className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 text-xs flex items-center gap-2 mx-auto"
                    >
                      <Download className="w-4 h-4" />
                      <span>{actionLoading ? 'Exporting...' : 'Download User Data Backup'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: SIMULATION & PIPELINE */}
              {adminTab === 'simulation' && (
                <div className="space-y-4">
                  {/* Match Simulation Sandbox */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <h3 className="text-xs font-black text-white uppercase tracking-wider">
                        Matchday Simulator (Sandbox Testing)
                      </h3>
                    </div>

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

                  {/* Database & Pipeline Controls */}
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
                </div>
              )}

              {/* TAB 4: AUDIT LOGS */}
              {adminTab === 'logs' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-slate-400" />
                      <span>API Audit Logs ({logs.length})</span>
                    </span>
                    <button
                      onClick={handleFetchLogs}
                      className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Refresh Logs
                    </button>
                  </div>

                  <div className="rounded-2xl bg-slate-950 border border-slate-800 p-3 max-h-60 overflow-y-auto font-mono text-[11px] space-y-1 text-slate-300">
                    {logs.length === 0 ? (
                      <p className="text-slate-500 text-center py-4">No recent API calls logged.</p>
                    ) : (
                      logs.map((l) => (
                        <div key={l.id} className="flex items-center justify-between py-1 border-b border-slate-900">
                          <span>[{l.timestamp}] {l.endpoint}</span>
                          <span className={`font-bold ${l.status_code === 200 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            HTTP {l.status_code}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>BeanLeague Admin Panel</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODALS */}

      {/* 1. Delete Individual Team Confirmation */}
      {confirmDeleteTeam && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <UserX className="w-6 h-6" />
              <h3 className="text-base font-black text-white">Delete User Team</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">{confirmDeleteTeam.team_name}</strong> (PIN: {confirmDeleteTeam.manager_code})?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteTeam(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => executeDeleteTeam(confirmDeleteTeam)}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow"
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Clear Season Teams Confirmation */}
      {confirmClearSeason && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-black text-white">Clear Season Teams</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete all <strong className="text-white">{confirmClearSeason.teams_count} team(s)</strong> registered in season <strong className="text-amber-400">{confirmClearSeason.season_code}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmClearSeason(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => executeClearSeason(confirmClearSeason)}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black shadow"
              >
                {actionLoading ? 'Clearing...' : 'Yes, Clear Season'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Wholesale User Data Purge Confirmation */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border-2 border-rose-600 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertOctagon className="w-7 h-7 text-rose-500" />
              <div>
                <h3 className="text-base font-black text-white">Wholesale User Data Purge</h3>
                <p className="text-[11px] text-rose-300/80">Destructive action across all seasons</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will <span className="text-rose-400 font-bold underline">permanently delete all user teams and rosters across ALL seasons</span>. Upstream sports data (players, matches) will be preserved.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Type <span className="text-rose-400 font-mono font-black">CLEAR</span> below to confirm:
              </label>
              <input
                type="text"
                value={clearAllInput}
                onChange={(e) => setClearAllInput(e.target.value)}
                placeholder="Type CLEAR..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-rose-300 placeholder-slate-600 focus:outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setConfirmClearAll(false);
                  setClearAllInput('');
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={executeClearAllUsers}
                disabled={actionLoading || clearAllInput.trim().toUpperCase() !== 'CLEAR'}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow"
              >
                {actionLoading ? 'Purging...' : 'Purge All User Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
