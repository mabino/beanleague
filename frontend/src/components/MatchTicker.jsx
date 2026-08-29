import React, { useState, useEffect } from 'react';
import { Radio, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../api/client';

export const MatchTicker = () => {
  const [fixtures, setFixtures] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const fetchFixtures = async () => {
      try {
        const data = await api.getFixtures();
        setFixtures(data);
      } catch (err) {
        console.error('Failed to load fixtures ticker:', err);
      }
    };

    fetchFixtures();
    const interval = setInterval(fetchFixtures, 30000);
    return () => clearInterval(interval);
  }, []);

  if (fixtures.length === 0) return null;

  const hasLiveMatches = fixtures.some((f) => f.status === 'In-Play');
  const liveCount = fixtures.filter((f) => f.status === 'In-Play').length;

  return (
    <div className="w-full bg-slate-950/90 border-y border-slate-800/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2">
        {/* Title / Mini Live Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          {hasLiveMatches ? (
            <div className="flex items-center gap-1 text-[11px] font-black text-rose-400 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              <span>LIVE ({liveCount})</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-wider">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span className="hidden xs:inline">FIXTURES:</span>
            </div>
          )}
        </div>

        {/* Scrollable Matches List (Visible when not collapsed) */}
        {!isCollapsed ? (
          <div className="flex-1 overflow-x-auto scrollbar-none py-0.5">
            <div className="flex items-center gap-2 min-w-max">
              {fixtures.map((fix) => {
                const isInPlay = fix.status === 'In-Play';
                const isFinished = fix.status === 'Finished';

                return (
                  <div
                    key={fix.id}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800 shadow-sm text-xs"
                  >
                    {/* Status Indicator */}
                    {isInPlay ? (
                      <span className="flex items-center gap-0.5 text-[9px] font-black px-1 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                        <span className="w-1 h-1 rounded-full bg-rose-500"></span>
                        LIVE
                      </span>
                    ) : isFinished ? (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-slate-800 text-slate-400">
                        FT
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        SCHED
                      </span>
                    )}

                    {/* Match Summary */}
                    <div className="flex items-center gap-1 text-[11px] font-bold text-white">
                      <span>{fix.home_team_name?.slice(0, 10)}</span>
                      <span className="px-1 py-0.2 rounded bg-slate-950 text-emerald-400 font-mono font-black text-[10px]">
                        {fix.home_score} - {fix.away_score}
                      </span>
                      <span>{fix.away_team_name?.slice(0, 10)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 text-[11px] text-slate-500 truncate text-center">
            {fixtures.length} matches tracked (Ticker minimized)
          </div>
        )}

        {/* Collapse / Shrink Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
          title={isCollapsed ? 'Expand live ticker' : 'Shrink ticker'}
        >
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
