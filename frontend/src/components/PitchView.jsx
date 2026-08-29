import React from 'react';
import { PlayerCard } from './PlayerCard';
import { Shield, Sparkles, Users } from 'lucide-react';

const FORMATION_ROWS = {
  '4-3-3': { def: 4, mid: 3, fwd: 3 },
  '3-5-2': { def: 3, mid: 5, fwd: 2 },
  '4-4-2': { def: 4, mid: 4, fwd: 2 },
  '3-4-3': { def: 3, mid: 4, fwd: 3 },
  '5-3-2': { def: 5, mid: 3, fwd: 2 },
  '4-2-3-1': { def: 4, mid: 5, fwd: 1 },
  '5-4-1': { def: 5, mid: 4, fwd: 1 },
};

export const PitchView = ({
  formation = '4-3-3',
  startingPlayers = [],
  benchPlayers = [],
  captainId = null,
  onMakeCaptain,
  onRemovePlayer,
  onSelectSlot,
  isReadonly = false,
}) => {
  const formationConfig = FORMATION_ROWS[formation] || FORMATION_ROWS['4-3-3'];

  // Categorize starting players by position
  const gkList = startingPlayers.filter((p) => p.position === 'GK');
  const defList = startingPlayers.filter((p) => p.position === 'DEF');
  const midList = startingPlayers.filter((p) => p.position === 'MID');
  const fwdList = startingPlayers.filter((p) => p.position === 'FWD');

  // Fill empty placeholder slots to match formation
  const gks = [...gkList, ...Array(Math.max(0, 1 - gkList.length)).fill(null)];
  const defs = [...defList, ...Array(Math.max(0, formationConfig.def - defList.length)).fill(null)];
  const mids = [...midList, ...Array(Math.max(0, formationConfig.mid - midList.length)).fill(null)];
  const fwds = [...fwdList, ...Array(Math.max(0, formationConfig.fwd - fwdList.length)).fill(null)];

  // Bench slots (max 4)
  const benchSlots = [...benchPlayers, ...Array(Math.max(0, 4 - benchPlayers.length)).fill(null)];

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto">
      {/* Soccer Pitch Container */}
      <div className="relative w-full rounded-3xl border-4 border-slate-700/80 pitch-bg overflow-hidden shadow-2xl p-4 sm:p-6 select-none">
        {/* Visual Pitch Markings */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          {/* Halfway Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white -translate-y-1/2"></div>
          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 w-28 sm:w-36 h-28 sm:h-36 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full bg-white -translate-x-1/2 -translate-y-1/2"></div>
          {/* Top Penalty Box */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-20 sm:h-28 border-b-2 border-x-2 border-white rounded-b-lg"></div>
          {/* Bottom Penalty Box */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-20 sm:h-28 border-t-2 border-x-2 border-white rounded-t-lg"></div>
        </div>

        {/* Pitch Player Rows (FWD -> MID -> DEF -> GK) */}
        <div className="relative z-10 flex flex-col justify-between h-[540px] sm:h-[620px] py-2">
          {/* Forwards (Attackers) */}
          <div className="flex justify-center items-center gap-2 sm:gap-6 flex-wrap">
            {fwds.map((player, idx) => (
              <PlayerCard
                key={player ? `fwd-${player.id}` : `fwd-empty-${idx}`}
                player={player}
                isCaptain={player && player.id === captainId}
                isStarting={true}
                onMakeCaptain={!isReadonly ? onMakeCaptain : undefined}
                onRemove={!isReadonly ? onRemovePlayer : undefined}
                onClick={() => !isReadonly && onSelectSlot && onSelectSlot('FWD', player)}
              />
            ))}
          </div>

          {/* Midfielders */}
          <div className="flex justify-center items-center gap-2 sm:gap-5 flex-wrap">
            {mids.map((player, idx) => (
              <PlayerCard
                key={player ? `mid-${player.id}` : `mid-empty-${idx}`}
                player={player}
                isCaptain={player && player.id === captainId}
                isStarting={true}
                onMakeCaptain={!isReadonly ? onMakeCaptain : undefined}
                onRemove={!isReadonly ? onRemovePlayer : undefined}
                onClick={() => !isReadonly && onSelectSlot && onSelectSlot('MID', player)}
              />
            ))}
          </div>

          {/* Defenders */}
          <div className="flex justify-center items-center gap-2 sm:gap-4 flex-wrap">
            {defs.map((player, idx) => (
              <PlayerCard
                key={player ? `def-${player.id}` : `def-empty-${idx}`}
                player={player}
                isCaptain={player && player.id === captainId}
                isStarting={true}
                onMakeCaptain={!isReadonly ? onMakeCaptain : undefined}
                onRemove={!isReadonly ? onRemovePlayer : undefined}
                onClick={() => !isReadonly && onSelectSlot && onSelectSlot('DEF', player)}
              />
            ))}
          </div>

          {/* Goalkeeper */}
          <div className="flex justify-center items-center">
            {gks.map((player, idx) => (
              <PlayerCard
                key={player ? `gk-${player.id}` : `gk-empty-${idx}`}
                player={player}
                isCaptain={player && player.id === captainId}
                isStarting={true}
                onMakeCaptain={!isReadonly ? onMakeCaptain : undefined}
                onRemove={!isReadonly ? onRemovePlayer : undefined}
                onClick={() => !isReadonly && onSelectSlot && onSelectSlot('GK', player)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Substitutes / Bench Section */}
      <div className="w-full mt-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
              Substitutes Bench ({benchPlayers.length}/4)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Auto-subs score if starter plays 0 mins
          </span>
        </div>

        <div className="flex justify-center items-center gap-3 sm:gap-6 flex-wrap">
          {benchSlots.map((player, idx) => (
            <PlayerCard
              key={player ? `bench-${player.id}` : `bench-empty-${idx}`}
              player={player}
              isCaptain={false}
              isStarting={false}
              compact={true}
              onRemove={!isReadonly ? onRemovePlayer : undefined}
              onClick={() => !isReadonly && onSelectSlot && onSelectSlot('BENCH', player)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
