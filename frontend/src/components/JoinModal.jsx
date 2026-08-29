import React, { useState } from 'react';
import { KeyRound, Shield, Trophy, Copy, Check, ArrowRight, Sparkles, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const JoinModal = ({ isOpen, onClose }) => {
  const { login, joinLeague, authError } = useAuth();
  const [tab, setTab] = useState('create'); // 'create' | 'login' | 'pin_success'
  const [seasonCode, setSeasonCode] = useState('BARCA-2026');
  const [teamName, setTeamName] = useState('');
  const [managerPin, setManagerPin] = useState('');
  const [createdPin, setCreatedPin] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

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
      const resp = await joinLeague(seasonCode.trim().toUpperCase(), teamName.trim(), '4-3-3');
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

  const handleCopyPin = () => {
    navigator.clipboard.writeText(createdPin);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden">
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
              <p className="text-xs text-slate-400">Login-less soccer league for you and your friends</p>
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

        {/* PIN Created Success Screen */}
        {tab === 'pin_success' ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto animate-bounce-short">
              <Sparkles className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-lg font-black text-white">Team Created!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Save your 6-digit Manager PIN in your Notes app to re-access your team on any phone or iPad:
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
              onClick={onClose}
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
                Existing Manager (PIN)
              </button>
            </div>

            {/* Form */}
            {tab === 'create' ? (
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
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Shared code given by your league commissioner</p>
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
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
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
                  {isSubmitting ? 'Creating Team...' : 'Create Team & Get PIN'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
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
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the PIN you received when you created your team
                  </p>
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
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
