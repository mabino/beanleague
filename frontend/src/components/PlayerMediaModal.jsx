import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, X, Save, Check, Play, Edit3, ShieldAlert, Sparkles, Video, Film } from 'lucide-react';
import { api, API_BASE } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const extractYoutubeVideoId = (url) => {
  if (!url) return null;
  const clean = url.trim();
  // 1. Direct 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  // 2. youtu.be/ID
  const matchShort = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (matchShort) return matchShort[1];
  // 3. youtube.com/watch?v=ID
  const matchWatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchWatch) return matchWatch[1];
  // 4. youtube.com/shorts/ID or /embed/ID
  const matchEmbed = clean.match(/youtube\.com\/(?:embed|shorts)\/([a-zA-Z0-9_-]{11})/);
  if (matchEmbed) return matchEmbed[1];
  return null;
};

export const PlayerMediaModal = ({
  isOpen,
  onClose,
  player,
  isReadOnly = false,
  onSaved
}) => {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [notes, setNotes] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    if (player) {
      setLinks(player.youtube_links || []);
      setNotes(player.custom_notes || '');
      setInputUrl('');
      setInputTitle('');
      setErrorMessage(null);
      setSaveSuccess(false);
    }
  }, [player, isOpen]);

  if (!isOpen || !player) return null;

  const photoSrc = `${API_BASE}/api/players/${player.player_id || player.id}/photo`;

  const handleAddVideo = (e) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    if (links.length >= 3) {
      setErrorMessage('Maximum of 3 YouTube highlight videos allowed per player.');
      return;
    }

    const videoId = extractYoutubeVideoId(inputUrl);
    if (!videoId) {
      setErrorMessage('Invalid YouTube URL. Please enter a valid YouTube link or video ID.');
      return;
    }

    const newItem = {
      url: inputUrl.trim(),
      video_id: videoId,
      title: inputTitle.trim() || `${player.name} Highlights`,
    };

    setLinks([...links, newItem]);
    setInputUrl('');
    setInputTitle('');
    setErrorMessage(null);
  };

  const handleRemoveVideo = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSaveMedia = async () => {
    if (isReadOnly || !user?.manager_code) return;
    try {
      setIsSaving(true);
      setErrorMessage(null);
      await api.updatePlayerMedia(user.manager_code, player.player_id || player.id, {
        youtube_links: links,
        custom_notes: notes.trim(),
      });
      setSaveSuccess(true);
      if (onSaved) onSaved(player.player_id || player.id, links, notes.trim());
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save player media.');
    } finally {
      setIsSaving(false);
    }
  };

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    player.name + ' soccer skills highlights 2026'
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 shadow-inner flex items-center justify-center">
              <img
                src={photoSrc}
                alt={player.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">{player.name}</h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {player.position}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {player.real_team_name || 'Free Agent'} • ${player.current_price?.toFixed(1)}M
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="py-5 overflow-y-auto pr-1 space-y-6">
          {/* YouTube Highlights Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <Video className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Embedded YouTube Highlights ({links.length}/3)
                </span>
              </div>

              {!isReadOnly && (
                <a
                  href={youtubeSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition"
                >
                  <span>Search YouTube</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Video Player Embeds */}
            {links.length > 0 ? (
              <div className="space-y-4">
                {links.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-inner"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-200 truncate flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-rose-400" />
                        <span>{item.title || `Video #${idx + 1}`}</span>
                      </span>

                      {!isReadOnly && (
                        <button
                          onClick={() => handleRemoveVideo(idx)}
                          className="p-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition"
                          title="Remove video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow">
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/${item.video_id}`}
                        title={item.title || 'YouTube video'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 bg-slate-950/60 rounded-2xl border border-slate-800/80 text-center space-y-2">
                <Video className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-semibold">
                  No YouTube highlight reels embedded yet.
                </p>
                {!isReadOnly && (
                  <p className="text-[11px] text-slate-500">
                    Paste a YouTube link below to embed their top goals and skill compilations!
                  </p>
                )}
              </div>
            )}

            {/* Add New Video Form (if < 3 and not read-only) */}
            {!isReadOnly && links.length < 3 && (
              <form onSubmit={handleAddVideo} className="mt-4 p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block">
                  Add Highlight Video #{links.length + 1}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                    placeholder="Title (e.g. 2026 Solo Goal vs Real Madrid)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://youtu.be/... or watch?v=..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Embed Video</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Custom Manager Notes */}
          <div>
            <label className="block text-xs font-black text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Manager Scouting Notes</span>
            </label>
            {isReadOnly ? (
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 min-h-[60px]">
                {notes ? notes : <span className="text-slate-500 italic">No notes provided.</span>}
              </div>
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tactical notes, matchday matchups, set piece roles..."
                rows={2}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400 resize-none"
              />
            )}
          </div>

          {errorMessage && (
            <p className="text-xs text-rose-400 font-semibold">{errorMessage}</p>
          )}
        </div>

        {/* Footer */}
        {!isReadOnly && (
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition"
            >
              Close
            </button>

            <button
              onClick={handleSaveMedia}
              disabled={isSaving}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl shadow-lg transition active:scale-95 flex items-center gap-2 text-xs"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Highlights Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Player Profile'}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
