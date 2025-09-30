import { hasTauri, tauriInvoke } from '../runtime/ipc';

// MC Bridge: tries WS → falls back to local emitter.
// UI should ONLY import these helpers, never talk to WS directly.

export const MC_EVENTS = {
  STAGE_STATE: 'stage/state',
  STAGE_PRESENT: 'stage/present',
  STAGE_NAV: 'stage/nav',
  STAGE_POINTER: 'stage:pointer',  // { x:0..1, y:0..1 }
  STAGE_GOTO:    'stage:goto',     // { index:number }
  STAGE_PRESENTER_STATE: 'stage:presenter_state', // { deckId, index, laser }
};

// --- local bus ---
const listeners = new Map();
function localOn(event, cb) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
  return () => listeners.get(event)?.delete(cb);
}
function localEmit(event, payload) {
  listeners.get(event)?.forEach((cb) => cb(payload));
  if (import.meta.env.DEV) console.debug('[MC local emit]', event, payload);
}

// --- transport selection ---
let ws;
let online = false;
const pending = [];
const bc = (typeof BroadcastChannel !== 'undefined') ? new BroadcastChannel('stage') : null;

function connectWS() {
  const url = import.meta.env.VITE_MC_WS_URL;
  if (!url || ws) return;

  try {
    ws = new WebSocket(url);
    ws.onopen = () => {
      online = true;
      if (import.meta.env.DEV) console.info('[MC] WS connected');
      // flush pending
      while (pending.length) {
        ws.send(JSON.stringify(pending.shift()));
      }
      // Announce idle stage on (re)connect so clients know.
      localEmit(MC_EVENTS.STAGE_STATE, { status: 'idle' });
    };
    ws.onmessage = (e) => {
      try {
        const { event, payload } = JSON.parse(e.data);
        localEmit(event, payload);
      } catch (err) {
        console.warn('[MC] bad frame', err);
      }
    };
    ws.onclose = () => {
      online = false;
      ws = undefined;
      if (import.meta.env.DEV) console.warn('[MC] WS closed – falling back');
      // silent fallback; UI still works via local bus.
      setTimeout(connectWS, 1500); // keep trying
    };
    ws.onerror = () => {
      // handled by onclose; ensure flags
      online = false;
    };
  } catch {
    // ignore; remain in local mode
  }
}
if (typeof window !== 'undefined') {
  // lazy connect in browser
  connectWS();
}

// Public subscribe
export function on(event, cb) {
  const offLocal = localOn(event, cb);
  let offBC = () => {};
  if (bc) {
    const handler = (e) => { if (e?.data?.evt === event) cb(e.data.payload); };
    bc.addEventListener('message', handler);
    offBC = () => bc.removeEventListener('message', handler);
  }
  return () => { offLocal(); offBC(); };
}

// Public emit (mirrors to WS if available)
function emitAll(event, payload) {
  localEmit(event, payload);
  if (bc) bc.postMessage({ evt: event, payload });
  // existing StageAPI.event already POSTs/Tauri invokes
  StageAPI.event(event, payload).catch(()=>{});
}

// High-level helpers (keep UI stable)
export function stageGoLive({ deckId, slide = 0 }) {
  emitAll(MC_EVENTS.STAGE_STATE, { status: 'live' });
  emitAll(MC_EVENTS.STAGE_PRESENT, { deckId, slide });
}
export function stageEnd() {
  emitAll(MC_EVENTS.STAGE_STATE, { status: 'idle' });
}
export function stageNav(delta) {
  emitAll(MC_EVENTS.STAGE_NAV, { delta });
}

export function stagePointer(x, y) {
  emitAll(MC_EVENTS.STAGE_POINTER, { x, y });
}

export function stageGoto(index) {
  emitAll(MC_EVENTS.STAGE_GOTO, { index });
}

export function stagePresenterState(state) {
  emitAll(MC_EVENTS.STAGE_PRESENTER_STATE, state);
}

export const StageAPI = {
  async event(name, payload) {
    try {
      if (hasTauri()) return await tauriInvoke('stage_event', { event: name, payload });
    } catch {}
    // fallback to REST if you have one:
    const API = import.meta.env.VITE_COMPANYOS_API;
    if (API) {
      try {
        await fetch(`${API}/v1/stage/event`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ event: name, payload })
        });
      } catch {}
    }
  }
};