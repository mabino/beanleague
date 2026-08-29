import React, { useState, useEffect, useMemo } from 'react';
import { KeyRound, Shield, Trophy, Copy, Check, ArrowRight, Sparkles, X, PlusCircle, Users, Globe, DollarSign, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const JoinModal = ({ isOpen, onClose }) => {
  const { login, joinLeague, createNewSeasonAndTeam, authError } = useAuth();
  
  // Tabs: 'join' | 'create_season' | 'login' | 'pin_success'
  const [tab, setTab] = useState('join');
  
  // Available Seasons fetched from backend
  const [availableLeagues, setAvailableLeagues] = useState([]);
  const [isLoadingLeagues, setIsLoadingLeagues] = useState(false);
  const [leagueSearch, setLeagueSearch] = useState('');

  // Mode in Join tab: 'pick' | 'custom'
  const [joinMode, setJoinMode] = useState('pick');
  const [selectedSeasonCode, setSelectedSeasonCode] = useState('BARCA-2026');
  const [customSeasonCode, setCustomSeasonCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [selectedFormation, setSelectedFormation] = useState('4-3-3');

  // Form states for Creating a New Season
  const [newSeasonName, setNewSeasonName] = useState('');
  const [newSeasonCode, setNewSeasonCode] = useState('');
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [newSalaryCap, setNewSalaryCap] = useState(100.0);
  const [newFounderTeamName, setNewFounderTeamName] = useState('');

  // Form state for Login
  const [managerPin, setManagerPin] = useState('');

  // Success state
  const [createdPin, setCreatedPin] = useState('');
  const [createdSeason, setCreatedSeason] = useState('');
  const [createdTeamName, setCreatedTeamName] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Fetch available seasons when modal opens
  const fetchLeagues = async () => {
    try {
      setIsLoadingLeagues(true);
      const leagues = await api.getLeagues();
      setAvailableLeagues(leagues);
      if (leagues.length > 0) {
        setSelectedSeasonCode(leagues[0].season_code);
      }
    } catch (err) {
      console.warn('Failed to fetch leagues:', err);
    } finally {
      setIsLoadingLeagues(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLeagues();
    }
  }, [isOpen]);

  // Auto-generate season code suggestion from season name
  const handleSeasonNameChange = (name) => {
    setNewSeasonName(name);
    if (!isCodeManuallyEdited) {
      const slug = name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 18);
      setNewSeasonCode(slug);
    }
  };

  // Validation helpers
  const isValidSeasonCode = (code) => /^[A-Za-z0-9_-]{2,20}$/.test(code.trim());
  const isCodeTaken = (code) => availableLeagues.some(l => l.season_code.toUpperCase() === code.trim().toUpperCase());

  // Filtered leagues for picker
  const filteredLeagues = useMemo(() => {
    if (!leagueSearch.trim()) return availableLeagues;
    const query = leagueSearch.toLowerCase();
    return availableLeagues.filter(l => 
      l.name.toLowerCase().includes(query) || 
      l.season_code.toLowerCase().includes(query)
    );
  }, [availableLeagues, leagueSearch]);

  if (!isOpen) return null;

  // Handle Joining Existing Season
  const handleJoinSeason = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setLocalError('Please enter your Fantasy Team Name.');
      return;
    }

    const codeToUse = (joinMode === 'custom' ? customSeasonCode : selectedSeasonCode).trim().toUpperCase();
    if (!codeToUse) {
      setLocalError('Please select or enter a valid Season Code.');
      return;
    }

    if (!isValidSeasonCode(codeToUse)) {
      setLocalError('Season Code must be 2-20 alphanumeric characters (letters, numbers, hyphens).');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError(null);
      const resp = await joinLeague(codeToUse, teamName.trim(), selectedFormation);
      setCreatedPin(resp.manager_code);
      setCreatedSeason(resp.season_code);
      setCreatedTeamName(resp.team_name);
      setTab('pin_success');
      fetchLeagues();
    } catch (err) {
      setLocalError(err.message || 'Failed to join season.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Creating a Brand New Season
  const handleCreateNewSeason = async (e) => {
    e.preventDefault();
    const cleanName = newSeasonName.trim();
    const cleanCode = newSeasonCode.trim().toUpperCase();
    const cleanFounder = newFounderTeamName.trim();

    if (cleanName.length < 2 || cleanName.length > 60) {
      setLocalError('League/Season Name must be between 2 and 60 characters.');
      return;
    }

    if (!isValidSeasonCode(cleanCode)) {
      setLocalError('Season Code must be 2-20 characters with letters, numbers, and hyphens.');
      return;
    }

    if (isCodeTaken(cleanCode)) {
      setLocalError(`Season Code '${cleanCode}' is already taken. Please enter a different code or switch to Join Season.`);
      return;
    }

    if (cleanFounder.length < 2 || cleanFounder.length > 40) {
      setLocalError('Your Founding Team Name must be between 2 and 40 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError(null);
      const resp = await createNewSeasonAndTeam(
        cleanCode,
        cleanName,
        parseFloat(newSalaryCap) || 100.0,
        cleanFounder,
        selectedFormation
      );
      setCreatedPin(resp.manager_code);
      setCreatedSeason(resp.season_code);
      setCreatedTeamName(resp.team_name);
      setTab('pin_success');
      fetchLeagues();
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
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
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
              <p className="text-[11px] text-slate-400">Join an existing league or create your own custom season</p>
            </div>
          </div>

          {onClose && tab !== 'pin_success' && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Selection */}
        {tab !== 'pin_success' && (
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800 mb-4 gap-1">
            <button
              onClick={() => {
                setTab('join');
                setLocalError(null);
              }}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'join' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
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
              className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'create_season' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
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
              className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer ${
                tab === 'login' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
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
            <form onSubmit={handleJoinSeason} className="space-y-4">
              {/* Join Mode Sub-Toggle: Pick from List vs Type Custom */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Fantasy Season
                  </span>
                  <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setJoinMode('pick')}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        joinMode === 'pick' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Browse List
                    </button>
                    <button
                      type="button"
                      onClick={() => setJoinMode('custom')}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        joinMode === 'custom' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Enter Code
                    </button>
                  </div>
                </div>

                {joinMode === 'pick' ? (
                  <div className="space-y-2">
                    {/* Search filter if many leagues */}
                    {availableLeagues.length > 3 && (
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                        <input
                          type="text"
                          value={leagueSearch}
                          onChange={(e) => setLeagueSearch(e.target.value)}
                          placeholder="Search season by name or code..."
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    )}

                    {/* Season list cards */}
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                      {filteredLeagues.map((l) => {
                        const isSelected = selectedSeasonCode === l.season_code;
                        return (
                          <div
                            key={l.id}
                            onClick={() => setSelectedSeasonCode(l.season_code)}
                            className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-emerald-500/15 border-emerald-500/60 shadow-sm'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white truncate">{l.name}</span>
                                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-emerald-300 border border-slate-700">
                                  {l.season_code}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {l.team_count || 0} teams • ${l.salary_cap}M Cap
                              </p>
                            </div>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                          </div>
                        );
                      })}

                      {filteredLeagues.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-500">
                          No matching seasons found.{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setTab('create_season');
                              setNewSeasonName(leagueSearch);
                            }}
                            className="text-emerald-400 font-bold hover:underline"
                          >
                            Create "{leagueSearch}"?
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={customSeasonCode}
                      onChange={(e) => setCustomSeasonCode(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                      placeholder="e.g. BARCA-2026 or CHAMPIONS-26"
                      maxLength={20}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-emerald-400 uppercase placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                      required
                    />
                    <p className="text-[10px] text-slate-500">
                      Enter the shareable Season Code given by your friend or league admin.
                    </p>
                  </div>
                )}
              </div>

              {/* Team Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Your Fantasy Club Name
                </label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Galactic Strikers FC"
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {/* Formation Choice */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Initial Tactical Formation
                </label>
                <div className="flex gap-2">
                  {['4-3-3', '3-5-2', '4-4-2', '3-4-3'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedFormation(f)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                        selectedFormation === f
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {localError && (
                <div className="flex items-center gap-1.5 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{localError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-lg transition active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isSubmitting ? 'Joining Season...' : 'Join Season & Pick Starting XI'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* TAB 2: CREATE A NEW CUSTOM SEASON */}
          {tab === 'create_season' && (
            <form onSubmit={handleCreateNewSeason} className="space-y-3.5">
              {/* Arbitrary Season Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Arbitrary League / Season Name
                </label>
                <input
                  type="text"
                  value={newSeasonName}
                  onChange={(e) => handleSeasonNameChange(e.target.value)}
                  placeholder="e.g. Sunday Champions League 2026"
                  maxLength={60}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {/* Season Code & Salary Cap in 2 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Season Code
                    </label>
                    {newSeasonCode && isValidSeasonCode(newSeasonCode) && !isCodeTaken(newSeasonCode) && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> Available
                      </span>
                    )}
                    {newSeasonCode && isCodeTaken(newSeasonCode) && (
                      <span className="text-[10px] text-rose-400 font-bold">Taken</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={newSeasonCode}
                    onChange={(e) => {
                      setIsCodeManuallyEdited(true);
                      setNewSeasonCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                    }}
                    placeholder="CHAMPIONS-26"
                    maxLength={20}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-400 uppercase placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Salary Cap ($M)
                  </label>
                  <div className="flex items-center gap-1">
                    {[80, 100, 120].map((cap) => (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => setNewSalaryCap(cap)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold transition border ${
                          newSalaryCap === cap
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        ${cap}M
                      </button>
                    ))}
                    <input
                      type="number"
                      step="5"
                      min="50"
                      max="300"
                      value={newSalaryCap}
                      onChange={(e) => setNewSalaryCap(e.target.value)}
                      className="w-16 px-1.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-white text-center focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Founding Team Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Your Founding Club Name
                </label>
                <input
                  type="text"
                  value={newFounderTeamName}
                  onChange={(e) => setNewFounderTeamName(e.target.value)}
                  placeholder="e.g. Golden Lions FC"
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>

              {/* Initial Formation */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Starting Tactical Shape
                </label>
                <div className="flex gap-2">
                  {['4-3-3', '3-5-2', '4-4-2'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSelectedFormation(f)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition ${
                        selectedFormation === f
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {localError && (
                <div className="flex items-center gap-1.5 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{localError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-lg transition active:scale-95 text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
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
                <div className="flex items-center gap-1.5 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{localError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl border border-slate-700 shadow-lg transition active:scale-95 text-xs sm:text-sm cursor-pointer"
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
                <h3 className="text-base sm:text-lg font-black text-white">{createdTeamName || 'Team Ready!'}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Season: <strong className="text-emerald-400 font-mono">{createdSeason}</strong>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Save your 6-digit Manager PIN to access your squad from any phone or computer:
                </p>
              </div>

              {/* PIN display box */}
              <div className="p-4 bg-slate-950 border-2 border-emerald-500/40 rounded-2xl flex items-center justify-between gap-2 shadow-inner">
                <span className="text-xl sm:text-2xl font-mono font-black text-emerald-400 tracking-widest pl-2">
                  {createdPin}
                </span>
                <button
                  onClick={handleCopyPin}
                  className="px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy PIN'}</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl shadow-lg transition active:scale-95 text-xs sm:text-sm cursor-pointer"
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
