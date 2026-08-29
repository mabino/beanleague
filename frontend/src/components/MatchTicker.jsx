import React, { useState, useEffect } from 'react';
import { Radio, Calendar, CheckCircle } from 'lucide-react';
import { api } from '../api/client';

export const MatchTicker = () => {
  const [fixtures, setFixtures] = useState([]);

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

  return (
    <div className="w-full bg-slate-950/80 border-y border-slate-800/80 py-2.5 px-4 overflow-x-auto scrollbar-none">
      <div className="flex items-center gap-4 max-w-7xl mx-auto min-w-max">
        {hasLiveMatches ? (
          <div className="flex items-center gap-1.5 text-xs font-black text-rose-400 uppercase tracking-widest pl-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>MATCHDAY LIVE:</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 uppercase tracking-widest pl-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>MATCHDAY FIXTURES:</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {fixtures.map((fix) => {
            const isInPlay = fix.status === 'In-Play';
            const isFinished = fix.status === 'Finished';

            return (
              <div
                key={fix.id}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm"
              >
                {/* Status Indicator */}
                {isInPlay ? (
                  <span className="flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    LIVE
                  </span>
                ) : isFinished ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    FT
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">
                    SCHED
                  </span>
                )}

                {/* Match Summary */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <span>{fix.home_team_name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-950 text-emerald-400 font-mono font-black">
                    {fix.home_score} - {fix.away_score}
                  </span>
                  <span>{fix.away_team_name}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
