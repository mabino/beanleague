import React, { useState, useEffect } from 'react';
import { KeyRound, Shield, Trophy, Copy, Check, ArrowRight, Sparkles, X, Lock, RefreshCw, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export const JoinModal = ({ isOpen, onClose }) => {
  const { login, joinLeague, recoverTeam, authError } = useAuth();
  const [tab, setTab] = useState('create'); // 'create' | 'login' | 'recover' | 'pin_success'
  const [seasonCode, setSeasonCode] = useState('BARCA-2026');
  const [teamName, setTeamName] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [createdPin, setCreatedPin] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Recovery Questions state
  const [playersList, setPlayersList] = useState([]);
  const [showSecuritySetup, setShowSecuritySetup] = useState(true);
  const [recoveryP1, setRecoveryP1] = useState('');
  const [recoveryP2, setRecoveryP2] = useState('');
  const [recoveryP3, setRecoveryP3] = useState('');
  const [secretWord, setSecretWord] = useState('');

  // Recover Tab State
  const [recoverSeason, setRecoverSeason] = useState('BARCA-2026');
  const [recoverP1, setRecoverP1] = useState('');
  const [recoverP2, setRecoverP2] = useState('');
  const [recoverP3, setRecoverP3] = useState('');
  const [recoverWord, setRecoverWord] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.getPlayers({ limit: 80, sort_by: 'price_desc' })
        .then((data) => {
          setPlayersList(data || []);
          if (data && data.length >= 3 && !recoveryP1) {
            setRecoveryP1(data[0].id);
            setRecoveryP2(data[1].id);
            setRecoveryP3(data[2].id);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setLocalError('Please enter a team name.');
      return;
    }
    try {
      setIsSubmitting(true);
      setLocalError(null);
      const resp = await joinLeague(
        seasonCode.trim().toUpperCase(),
        teamName.trim(),
        '4-3-3',
        recoveryP1 ? parseInt(recoveryP1) : null,
        recoveryP2 ? parseInt(recoveryP2) : null,
        recoveryP3 ? parseInt(recoveryP3) : null,
        secretWord.trim()
      );
      setCreatedPin(resp.manager_code);
      setTab('pin_success');
    } catch (err) {
      setLocalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      setLocalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecover = async (e) => {
    e.preventDefault();
    if (!recoverP1 || !recoverP2 || !recoverP3 || !recoverWord.trim()) {
      setLocalError('Please select all 3 security players and enter your secret word.');
      return;
    }
    try {
      setIsSubmitting(true);
      setLocalError(null);
      const resp = await recoverTeam(
        recoverSeason.trim().toUpperCase(),
        parseInt(recoverP1),
        parseInt(recoverP2),
        parseInt(recoverP3),
        recoverWord.trim()
      );
      setCreatedPin(resp.manager_code);
      setTab('pin_success');
    } catch (err) {
      setLocalError(err.message);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden my-8">
        {/* Background glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">BeanLeague Fantasy</h2>
              <p className="text-xs text-slate-400">Login-less soccer league with Secret Player Recovery</p>
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

        {/* PIN Created / Recovered Success Screen */}
        {tab === 'pin_success' ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto animate-bounce-short">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Manager Code Ready!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Save your 6-digit PIN in your Notes app. You can also recover it anytime using your 3 Secret Players!
              </p>
            </div>

            {/* Big PIN Display */}
            <div className="p-4 bg-slate-950 rounded-2xl border-2 border-emerald-400/50 shadow-inner flex items-center justify-between">
              <div className="text-left">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">
                  Your Manager PIN
                </span>
                <span className="text-3xl font-black text-emerald-400 tracking-wider font-mono">
                  {createdPin}
                </span>
              </div>

              <button
                onClick={handleCopyPin}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy PIN'}
              </button>
            </div>

            <button
              onClick={async () => {
                await login(createdPin);
                onClose();
              }}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-sm"
            >
              <span>Build My Starting XI</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex bg-slate-950 p-1 rounded-2xl mb-6 border border-slate-800">
              <button
                onClick={() => {
                  setTab('create');
                  setLocalError(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  tab === 'create'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                New Team
              </button>
              <button
                onClick={() => {
                  setTab('login');
                  setLocalError(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  tab === 'login'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Login (PIN)
              </button>
              <button
                onClick={() => {
                  setTab('recover');
                  setLocalError(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  tab === 'recover'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Recover Code
              </button>
            </div>

            {/* CREATE TEAM TAB */}
            {tab === 'create' && (
              <form onSubmit={handleCreateTeam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Season Code (Room)
                  </label>
                  <input
                    type="text"
                    value={seasonCode}
                    onChange={(e) => setSeasonCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BARCA-2026"
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Thunder Strikers FC"
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                {/* Security Vault Section */}
                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                  <div
                    onClick={() => setShowSecuritySetup(!showSecuritySetup)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-bold text-white">
                        Security Vault (3 Players + Secret Word)
                      </span>
                    </div>
                    {showSecuritySetup ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>

                  {showSecuritySetup && (
                    <div className="space-y-2.5 pt-1">
                      <p className="text-[11px] text-slate-400">
                        Pick 3 players you'll remember in order. If you lose your 6-digit PIN, you can recover it instantly!
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">1st Player</label>
                          <select
                            value={recoveryP1}
                            onChange={(e) => setRecoveryP1(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400"
                          >
                            {playersList.map((p) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">2nd Player</label>
                          <select
                            value={recoveryP2}
                            onChange={(e) => setRecoveryP2(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400"
                          >
                            {playersList.map((p) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">3rd Player</label>
                          <select
                            value={recoveryP3}
                            onChange={(e) => setRecoveryP3(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400"
                          >
                            {playersList.map((p) => (
                              <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Secret Word</label>
                        <input
                          type="text"
                          value={secretWord}
                          onChange={(e) => setSecretWord(e.target.value)}
                          placeholder="e.g. pizza, dinosaur, galaxy"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {(localError || authError) && (
                  <p className="text-xs text-rose-400 font-semibold">{localError || authError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? 'Creating Team...' : 'Create Team & Get PIN'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* LOGIN PIN TAB */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Your 6-Digit Manager PIN
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={managerPin}
                      onChange={(e) => setManagerPin(e.target.value)}
                      placeholder="e.g. 849-201"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                      required
                    />
                  </div>
                </div>

                {(localError || authError) && (
                  <p className="text-xs text-rose-400 font-semibold">{localError || authError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? 'Logging in...' : 'Load My Team'}
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('recover');
                      setLocalError(null);
                    }}
                    className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    Forgot your PIN? Recover with 3 Secret Players
                  </button>
                </div>
              </form>
            )}

            {/* RECOVERY TAB */}
            {tab === 'recover' && (
              <form onSubmit={handleRecover} className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300">
                  Enter the 3 secret players in their exact order and the secret word you chose when creating your team.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Season Code (Room)
                  </label>
                  <input
                    type="text"
                    value={recoverSeason}
                    onChange={(e) => setRecoverSeason(e.target.value.toUpperCase())}
                    placeholder="e.g. BARCA-2026"
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">1st Player</label>
                    <select
                      value={recoverP1}
                      onChange={(e) => setRecoverP1(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400"
                      required
                    >
                      <option value="">Select #1...</option>
                      {playersList.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">2nd Player</label>
                    <select
                      value={recoverP2}
                      onChange={(e) => setRecoverP2(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400"
                      required
                    >
                      <option value="">Select #2...</option>
                      {playersList.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">3rd Player</label>
                    <select
                      value={recoverP3}
                      onChange={(e) => setRecoverP3(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-400"
                      required
                    >
                      <option value="">Select #3...</option>
                      {playersList.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Secret Word
                  </label>
                  <input
                    type="text"
                    value={recoverWord}
                    onChange={(e) => setRecoverWord(e.target.value)}
                    placeholder="Enter your secret word"
                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                {(localError || authError) && (
                  <p className="text-xs text-rose-400 font-semibold">{localError || authError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  {isSubmitting ? 'Verifying...' : 'Unlock My Manager Code'}
                  <Lock className="w-4 h-4" />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
