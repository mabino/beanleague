import React from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, Video } from 'lucide-react';
import { API_BASE } from '../api/client';

export const RemoveWarningModal = ({
  isOpen,
  onClose,
  player,
  onConfirmRemove
}) => {
  if (!isOpen || !player) return null;

  const videoCount = player.youtube_links?.length || 0;
  const hasNotes = Boolean(player.custom_notes && player.custom_notes.trim());
  const photoSrc = `${API_BASE}/api/players/${player.player_id || player.id}/photo`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-rose-500/50 rounded-3xl p-6 shadow-2xl overflow-hidden space-y-4">
        {/* Warning Badge Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-rose-400">
            <div className="p-2 rounded-2xl bg-rose-500/20 border border-rose-500/40">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Clear Embedded Info Warning</h3>
              <p className="text-[11px] text-rose-300/80">Roster transfer confirmation</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Player Snapshot */}
        <div className="flex items-center gap-3 p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-inner">
          <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
            <img
              src={photoSrc}
              alt={player.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-white truncate">{player.name}</h4>
            <p className="text-xs text-slate-400 truncate">
              {player.real_team_name} • {player.position} • ${player.current_price?.toFixed(1)}M
            </p>
          </div>
        </div>

        {/* Warning Message */}
        <div className="p-3.5 bg-rose-950/30 border border-rose-500/30 rounded-2xl space-y-2 text-xs text-rose-200">
          <p className="font-semibold leading-relaxed">
            Removing <span className="text-white font-bold">{player.name}</span> will{' '}
            <span className="text-rose-400 font-bold underline">permanently delete</span> all their embedded info:
          </p>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-rose-300 font-medium">
            {videoCount > 0 && (
              <li>
                <span className="font-bold">{videoCount}</span> embedded YouTube highlight video{videoCount > 1 ? 's' : ''}
              </li>
            )}
            {hasNotes && <li>Custom manager scouting & tactical notes</li>}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition"
          >
            Keep {player.short_name || 'Player'}
          </button>

          <button
            onClick={() => {
              onConfirmRemove(player);
              onClose();
            }}
            className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow-lg transition active:scale-95 flex items-center justify-center gap-1.5 text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove & Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
};
