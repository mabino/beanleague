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
  onOpenMedia,
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
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto px-1 sm:px-0">
      {/* Soccer Pitch Container */}
      <div className="relative w-full rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-slate-700/80 pitch-bg overflow-hidden shadow-2xl p-2 xs:p-3 sm:p-5 md:p-6 select-none">
        {/* Visual Pitch Markings */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          {/* Halfway Line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white -translate-y-1/2"></div>
          {/* Center Circle */}
          <div className="absolute top-1/2 left-1/2 w-20 sm:w-28 md:w-36 h-20 sm:h-28 md:h-36 rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-2.5 h-2.5 rounded-full bg-white -translate-x-1/2 -translate-y-1/2"></div>
          {/* Top Penalty Box */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 sm:w-48 md:w-64 h-16 sm:h-20 md:h-28 border-b-2 border-x-2 border-white rounded-b-lg"></div>
          {/* Bottom Penalty Box */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 sm:w-48 md:w-64 h-16 sm:h-20 md:h-28 border-t-2 border-x-2 border-white rounded-t-lg"></div>
        </div>

        {/* Pitch Player Rows (FWD -> MID -> DEF -> GK) */}
        <div className="relative z-10 flex flex-col justify-between h-[450px] xs:h-[490px] sm:h-[560px] md:h-[620px] py-1 sm:py-2">
          {/* Forwards (Attackers) */}
          <div className="flex justify-around items-center w-full px-0.5 sm:px-2">
            {fwds.map((player, idx) => (
              <PlayerCard
                key={player ? `fwd-${player.id || player.player_id}` : `fwd-empty-${idx}`}
                player={player}
                isCaptain={player && (player.id || player.player_id) === captainId}
                isStarting={true}
                onMakeCaptain={!isReadonly ? onMakeCaptain : undefined}
                onRemove={!isReadonly ? onRemovePlayer : undefined}
                onOpenMedia={onOpenMedia}
                onClick={() => {
                  if (player && onOpenMedia) {
                    onOpenMedia(player);
                  } else if (!isReadonly && onSelectSlot) {
                    onSelectSlot('FWD', player);
                  }
                }}
              />
            ))}
          </div>

          {/* Midfielders */}
          <div className="flex justify-around items-center w-full px-0.5 sm:px-2">
            {mids.map((player, idx) => (
              <PlayerCard
                key={player ? `mid-${player.id || player.player_id}` : `mid-empty-${idx}`}
                player={player}
                isCaptain={player && (player.id || player.player_id) === captainId}
                isStarting={true}
                onMakeCaptain={!isReadonly ? onMakeCaptain : undefined}
                onRemove={!isReadonly ? onRemovePlayer : undefined}
                onOpenMedia={onOpenMedia}
                onClick={() => {
                  if (player && onOpenMedia) {
                    onOpenMedia(player);
                  } else if (!isReadonly && onSelectSlot) {
                    onSelectSlot('MID', player);
                  }
                }}
              />
            ))}
          </div>

          {/* Defenders */}
          <div className="flex justify-around items-center w-full px-0.5 sm:px-2">
            {defs.map((player, idx) => (
              <PlayerCard
                key={player ? `def-${player.id || player.player_id}` : `def-empty-${idx}`}
                player={player}
                isCaptain={player && (player.id || player.player_id) === captainId}
                isStarting={true}
                onMakeCaptain={!isReadonly ? onMakeCaptain : undefined}
                onRemove={!isReadonly ? onRemovePlayer : undefined}
                onOpenMedia={onOpenMedia}
                onClick={() => {
                  if (player && onOpenMedia) {
                    onOpenMedia(player);
                  } else if (!isReadonly && onSelectSlot) {
                    onSelectSlot('DEF', player);
                  }
                }}
              />
            ))}
          </div>

          {/* Goalkeeper */}
          <div className="flex justify-around items-center w-full px-0.5 sm:px-2">
            {gks.map((player, idx) => (
              <PlayerCard
                key={player ? `gk-${player.id || player.player_id}` : `gk-empty-${idx}`}
                player={player}
                isCaptain={player && (player.id || player.player_id) === captainId}
                isStarting={true}
                onMakeCaptain={!isReadonly ? onMakeCaptain : undefined}
                onRemove={!isReadonly ? onRemovePlayer : undefined}
                onOpenMedia={onOpenMedia}
                onClick={() => {
                  if (player && onOpenMedia) {
                    onOpenMedia(player);
                  } else if (!isReadonly && onSelectSlot) {
                    onSelectSlot('GK', player);
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Substitutes / Bench Section */}
      <div className="w-full mt-3 sm:mt-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <h3 className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide uppercase">
              Substitutes Bench ({benchPlayers.length}/4)
            </h3>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400">
            Auto-subs if starter plays 0m
          </span>
        </div>

        <div className="flex justify-center items-center gap-1.5 xs:gap-2 sm:gap-4 md:gap-6 flex-wrap">
          {benchSlots.map((player, idx) => (
            <PlayerCard
              key={player ? `bench-${player.id || player.player_id}` : `bench-empty-${idx}`}
              player={player}
              isCaptain={false}
              isStarting={false}
              compact={true}
              onRemove={!isReadonly ? onRemovePlayer : undefined}
              onOpenMedia={onOpenMedia}
              onClick={() => {
                if (player && onOpenMedia) {
                  onOpenMedia(player);
                } else if (!isReadonly && onSelectSlot) {
                  onSelectSlot('BENCH', player);
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
