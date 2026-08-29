import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Users, Eye, Sparkles, RefreshCw, Binoculars } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { JerseyKit } from './JerseyKit';

export const LiveLeaderboard = ({ seasonCode = 'BARCA-2026', onSelectTeam }) => {
  const { team: myTeam } = useAuth();
  const [standings, setStandings] = useState([]);
  const [leagueInfo, setLeagueInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStandings = async () => {
    try {
      setIsLoading(true);
      const data = await api.getStandings(seasonCode);
      setStandings(data.standings);
      setLeagueInfo(data);
    } catch (err) {
      console.error('Failed to load standings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStandings();
  }, [seasonCode]);

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="text-xl">🥇</span>;
    if (rank === 2) return <span className="text-xl">🥈</span>;
    if (rank === 3) return <span className="text-xl">🥉</span>;
    return (
      <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center">
        {rank}
      </span>
    );
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl sm:rounded-3xl p-3 sm:p-5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-2.5 bg-amber-500/20 text-amber-400 rounded-xl sm:rounded-2xl border border-amber-500/30">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-black text-white tracking-wide">
              {leagueInfo?.league_name || 'League Standings'}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-400">
              Season: <span className="font-mono text-emerald-400 font-bold">{seasonCode}</span> • Live Matchday Scores
            </p>
          </div>
        </div>

        <button
          onClick={fetchStandings}
          disabled={isLoading}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          title="Refresh Standings"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <th className="pb-2 pl-1.5 font-bold">Rank</th>
              <th className="pb-2 font-bold">Club & Kit</th>
              <th className="pb-2 font-bold hidden sm:table-cell">Formation</th>
              <th className="pb-2 font-bold hidden md:table-cell">Players</th>
              <th className="pb-2 text-right pr-2 font-bold">Points</th>
              <th className="pb-2 text-right pr-1 font-bold">Scout</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {isLoading && standings.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-500 text-xs">
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  Loading live leaderboard...
                </td>
              </tr>
            ) : standings.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-500 text-xs">
                  No teams in this league yet. Be the first to create one!
                </td>
              </tr>
            ) : (
              standings.map((team) => {
                const isMyTeam = myTeam && myTeam.id === team.team_id;
                return (
                  <tr
                    key={team.team_id}
                    className={`transition-all duration-200 ${
                      isMyTeam
                        ? 'bg-emerald-950/40 hover:bg-emerald-950/60 font-semibold'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-2 sm:py-3 pl-1.5 flex items-center gap-1.5">
                      {getRankBadge(team.rank)}
                    </td>

                    {/* Team & Kit */}
                    <td className="py-2 sm:py-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="shrink-0 p-0.5 sm:p-1 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                          <JerseyKit kitConfig={team.kit_config} size={22} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onSelectTeam && onSelectTeam(team.team_id)}
                              className="font-extrabold text-white hover:text-emerald-400 text-left transition text-xs sm:text-sm truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none"
                            >
                              {team.team_name}
                            </button>
                            {isMyTeam && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                YOU
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono">
                            PIN: {team.manager_code_masked}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Formation */}
                    <td className="py-2 sm:py-3 hidden sm:table-cell">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {team.formation}
                      </span>
                    </td>

                    {/* Squad Count */}
                    <td className="py-2 sm:py-3 text-[11px] text-slate-400 hidden md:table-cell">
                      {team.player_count}/15
                    </td>

                    {/* Points */}
                    <td className="py-2 sm:py-3 text-right pr-2">
                      <span className="text-sm sm:text-base font-black text-emerald-400">
                        {team.total_points}
                      </span>
                    </td>

                    {/* Scout button */}
                    <td className="py-2 sm:py-3 text-right pr-1">
                      <button
                        onClick={() => onSelectTeam && onSelectTeam(team.team_id)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 transition flex items-center gap-1 text-[11px] font-bold shadow ml-auto"
                        title="Scout Team Pitch & Highlights"
                      >
                        <Binoculars className="w-3 h-3" />
                        <span className="hidden xs:inline">Scout</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
