import React from 'react';
import { LayoutGrid } from 'lucide-react';

const FORMATIONS = [
  { name: '4-3-3', label: '4-3-3 (Attack)', desc: '4 DEF, 3 MID, 3 FWD' },
  { name: '3-5-2', label: '3-5-2 (Midfield Control)', desc: '3 DEF, 5 MID, 2 FWD' },
  { name: '4-4-2', label: '4-4-2 (Classic)', desc: '4 DEF, 4 MID, 2 FWD' },
  { name: '3-4-3', label: '3-4-3 (All Out Attack)', desc: '3 DEF, 4 MID, 3 FWD' },
  { name: '5-3-2', label: '5-3-2 (Solid Defense)', desc: '5 DEF, 3 MID, 2 FWD' },
  { name: '4-2-3-1', label: '4-2-3-1 (Tactical)', desc: '4 DEF, 5 MID, 1 FWD' },
];

export const FormationSelector = ({ value = '4-3-3', onChange }) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider px-1">
        <LayoutGrid className="w-4 h-4 text-emerald-400" />
        <span>Formation:</span>
      </div>
      {FORMATIONS.map((f) => (
        <button
          key={f.name}
          onClick={() => onChange(f.name)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap border
            ${
              value === f.name
                ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 scale-105'
                : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
            }`}
        >
          {f.name}
        </button>
      ))}
    </div>
  );
};
