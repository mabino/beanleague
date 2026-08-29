import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, Check, Zap, DollarSign, TrendingUp, Sparkles, X } from 'lucide-react';
import { api } from '../api/client';

const POSITION_FILTERS = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];

export const PlayerMarket = ({
  selectedSquadIds = new Set(),
  onAddPlayer,
  onClose,
  targetPosition = null,
  targetSlotType = 'STARTING', // 'STARTING' or 'BENCH'
}) => {
  const [players, setPlayers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePos, setActivePos] = useState(targetPosition || 'ALL');
  const [sortBy, setSortBy] = useState('price_desc');

  useEffect(() => {
    if (targetPosition) {
      setActivePos(targetPosition);
    }
  }, [targetPosition]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        setIsLoading(true);
        const data = await api.getPlayers({
          position: activePos !== 'ALL' ? activePos : undefined,
          search: search.trim() || undefined,
          sort_by: sortBy,
        });
        setPlayers(data);
      } catch (err) {
        console.error('Failed to load players for transfer market:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayers();
  }, [activePos, search, sortBy]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wide">
                Transfer Market
              </h2>
              <p className="text-xs text-slate-400">
                {targetSlotType === 'BENCH' ? 'Adding to Bench' : (targetPosition ? `Selecting ${targetPosition}` : 'Scout World Stars')}
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search star players (e.g. Yamal, Haaland, Bellingham)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition"
          />
        </div>

        {/* Position Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {POSITION_FILTERS.map((pos) => (
            <button
              key={pos}
              onClick={() => setActivePos(pos)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap
                ${
                  activePos === pos
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
            >
              {pos}
            </button>
          ))}

          {/* Sort Selector */}
          <div className="ml-auto flex items-center gap-1 text-xs">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-400"
            >
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="points_desc">Fantasy Points</option>
              <option value="name_asc">Name (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs">Loading star players from local database...</p>
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No players found matching your search.
          </div>
        ) : (
          players.map((p) => {
            const isOwned = selectedSquadIds.has(p.id);
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3 rounded-2xl border transition-all duration-200
                  ${
                    isOwned
                      ? 'bg-slate-950/40 border-slate-800/40 opacity-60'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950 shadow-md'
                  }`}
              >
                {/* Player Info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center font-bold text-white text-xs border border-white/10 shadow-inner flex-shrink-0">
                    <img
                      src={p.photo_url || `/beanleague/api/players/${p.id}/photo`}
                      alt={p.name}
                      loading="lazy"
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const fb = e.currentTarget.parentElement?.querySelector('.avatar-fb');
                        if (fb) fb.style.display = 'block';
                      }}
                    />
                    <span className="avatar-fb hidden">{p.position}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-white">
                        {p.short_name || p.name}
                      </p>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                        {p.position}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {p.real_team_name} • {p.fantasy_points || 0} pts
                    </p>
                  </div>
                </div>

                {/* Price & Add Action */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400 block">
                      ${p.current_price?.toFixed(1)}M
                    </span>
                    {p.goals > 0 && (
                      <span className="text-[10px] text-slate-400">
                        {p.goals} ⚽ {p.assists} 👟
                      </span>
                    )}
                  </div>

                  {isOwned ? (
                    <div className="p-2 rounded-xl bg-slate-800 text-slate-500 cursor-not-allowed">
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      onClick={() => onAddPlayer(p, targetSlotType)}
                      className="p-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition"
                      title={targetSlotType === 'BENCH' ? 'Add to Bench' : 'Add to Starting XI'}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
