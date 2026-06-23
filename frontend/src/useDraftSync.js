import { useEffect, useRef, useState } from "react";

// Shape returned to the UI regardless of connection state.
const OFFLINE_STATE = {
  status: "offline",
  message: "Backend not connected — using Manual Standalone Mode.",
  blue: Array.from({ length: 5 }, (_, slot) => ({ slot, championId: 0, championName: null, completed: false, isSelf: false })),
  red: Array.from({ length: 5 }, (_, slot) => ({ slot, championId: 0, championName: null, completed: false, isSelf: false })),
  localPlayerCellId: -1,
};

/**
 * Subscribe to the backend draft state while `enabled` is true.
 *
 * Prefers a WebSocket (instant updates) and transparently falls back to HTTP
 * polling if the socket cannot be established. When disabled, it disconnects
 * cleanly so Manual Mode never talks to the backend.
 */
export function useDraftSync(enabled) {
  const [state, setState] = useState(OFFLINE_STATE);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      // Tear down any active connection and reset.
      if (socketRef.current) socketRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
      socketRef.current = null;
      pollRef.current = null;
      setConnected(false);
      setState(OFFLINE_STATE);
      return undefined;
    }

    let cancelled = false;

    const startPolling = () => {
      if (pollRef.current) return;
      const tick = async () => {
        try {
          const res = await fetch("/api/draft-state");
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          if (!cancelled) {
            setState(data);
            setConnected(true);
          }
        } catch {
          if (!cancelled) {
            setConnected(false);
            setState((s) => ({ ...s, status: "offline", message: "Backend unreachable." }));
          }
        }
      };
      tick();
      pollRef.current = setInterval(tick, 1500);
    };

    // Try WebSocket first.
    try {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${window.location.host}/ws/draft-state`);
      socketRef.current = ws;

      ws.onmessage = (evt) => {
        if (cancelled) return;
        try {
          setState(JSON.parse(evt.data));
          setConnected(true);
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onerror = () => startPolling();
      ws.onclose = () => {
        if (!cancelled) startPolling();
      };
    } catch {
      startPolling();
    }

    return () => {
      cancelled = true;
      if (socketRef.current) socketRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
      socketRef.current = null;
      pollRef.current = null;
    };
  }, [enabled]);

  return { state, connected };
}
