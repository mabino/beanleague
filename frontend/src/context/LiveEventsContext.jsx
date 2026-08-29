import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';

const LiveEventsContext = createContext(null);

// Web Audio API synthesized goal chime & whistle for audio flair!
const playCelebrationSound = (type = 'goal') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'goal') {
      // Fanfare chord: C5 -> E5 -> G5 -> C6
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.4);
      });
    } else if (type === 'whistle') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(2500, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(3200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.debug("Audio playback ignored:", e);
  }
};

export const LiveEventsProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pulsePlayerIds, setPulsePlayerIds] = useState(new Set());
  const [soundEnabled, setSoundEnabled] = useState(false);

  const triggerConfetti = useCallback(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#ffffff']
    });
  }, []);

  const addNotification = useCallback((event) => {
    const notif = {
      id: `${Date.now()}-${Math.random()}`,
      ...event,
      createdAt: new Date().toLocaleTimeString(),
    };
    
    setNotifications((prev) => [notif, ...prev.slice(0, 9)]);

    // Highlight pulsing player
    if (event.player_id) {
      setPulsePlayerIds((prev) => new Set(prev).add(event.player_id));
      setTimeout(() => {
        setPulsePlayerIds((prev) => {
          const next = new Set(prev);
          next.delete(event.player_id);
          return next;
        });
      }, 8000);
    }

    // Goal fanfare!
    if (event.event_type === 'goal') {
      if (soundEnabled) playCelebrationSound('goal');
      triggerConfetti();
    } else if (event.event_type === 'assist' || event.event_type === 'save') {
      if (soundEnabled) playCelebrationSound('whistle');
    }
  }, [soundEnabled, triggerConfetti]);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL ?? (window.location.pathname.startsWith('/beanleague') ? '/beanleague' : '');
    const sseUrl = `${base}/api/events/live`;
    let eventSource = null;
    let reconnectTimeout = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource(sseUrl);

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.addEventListener("message", (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.event_type && data.event_type !== "ping") {
              addNotification(data);
            }
          } catch (err) {
            console.error("SSE parse error:", err);
          }
        });

        eventSource.addEventListener("ping", () => {
          setIsConnected(true);
        });

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource?.close();
          reconnectTimeout = setTimeout(connectSSE, 4000);
        };
      } catch (err) {
        console.warn("SSE connection failure:", err);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [addNotification]);

  return (
    <LiveEventsContext.Provider
      value={{
        isConnected,
        notifications,
        pulsePlayerIds,
        soundEnabled,
        setSoundEnabled,
        addNotification,
        dismissNotification,
        triggerConfetti,
      }}
    >
      {children}
    </LiveEventsContext.Provider>
  );
};

export const useLiveEvents = () => {
  const context = useContext(LiveEventsContext);
  if (!context) {
    throw new Error("useLiveEvents must be used within a LiveEventsProvider");
  }
  return context;
};
