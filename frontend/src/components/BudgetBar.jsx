import React from 'react';
import { DollarSign, Save, AlertCircle, CheckCircle2, Crown, Users } from 'lucide-react';

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
  const remaining = Math.round((salaryCap - totalCost) * 10) / 10;
  const percentUsed = Math.min(100, (totalCost / salaryCap) * 100);
  const isOverBudget = totalCost > salaryCap;
  const isStartingComplete = startingCount === 11;
  const canSave = !isOverBudget && isStartingComplete && hasCaptain && !isSaving;

  return (
    <div className="w-full bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md mb-6">
      {/* Top Row: Budget & Save Button */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Budget Counter */}
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                  Team Salary Cap
                </span>
                <div className="flex items-baseline gap-2">
                  <span className={`text-xl sm:text-2xl font-black ${isOverBudget ? 'text-rose-400' : 'text-white'}`}>
                    ${totalCost.toFixed(1)}M
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    / ${salaryCap.toFixed(1)}M Limit
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                Remaining Budget
              </span>
              <span className={`text-lg sm:text-xl font-extrabold ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${remaining.toFixed(1)}M
              </span>
            </div>
          </div>

          {/* Visual Budget Progress Bar */}
          <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
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
        <div className="w-full md:w-auto flex items-center gap-2">
          <button
            onClick={onSaveRoster}
            disabled={!canSave}
            className={`w-full md:w-auto px-6 py-3 rounded-xl font-black text-sm tracking-wide shadow-lg flex items-center justify-center gap-2 transition-all duration-200
              ${
                canSave
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/30 hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving Roster...' : 'Save Roster'}
          </button>
        </div>
      </div>

      {/* Checklist Indicators Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-xs">
        {/* Starting XI Check */}
        <div className={`flex items-center gap-1.5 font-medium ${isStartingComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isStartingComplete ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>Starting XI: {startingCount}/11</span>
        </div>

        {/* Bench Check */}
        <div className="flex items-center gap-1.5 text-slate-300 font-medium">
          <Users className="w-4 h-4 text-emerald-400" />
          <span>Bench: {benchCount}/4</span>
        </div>

        {/* Captain Check */}
        <div className={`flex items-center gap-1.5 font-medium ${hasCaptain ? 'text-emerald-400' : 'text-amber-400'}`}>
          {hasCaptain ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>Captain Selected</span>
        </div>

        {/* Budget Check */}
        <div className={`flex items-center gap-1.5 font-medium ${!isOverBudget ? 'text-emerald-400' : 'text-rose-400'}`}>
          {!isOverBudget ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{isOverBudget ? 'Budget Exceeded' : 'Budget Valid'}</span>
        </div>
      </div>

      {/* Errors Banner */}
      {validationErrors.length > 0 && (
        <div className="mt-3 p-2.5 bg-rose-950/60 border border-rose-800/60 rounded-xl text-xs text-rose-300">
          <p className="font-bold mb-1 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Please fix the following before saving:
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
