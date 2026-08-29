import React from 'react';
import { Crown, Sparkles, X, Shield, Zap } from 'lucide-react';
import { useLiveEvents } from '../context/LiveEventsContext';

const POSITION_COLORS = {
  GK: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  DEF: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  MID: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  FWD: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

const POSITION_JERSEY_COLORS = {
  GK: 'from-amber-600 to-amber-800 text-amber-100',
  DEF: 'from-blue-600 to-blue-800 text-blue-100',
  MID: 'from-emerald-600 to-emerald-800 text-emerald-100',
  FWD: 'from-rose-600 to-rose-800 text-rose-100',
};

export const PlayerCard = ({
  player,
  isCaptain = false,
  isStarting = true,
  onMakeCaptain,
  onRemove,
  onClick,
  compact = false,
  isSelectable = false,
  isTargetSlot = false,
}) => {
  const { pulsePlayerIds } = useLiveEvents();
  const isPulsing = player && pulsePlayerIds.has(player.id);

  if (!player) {
    return (
      <div
        onClick={onClick}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all cursor-pointer select-none
          ${isTargetSlot ? 'border-emerald-400 bg-emerald-950/40 scale-105 animate-pulse' : 'border-white/20 bg-black/20 hover:border-white/40 hover:bg-black/40'}
          ${compact ? 'w-16 h-20 p-1' : 'w-24 sm:w-28 h-28 sm:h-32 p-2'}`}
      >
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/40 mb-1">
          <Zap className="w-4 h-4" />
        </div>
        <span className="text-[10px] sm:text-xs font-semibold text-white/50 text-center">
          + Add Player
        </span>
      </div>
    );
  }

  const posColor = POSITION_COLORS[player.position] || POSITION_COLORS.MID;
  const jerseyGradient = POSITION_JERSEY_COLORS[player.position] || POSITION_JERSEY_COLORS.MID;

  return (
    <div
      onClick={onClick}
      className={`relative group rounded-xl border transition-all duration-300 select-none flex flex-col items-center
        ${isPulsing ? 'animate-glow-green scale-110 ring-4 ring-emerald-400 shadow-2xl z-20' : 'hover:scale-105 hover:shadow-xl'}
        ${isCaptain ? 'border-amber-400 shadow-amber-500/20 shadow-lg' : 'border-white/20 bg-slate-900/80 backdrop-blur-md'}
        ${compact ? 'w-20 sm:w-24 p-1.5' : 'w-24 sm:w-28 p-2'}`}
    >
      {/* Captain Ribbon */}
      {isCaptain && isStarting && (
        <div className="absolute -top-2.5 -left-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-md flex items-center gap-0.5 z-10 border border-yellow-200">
          <Crown className="w-3 h-3 fill-slate-950" />
          <span>CAPTAIN 2X</span>
        </div>
      )}

      {/* Quick Remove Button */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(player);
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
          title="Remove player"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Jersey / Photo Avatar */}
      <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gradient-to-br ${jerseyGradient} p-0.5 flex items-center justify-center shadow-inner border border-white/20 mb-1`}>
        <img
          src={player.photo_url || `/beanleague/api/players/${player.id}/photo`}
          alt={player.name}
          loading="lazy"
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        <div className="avatar-fallback hidden flex-col items-center justify-center text-center w-full h-full">
          <span className="text-[10px] font-bold tracking-tight opacity-75">
            {player.real_team_name?.slice(0, 3)?.toUpperCase() || 'FC'}
          </span>
          <span className="text-xs sm:text-sm font-black">
            {player.position}
          </span>
        </div>

        {/* Live Score Floating Badge */}
        <div className="absolute -bottom-1 -right-1 bg-slate-950/90 border border-emerald-400 text-emerald-400 font-extrabold text-[9px] sm:text-[10px] px-1 rounded shadow z-10">
          {player.match_points ?? player.fantasy_points ?? 0} pts
        </div>
      </div>

      {/* Player Name */}
      <div className="w-full text-center px-0.5 overflow-hidden">
        <p className="text-xs sm:text-sm font-bold text-white truncate drop-shadow-sm">
          {player.short_name || player.name?.split(' ')?.pop() || player.name}
        </p>
        <p className="text-[10px] text-slate-400 truncate">
          {player.real_team_name || 'Club'}
        </p>
      </div>

      {/* Price & Action Row */}
      <div className="w-full mt-1 pt-1 border-t border-white/10 flex items-center justify-between text-[10px]">
        <span className="font-semibold text-emerald-300">
          ${player.current_price?.toFixed(1)}M
        </span>

        {isStarting && onMakeCaptain && !isCaptain && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMakeCaptain(player);
            }}
            className="text-[9px] px-1 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 border border-amber-500/30 transition flex items-center gap-0.5"
            title="Make Captain (2x points)"
          >
            <Crown className="w-2.5 h-2.5" /> (C)
          </button>
        )}
      </div>
    </div>
  );
};
