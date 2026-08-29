import React, { useState, useEffect } from 'react';
import { Trophy, Users, Shield, Zap, Sparkles, Volume2, VolumeX, LogOut, KeyRound, Copy, Check, Eye, Shirt, Video, Binoculars } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useLiveEvents } from './context/LiveEventsContext';
import { api } from './api/client';
import { PitchView } from './components/PitchView';
import { BudgetBar } from './components/BudgetBar';
import { PlayerMarket } from './components/PlayerMarket';
import { FormationSelector } from './components/FormationSelector';
import { LiveLeaderboard } from './components/LiveLeaderboard';
import { MatchTicker } from './components/MatchTicker';
import { LivePulseToast } from './components/LivePulseToast';
import { JoinModal } from './components/JoinModal';
import { SimulationControls } from './components/SimulationControls';
import { JerseyKit } from './components/JerseyKit';
import { KitCustomizerModal } from './components/KitCustomizerModal';
import { PlayerMediaModal } from './components/PlayerMediaModal';
import { RemoveWarningModal } from './components/RemoveWarningModal';
import { ScoutModal } from './components/ScoutModal';

export function App() {
  const { team, roster, managerCode, seasonCode, isLoading, logout, refreshRoster } = useAuth();
  const { soundEnabled, setSoundEnabled, triggerConfetti } = useLiveEvents();

  const [activeTab, setActiveTab] = useState('pitch'); // 'pitch' | 'standings'
  const [formation, setFormation] = useState('4-3-3');
  const [startingPlayers, setStartingPlayers] = useState([]);
  const [benchPlayers, setBenchPlayers] = useState([]);
  const [captainId, setCaptainId] = useState(null);
  
  // Market drawer / modal state
  const [isMarketOpen, setIsMarketOpen] = useState(false);
  const [targetSlotPos, setTargetSlotPos] = useState(null);
  const [targetSlotType, setTargetSlotType] = useState('STARTING');

  // Modals state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isKitModalOpen, setIsKitModalOpen] = useState(false);
  const [selectedMediaPlayer, setSelectedMediaPlayer] = useState(null);
  const [playerPendingRemoval, setPlayerPendingRemoval] = useState(null);
  const [scoutTeamId, setScoutTeamId] = useState(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [copiedPin, setCopiedPin] = useState(false);

  // Load roster data into local state when user / roster changes
  useEffect(() => {
    if (roster && roster.players) {
      setFormation(roster.formation || '4-3-3');
      const starting = roster.players.filter((p) => p.is_starting_xi);
      const bench = roster.players.filter((p) => !p.is_starting_xi);
      setStartingPlayers(starting);
      setBenchPlayers(bench);
      
      const cap = roster.players.find((p) => p.is_captain);
      if (cap) {
        setCaptainId(cap.player_id || cap.id);
      } else if (starting.length > 0) {
        setCaptainId(starting[0].player_id || starting[0].id);
      }
    }
  }, [roster]);

  // Open Join Modal if no manager logged in
  useEffect(() => {
    if (!isLoading && !managerCode) {
      setIsJoinModalOpen(true);
    }
  }, [isLoading, managerCode]);

  // Calculate totals
  const allSquadPlayers = [...startingPlayers, ...benchPlayers];
  const totalCost = Math.round(allSquadPlayers.reduce((sum, p) => sum + (p.current_price || 0), 0) * 10) / 10;
  const selectedSquadIds = new Set(allSquadPlayers.map((p) => p.player_id || p.id));

  // Handle slot selection on pitch or bench
  const handleSelectSlot = (pos, existingPlayer) => {
    if (pos === 'BENCH') {
      setTargetSlotType('BENCH');
      setTargetSlotPos(null);
    } else {
      setTargetSlotType('STARTING');
      setTargetSlotPos(pos);
    }
    setIsMarketOpen(true);
  };

  // Add player from market
  const handleAddPlayer = (player, slotType) => {
    const formattedPlayer = {
      ...player,
      player_id: player.id,
      is_starting_xi: slotType === 'STARTING',
      is_captain: false,
      youtube_links: [],
      custom_notes: '',
    };

    if (slotType === 'STARTING') {
      setStartingPlayers((prev) => [...prev, formattedPlayer]);
      if (!captainId) {
        setCaptainId(player.id);
      }
    } else {
      setBenchPlayers((prev) => [...prev, formattedPlayer]);
    }

    setIsMarketOpen(false);
  };

  // Request player removal (triggers warning if embedded info exists)
  const handleRequestRemovePlayer = (player) => {
    const videoCount = player?.youtube_links?.length || 0;
    const hasNotes = Boolean(player?.custom_notes && player.custom_notes.trim());

    if (videoCount > 0 || hasNotes) {
      setPlayerPendingRemoval(player);
    } else {
      executeRemovePlayer(player);
    }
  };

  // Execute removal
  const executeRemovePlayer = (player) => {
    const pId = player.player_id || player.id;
    setStartingPlayers((prev) => prev.filter((p) => (p.player_id || p.id) !== pId));
    setBenchPlayers((prev) => prev.filter((p) => (p.player_id || p.id) !== pId));
    if (captainId === pId) {
      const remainingStarters = startingPlayers.filter((p) => (p.player_id || p.id) !== pId);
      setCaptainId(remainingStarters.length > 0 ? (remainingStarters[0].player_id || remainingStarters[0].id) : null);
    }
  };

  // Make Captain
  const handleMakeCaptain = (player) => {
    setCaptainId(player.player_id || player.id);
  };

  // Save Roster
  const handleSaveRoster = async () => {
    if (!managerCode) {
      setIsJoinModalOpen(true);
      return;
    }

    try {
      setIsSaving(true);
      setValidationErrors([]);
      setSaveSuccessMsg(null);

      const rosterItems = [
        ...startingPlayers.map((p, idx) => ({
          player_id: p.player_id || p.id,
          is_starting_xi: true,
          is_captain: (p.player_id || p.id) === captainId,
          slot_position: p.position,
          slot_index: idx,
        })),
        ...benchPlayers.map((p, idx) => ({
          player_id: p.player_id || p.id,
          is_starting_xi: false,
          is_captain: false,
          slot_position: p.position,
          slot_index: idx,
        })),
      ];

      await api.saveMyRoster(managerCode, formation, rosterItems);
      await refreshRoster();
      triggerConfetti();
      setSaveSuccessMsg('Roster successfully saved! Points recalculated.');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Failed to save roster:', err);
      const errors = err.data?.detail?.errors || [err.message];
      setValidationErrors(errors);
    } finally {
      setIsSaving(false);
    }
  };

  // Callback after saving player media
  const handlePlayerMediaSaved = (playerId, youtubeLinks, customNotes) => {
    setStartingPlayers((prev) =>
      prev.map((p) =>
        (p.player_id || p.id) === playerId
          ? { ...p, youtube_links: youtubeLinks, custom_notes: customNotes }
          : p
      )
    );
    setBenchPlayers((prev) =>
      prev.map((p) =>
        (p.player_id || p.id) === playerId
          ? { ...p, youtube_links: youtubeLinks, custom_notes: customNotes }
          : p
      )
    );
  };

  const handleCopyMyPin = () => {
    if (managerCode) {
      navigator.clipboard.writeText(managerCode);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 border-b border-slate-800 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo, Kit Avatar & League Tag */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsKitModalOpen(true)}
              className="shrink-0 p-1 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-400/60 hover:scale-105 transition shadow-sm group"
              title="Click to customize team jersey & crest"
            >
              <JerseyKit kitConfig={team?.kit_config} size={36} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  {team?.team_name || 'BeanLeague Fantasy'}
                </h1>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {seasonCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Score: <strong className="text-emerald-400 font-bold">{team?.total_points || 0} pts</strong>
              </p>
            </div>
          </div>

          {/* Navigation View Tabs */}
          <div className="flex items-center bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('pitch')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeTab === 'pitch'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Pitch View</span>
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className={`px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                activeTab === 'standings'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Standings & Scout</span>
            </button>
            <button
              onClick={() => setIsMarketOpen(true)}
              className="px-3 sm:px-4 py-1.5 rounded-xl text-xs font-black text-slate-400 hover:text-white transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Transfer Market</span>
            </button>
          </div>

          {/* Kit Maker, Manager PIN & Actions */}
          <div className="flex items-center gap-2">
            {managerCode ? (
              <div className="flex items-center gap-1.5">
                {/* Custom Kit Maker Button */}
                <button
                  onClick={() => setIsKitModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5 shadow-sm transition active:scale-95"
                  title="Customize Team Jersey & Crest"
                >
                  <Shirt className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Kit Maker</span>
                </button>

                {/* PIN Copy Badge */}
                <button
                  onClick={handleCopyMyPin}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-mono text-emerald-400 flex items-center gap-1.5 shadow-sm transition active:scale-95"
                  title="Click to copy your PIN to phone notes"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="font-bold">PIN: {managerCode}</span>
                  {copiedPin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                </button>

                <button
                  onClick={logout}
                  className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition"
                  title="Switch Manager"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsJoinModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow transition"
              >
                Join / Login
              </button>
            )}

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title={soundEnabled ? 'Mute Sounds' : 'Enable Sounds'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Live Matchday Ticker */}
        <MatchTicker />
      </header>

      {/* Subheader Toolbar */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <SimulationControls />
        {activeTab === 'pitch' && (
          <FormationSelector value={formation} onChange={(f) => setFormation(f)} />
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-4">
        {saveSuccessMsg && (
          <div className="mb-4 p-3 bg-emerald-950/80 border border-emerald-400/60 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg animate-bounce-short">
            <Sparkles className="w-4 h-4" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {activeTab === 'pitch' ? (
          <div className="flex flex-col items-center">
            {/* Salary Cap Budget Bar */}
            <BudgetBar
              totalCost={totalCost}
              salaryCap={100.0}
              startingCount={startingPlayers.length}
              benchCount={benchPlayers.length}
              hasCaptain={captainId !== null && startingPlayers.some((p) => (p.player_id || p.id) === captainId)}
              onSaveRoster={handleSaveRoster}
              isSaving={isSaving}
              validationErrors={validationErrors}
            />

            {/* Tactical Pitch View */}
            <PitchView
              formation={formation}
              startingPlayers={startingPlayers}
              benchPlayers={benchPlayers}
              captainId={captainId}
              onMakeCaptain={handleMakeCaptain}
              onRemovePlayer={handleRequestRemovePlayer}
              onOpenMedia={(p) => setSelectedMediaPlayer(p)}
              onSelectSlot={handleSelectSlot}
            />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <LiveLeaderboard
              seasonCode={seasonCode}
              onSelectTeam={(teamId) => setScoutTeamId(teamId)}
            />
          </div>
        )}
      </main>

      {/* Transfer Market Modal / Drawer */}
      {isMarketOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-2xl h-[650px] max-h-[90vh]">
            <PlayerMarket
              selectedSquadIds={selectedSquadIds}
              onAddPlayer={handleAddPlayer}
              onClose={() => setIsMarketOpen(false)}
              targetPosition={targetSlotPos}
              targetSlotType={targetSlotType}
            />
          </div>
        </div>
      )}

      {/* Custom Kit Maker Modal */}
      {isKitModalOpen && (
        <KitCustomizerModal
          isOpen={isKitModalOpen}
          onClose={() => setIsKitModalOpen(false)}
          initialKit={team?.kit_config}
          onSaved={async () => {
            await refreshRoster();
            triggerConfetti();
          }}
        />
      )}

      {/* Player Embedded YouTube Highlights & Media Modal */}
      {selectedMediaPlayer && (
        <PlayerMediaModal
          isOpen={Boolean(selectedMediaPlayer)}
          onClose={() => setSelectedMediaPlayer(null)}
          player={selectedMediaPlayer}
          isReadOnly={false}
          onSaved={handlePlayerMediaSaved}
        />
      )}

      {/* Player Removal Warning Modal (Protects embedded YouTube highlights) */}
      {playerPendingRemoval && (
        <RemoveWarningModal
          isOpen={Boolean(playerPendingRemoval)}
          onClose={() => setPlayerPendingRemoval(null)}
          player={playerPendingRemoval}
          onConfirmRemove={executeRemovePlayer}
        />
      )}

      {/* Opponent Scout Modal */}
      {scoutTeamId && (
        <ScoutModal
          isOpen={Boolean(scoutTeamId)}
          onClose={() => setScoutTeamId(null)}
          teamId={scoutTeamId}
        />
      )}

      {/* Join & Login Modal */}
      <JoinModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
      />

      {/* Real-time Goal & Match Pulse Toasts */}
      <LivePulseToast />
    </div>
  );
}
