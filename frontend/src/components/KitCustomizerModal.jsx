import React, { useState } from 'react';
import { Shirt, Sparkles, Check, X, Palette, Shield, Save } from 'lucide-react';
import { JerseyKit, PATTERNS, BADGE_ICONS, PRO_PRESETS } from './JerseyKit';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

const COLOR_PALETTE = [
  '#10B981', '#059669', '#3B82F6', '#1D4ED8', '#8B5CF6', '#7C3AED',
  '#EC4899', '#DB2777', '#EF4444', '#B91C1C', '#F59E0B', '#D97706',
  '#0F172A', '#1E293B', '#334155', '#FFFFFF', '#64748B', '#000000'
];

export const KitCustomizerModal = ({ isOpen, onClose, initialKit, onSaved }) => {
  const { user } = useAuth();
  const [kit, setKit] = useState(
    initialKit || {
      primary_color: '#10B981',
      secondary_color: '#0F172A',
      pattern: 'solid',
      badge_icon: 'shield',
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (preset) => {
    setKit({
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      pattern: preset.pattern,
      badge_icon: preset.badge,
    });
  };

  const handleSaveKit = async () => {
    if (!user?.manager_code) return;
    try {
      setIsSaving(true);
      await api.updateTeamKit(user.manager_code, kit);
      setSaveSuccess(true);
      if (onSaved) onSaved(kit);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save kit:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Shirt className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Custom Kit Maker</h2>
              <p className="text-xs text-slate-400">Design your club jersey, pattern, and crest</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-6 overflow-y-auto pr-1">
          {/* Left Preview Column */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-950/80 rounded-2xl border border-slate-800/80 shadow-inner">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-4">
              Live Jersey Preview
            </span>

            <div className="my-2 p-4 rounded-2xl bg-slate-900/60 border border-slate-800/50 shadow-2xl flex items-center justify-center">
              <JerseyKit kitConfig={kit} size={150} />
            </div>

            <div className="text-center mt-4 space-y-1">
              <h4 className="text-sm font-bold text-white">
                {user?.team_name || 'My Fantasy XI'}
              </h4>
              <p className="text-[11px] text-emerald-400 font-mono">
                {PATTERNS.find((p) => p.id === kit.pattern)?.label || 'Custom'}
              </p>
            </div>
          </div>

          {/* Right Controls Column */}
          <div className="md:col-span-7 space-y-5">
            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Pro Club Presets</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {PRO_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleApplyPreset(preset)}
                    className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-400/60 text-left transition text-xs font-bold text-slate-300 hover:text-white flex flex-col items-center gap-1"
                  >
                    <div className="flex gap-1 items-center">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20"
                        style={{ backgroundColor: preset.secondary }}
                      />
                    </div>
                    <span className="text-[10px] text-center leading-tight truncate w-full">
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pattern Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Jersey Pattern
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PATTERNS.map((pat) => (
                  <button
                    key={pat.id}
                    onClick={() => setKit({ ...kit, pattern: pat.id })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                      kit.pattern === pat.id
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{pat.label}</span>
                    {kit.pattern === pat.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary & Secondary Color Palettes */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Primary Color
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={`p-${c}`}
                      onClick={() => setKit({ ...kit, primary_color: c })}
                      className={`w-6 h-6 rounded-lg border transition ${
                        kit.primary_color === c
                          ? 'border-emerald-400 scale-110 shadow-lg'
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Accent Color
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-slate-950 border border-slate-800">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={`s-${c}`}
                      onClick={() => setKit({ ...kit, secondary_color: c })}
                      className={`w-6 h-6 rounded-lg border transition ${
                        kit.secondary_color === c
                          ? 'border-emerald-400 scale-110 shadow-lg'
                          : 'border-white/20 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Badge Crest Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Team Crest Badge
              </label>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(BADGE_ICONS).map(([key, IconComp]) => (
                  <button
                    key={key}
                    onClick={() => setKit({ ...kit, badge_icon: key })}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      kit.badge_icon === key
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span className="capitalize text-[11px]">{key}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveKit}
            disabled={isSaving}
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2 text-xs"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Kit Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Apply Kit to Squad'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
