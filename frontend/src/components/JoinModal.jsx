import React, { useState, useEffect } from 'react';
import { KeyRound, Shield, Trophy, Copy, Check, ArrowRight, Sparkles, X, PlusCircle, Users, Globe, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const JoinModal = ({ isOpen, onClose }) => {
  const { login, joinLeague, createNewSeasonAndTeam, authError } = useAuth();
  
  // Tabs: 'join' | 'create_season' | 'login' | 'pin_success'
  const [tab, setTab] = useState('join');
  
  // Available Seasons fetched from backend
  const [availableLeagues, setAvailableLeagues] = useState([]);
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(false);

  // Form states for Joining
  const [joinSeasonCode, setJoinSeasonCode] = useState('BARCA-2026');
  const [customSeasonCode, setCustomSeasonCode] = useState('');
  const [isUsingCustomCode, setIsUsingCustomCode] = useState(false);
  const [teamName, setTeamName] = useState('');

  // Form states for Creating a New Season
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonCode, setNewSeasonCode] = useState('');
  const [newSalaryCap, setNewSalaryCap] = useState(100.0);
  const [newFounderTeamName, setNewFounderTeamName] = useState('');

  // Form state for Login
  const [managerPin, setManagerPin] = useState('');

  // Success state
  const [createdPin, setCreatedPin] = useState('');
  const [createdSeason, setCreatedSeason] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Fetch available seasons when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchLeagues = async () => {
        try {
          setIsLoadingLeagues(true);
          const leagues = await api.getLeagues();
          setAvailableLeagues(leagues);
          if (leagues.length > 0 && !isUsingCustomCode) {
            setJoinSeasonCode(leagues[0].season_code);
          }
        } catch (err) {
          console.warn('Failed to fetch leagues:', err);
        } finally {
          setIsLoadingLeagues(false);
        }
      };
      fetchLeagues();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Joining Existing Season
  const handleJoinSeason = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setLocalError('Please enter your Fantasy Team Name.');
      return;
    }

    const codeToUse = (isUsingCustomCode ? customSeasonCode : joinSeasonCode).trim().toUpperCase();
    if (!codeToUse) {
      setLocalError('Please select or enter a Season Code.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError(null);
      const resp = await joinLeague(codeToUse, teamName.trim(), '4-3-3');
      setCreatedPin(resp.manager_code);
      setCreatedSeason(resp.season_code);
      setTab('pin_success');
    } catch (err) {
      setLocalError(err.message || 'Failed to join season.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Creating a Brand New Season
  const handleCreateNewSeason = async (e) => {
    e.preventDefault();
    if (!newSeasonName.trim()) {
      setLocalError('Please enter a League/Season Name.');
      return;
    }
    if (!newSeasonCode.trim()) {
      setLocalError('Please enter a Season Code (e.g. CHAMPIONS-2026).');
      return;
    }
    if (!newFounderTeamName.trim()) {
      setLocalError('Please enter your Founding Team Name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError(null);
      const formattedCode = newSeasonCode.trim().toUpperCase().replace(/\s+/g, '-');
      const resp = await createNewSeasonAndTeam(
        formattedCode,
        newSeasonName.trim(),
        parseFloat(newSalaryCap) || 100.0,
        newFounderTeamName.trim(),
        '4-3-3'
      );
      setCreatedPin(resp.manager_code);
      setCreatedSeason(resp.season_code);
      setTab('pin_success');
    } catch (err) {
      setLocalError(err.message || 'Failed to create season.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Login via Manager PIN
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!managerPin.trim()) {
      setLocalError('Please enter your 6-digit Manager PIN.');
      return;
    }
    try {
      setIsSubmitting(true);
      setLocalError(null);
      await login(managerPin.trim());
      onClose();
    } catch (err) {
      setLocalError(err.message || 'Invalid PIN or team not found.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyPin = () => {
    navigator.clipboard.writeText(createdPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Background glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">BeanLeague Fantasy</h2>
              <p className="text-[11px] text-slate-400">Custom fantasy soccer seasons & leagues</p>
            </div>
          </div>

          {onClose && tab !== 'pin_success' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Selection (When not in success screen) */}
        {tab !== 'pin_success' && (
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-4 gap-1">
            <button
              onClick={() => {
                setTab('join');
                setLocalError(null);
              }}
              className={`flex-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition flex items-center justify-center gap-1 ${
                tab === 'join' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Join Season</span>
            </button>

            <button
              onClick={() => {
                setTab('create_season');
                setLocalError(null);
              }}
              className={`flex-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition flex items-center justify-center gap-1 ${
                tab === 'create_season' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Season</span>
            </button>

            <button
              onClick={() => {
                setTab('login');
                setLocalError(null);
              }}
              className={`flex-1 py-1.5 rounded-xl text-[11px] sm:text-xs font-black transition flex items-center justify-center gap-1 ${
                tab === 'login' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>My PIN</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="overflow-y-auto pr-0.5 space-y-4">
          {/* TAB 1: JOIN AN EXISTING SEASON */}
          {tab === 'join' && (
            <form onSubmit={handleJoinSeason} className="space-y-3.5">
              {/* Season Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Season / League
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsUsingCustomCode(!isUsingCustomCode)}
                    className="text-[10px] text-emerald-400 font-bold hover:underline"
                  >
                    {isUsingCustomCode ? 'Choose from list' : 'Enter private code'}
                  </button>
                </div>

                {!isUsingCustomCode ? (
                  <select
                    value={joinSeasonCode}
                    onChange={(e) => setJoinSeasonCode(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-400"
                  >
                    {availableLeagues.map((l) => (
                      <option key={l.id} value={l.season_code}>
                        {l.name} ({l.season_code}) • {l.team_count} team(s)
                      </option>
                    ))}
                    {availableLeagues.length === 0 && (
                      <option value="BARCA-2026">Barca & Friends (BARCA-2026)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={customSeasonCode}
                    onChange={(e) => setCustomSeasonCode(e.target.value.toUpperCase())}
                    placeholder="Enter Season Code (e.g. BARCA-2026)"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-slate-600 uppercase focus:outline-none focus:border-emerald-400"
                    required
                  />
                )}
              </div>

              {/* Team Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Your Fantasy Team Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Galactic Strikers FC"
                  maxLength={30}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {localError && (
                <p className="text-xs text-rose-400 font-semibold">{localError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-lg transition active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Creating Team...' : 'Join Season & Pick Players'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: CREATE A NEW SEASON */}
          {tab === 'create_season' && (
            <form onSubmit={handleCreateNewSeason} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  New League / Season Name
                </label>
                <input
                  type="text"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  placeholder="e.g. Champions League 2026"
                  maxLength={40}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Season Code (Shareable)
                  </label>
                  <input
                    type="text"
                    value={newSeasonCode}
                    onChange={(e) => setNewSeasonCode(e.target.value.toUpperCase())}
                    placeholder="UCL-2026"
                    maxLength={16}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 uppercase placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Salary Cap ($M)
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="50"
                    max="300"
                    value={newSalaryCap}
                    onChange={(e) => setNewSalaryCap(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Your Founding Club Name
                </label>
                <input
                  type="text"
                  value={newFounderTeamName}
                  onChange={(e) => setNewFounderTeamName(e.target.value)}
                  placeholder="e.g. Thunder FC"
                  maxLength={30}
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {localError && (
                <p className="text-xs text-rose-400 font-semibold">{localError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-lg transition active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                <span>{isSubmitting ? 'Launching Season...' : 'Launch Season & Create Team'}</span>
                <Sparkles className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 3: LOGIN WITH MANAGER PIN */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Enter Your 6-Digit Manager PIN
                </label>
                <input
                  type="text"
                  value={managerPin}
                  onChange={(e) => setManagerPin(e.target.value)}
                  placeholder="e.g. 915-762"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-center text-base sm:text-lg font-mono text-emerald-400 placeholder-slate-600 tracking-widest focus:outline-none focus:border-emerald-400"
                  autoFocus
                  required
                />
              </div>

              {localError && (
                <p className="text-xs text-rose-400 font-semibold text-center">{localError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 shadow-lg transition active:scale-95 text-xs sm:text-sm"
              >
                {isSubmitting ? 'Logging In...' : 'Access My Team'}
              </button>
            </form>
          )}

          {/* SUCCESS SCREEN: PIN DISPLAY */}
          {tab === 'pin_success' && (
            <div className="text-center py-2 space-y-4">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto animate-bounce-short">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black text-white">Season & Team Ready!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Season: <strong className="text-emerald-400 font-mono">{createdSeason}</strong>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Save your 6-digit Manager PIN to access your squad from any device:
                </p>
              </div>

              {/* PIN display box */}
              <div className="p-4 bg-slate-950 border-2 border-emerald-500/40 rounded-2xl flex items-center justify-between gap-2 shadow-inner">
                <span className="text-xl sm:text-2xl font-mono font-black text-emerald-400 tracking-widest pl-2">
                  {createdPin}
                </span>
                <button
                  onClick={handleCopyPin}
                  className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy PIN'}</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-lg transition active:scale-95 text-xs sm:text-sm"
              >
                Let's Build My Starting XI!
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
