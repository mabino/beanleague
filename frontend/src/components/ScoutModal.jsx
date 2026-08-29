import React, { useState, useEffect } from 'react';
import { Binoculars, Trophy, X, Shield, User, Sparkles, Video } from 'lucide-react';
import { api, API_BASE } from '../api/client';
import { JerseyKit } from './JerseyKit';
import { PlayerMediaModal } from './PlayerMediaModal';

export const ScoutModal = ({ isOpen, onClose, teamId }) => {
  const [teamData, setTeamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    if (isOpen && teamId) {
      setIsLoading(true);
      setError(null);
      api.getTeamPublic(teamId)
        .then((data) => {
          setTeamData(data);
        })
        .catch((err) => {
          setError(err.message || 'Failed to scout team.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, teamId]);

  if (!isOpen) return null;

  const startingXI = teamData?.players?.filter((p) => p.is_starting_xi) || [];
  const bench = teamData?.players?.filter((p) => !p.is_starting_xi) || [];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <Binoculars className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white">
                    {teamData?.team_name || 'Scouting Report'}
                  </h2>
                  {teamData?.formation && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                      {teamData.formation}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {teamData?.league_name || 'BeanLeague'} • {teamData?.total_points || 0} Total Points
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {teamData?.kit_config && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                  <JerseyKit kitConfig={teamData.kit_config} size={28} />
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    Club Kit
                  </span>
                </div>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="py-6 overflow-y-auto pr-1 space-y-6">
            {isLoading ? (
              <div className="py-16 text-center text-slate-400 font-bold text-xs">
                Scanning team tactics and highlight reels...
              </div>
            ) : error ? (
              <div className="py-16 text-center text-rose-400 font-bold text-xs">{error}</div>
            ) : (
              <>
                {/* Starting XI Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Trophy className="w-4 h-4" />
                      <span>Starting XI ({startingXI.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Click any player to inspect stats & highlight reels
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {startingXI.map((p) => {
                      const photoSrc = `${API_BASE}/api/players/${p.player_id || p.id}/photo`;
                      const videoCount = p.youtube_links?.length || 0;

                      return (
                        <div
                          key={p.player_id}
                          onClick={() => setSelectedPlayer(p)}
                          className="p-3 rounded-2xl bg-slate-950 border border-slate-800/80 hover:border-emerald-400/60 transition cursor-pointer shadow-sm hover:scale-[1.02] flex flex-col justify-between relative group"
                        >
                          {/* Captain badge */}
                          {p.is_captain === 1 && (
                            <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] flex items-center justify-center shadow">
                              C
                            </span>
                          )}

                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
                              <img
                                src={photoSrc}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-xs font-bold text-white truncate block">
                                {p.short_name || p.name}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate">
                                {p.real_team_name} • {p.position}
                              </span>
                            </div>
                          </div>

                          {/* Footer Info & YouTube Tag */}
                          <div className="mt-2.5 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px]">
                            <span className="font-mono text-emerald-400 font-bold">
                              ${p.current_price?.toFixed(1)}M
                            </span>

                            {videoCount > 0 ? (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                                <Video className="w-3 h-3" />
                                <span>{videoCount}</span>
                              </span>
                            ) : (
                              <span className="text-slate-600 font-medium">Scout</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bench Section */}
                {bench.length > 0 && (
                  <div>
                    <span className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 block">
                      Substitutes Bench ({bench.length})
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {bench.map((p) => {
                        const photoSrc = `${API_BASE}/api/players/${p.player_id || p.id}/photo`;
                        const videoCount = p.youtube_links?.length || 0;

                        return (
                          <div
                            key={p.player_id}
                            onClick={() => setSelectedPlayer(p)}
                            className="p-2.5 rounded-2xl bg-slate-950/70 border border-slate-800/60 hover:border-slate-700 transition cursor-pointer flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 overflow-hidden shrink-0">
                                <img
                                  src={photoSrc}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <span className="text-xs font-bold text-slate-300 truncate block">
                                  {p.short_name || p.name}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {p.position} • ${p.current_price?.toFixed(1)}M
                                </span>
                              </div>
                            </div>

                            {videoCount > 0 && (
                              <Video className="w-3.5 h-3.5 text-rose-400 shrink-0 ml-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Player Media Modal in Read-Only Mode */}
      {selectedPlayer && (
        <PlayerMediaModal
          isOpen={Boolean(selectedPlayer)}
          onClose={() => setSelectedPlayer(null)}
          player={selectedPlayer}
          isReadOnly={true}
        />
      )}
    </>
  );
};
