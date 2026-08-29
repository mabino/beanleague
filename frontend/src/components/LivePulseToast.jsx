import React from 'react';
import { Sparkles, X, Zap } from 'lucide-react';
import { useLiveEvents } from '../context/LiveEventsContext';

export const LivePulseToast = () => {
  const { notifications, dismissNotification } = useLiveEvents();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => {
        const isGoal = notif.event_type === 'goal';
        return (
          <div
            key={notif.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-xl transition-all transform animate-bounce-short
              ${
                isGoal
                  ? 'bg-gradient-to-r from-emerald-950/95 via-teal-950/95 to-slate-950/95 border-emerald-400 text-white shadow-emerald-500/20'
                  : 'bg-slate-900/95 border-slate-700 text-slate-100 shadow-xl'
              }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl text-lg ${isGoal ? 'bg-emerald-500/20 border border-emerald-400/40' : 'bg-slate-800'}`}>
                  {isGoal ? '⚽' : notif.event_type === 'assist' ? '👟' : notif.event_type === 'save' ? '🧤' : '🟨'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      LIVE EVENT ({notif.minute}')
                    </span>
                    {notif.points_delta !== 0 && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${notif.points_delta > 0 ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'}`}>
                        {notif.points_delta > 0 ? `+${notif.points_delta}` : notif.points_delta} pts
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white mt-0.5">
                    {notif.detail || `${notif.player_name} ${notif.event_type}`}
                  </p>
                  {notif.fixture_summary && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {notif.fixture_summary}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => dismissNotification(notif.id)}
                className="p-1 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
