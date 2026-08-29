import React, { useState } from 'react';
import { DollarSign, Save, AlertCircle, CheckCircle2, Crown, Users, ChevronDown, ChevronUp } from 'lucide-react';

export const BudgetBar = ({
  totalCost = 0,
  salaryCap = 100.0,
  startingCount = 0,
  benchCount = 0,
  hasCaptain = false,
  onSaveRoster,
  isSaving = false,
  validationErrors = [],
}) => {
  const [isChecklistExpanded, setIsChecklistExpanded] = useState(false);

  const remaining = Math.round((salaryCap - totalCost) * 10) / 10;
  const percentUsed = Math.min(100, (totalCost / salaryCap) * 100);
  const isOverBudget = totalCost > salaryCap;
  const isStartingComplete = startingCount === 11;
  const canSave = !isOverBudget && isStartingComplete && hasCaptain && !isSaving;

  return (
    <div className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl p-2.5 sm:p-4 shadow-xl backdrop-blur-md mb-2.5 sm:mb-5">
      {/* Top Row: Budget & Save Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-4">
        {/* Budget Counter & Bar */}
        <div className="flex-1 w-full space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="p-1 sm:p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div>
                <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Budget
                </span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-base sm:text-xl font-black ${isOverBudget ? 'text-rose-400' : 'text-white'}`}>
                    ${totalCost.toFixed(1)}M
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">
                    / ${salaryCap.toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                Left
              </span>
              <span className={`text-sm sm:text-lg font-extrabold ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${remaining.toFixed(1)}M
              </span>
            </div>
          </div>

          {/* Visual Budget Progress Bar */}
          <div className="w-full h-2 sm:h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget
                  ? 'bg-rose-500 shadow-rose-500/50 shadow-lg animate-pulse'
                  : percentUsed > 90
                  ? 'bg-amber-400'
                  : 'bg-emerald-500 shadow-emerald-500/30 shadow-md'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>

        {/* Action / Save Button */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <button
            onClick={onSaveRoster}
            disabled={!canSave}
            className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wide shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all duration-200
              ${
                canSave
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/30 hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
          >
            <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            {isSaving ? 'Saving...' : 'Save Team'}
          </button>
        </div>
      </div>

      {/* Checklist / Compact Status Bar */}
      <div className="mt-2 sm:mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-1 text-[11px]">
        {/* Compact summary badges visible on all viewports */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 ${isStartingComplete ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
            {isStartingComplete ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {startingCount}/11 Starters
          </span>

          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1">
            <Users className="w-3 h-3 text-emerald-400" />
            {benchCount}/4 Bench
          </span>

          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 ${hasCaptain ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400'}`}>
            <Crown className="w-3 h-3" />
            {hasCaptain ? 'Captain' : 'No Captain'}
          </span>
        </div>

        {/* Toggle full checklist details on mobile / tablet */}
        <button
          onClick={() => setIsChecklistExpanded(!isChecklistExpanded)}
          className="text-[10px] font-bold text-slate-400 hover:text-white transition flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-slate-800"
        >
          <span>{isChecklistExpanded ? 'Hide Details' : 'Details'}</span>
          {isChecklistExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expanded Checklist Details */}
      {isChecklistExpanded && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-2 border-t border-slate-800/50 text-[11px] animate-fade-in">
          <div className={`flex items-center gap-1.5 font-medium ${isStartingComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
            {isStartingComplete ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>11 Starting Starters</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Up to 4 Substitutes</span>
          </div>

          <div className={`flex items-center gap-1.5 font-medium ${hasCaptain ? 'text-emerald-400' : 'text-amber-400'}`}>
            {hasCaptain ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>Captain Selected (2x)</span>
          </div>

          <div className={`flex items-center gap-1.5 font-medium ${!isOverBudget ? 'text-emerald-400' : 'text-rose-400'}`}>
            {!isOverBudget ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{isOverBudget ? 'Budget Exceeded' : 'Under $100M Cap'}</span>
          </div>
        </div>
      )}

      {/* Errors Banner */}
      {validationErrors.length > 0 && (
        <div className="mt-2.5 p-2 bg-rose-950/60 border border-rose-800/60 rounded-xl text-[11px] text-rose-300">
          <p className="font-bold mb-0.5 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Please fix before saving:
          </p>
          <ul className="list-disc list-inside space-y-0.5 opacity-90">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
