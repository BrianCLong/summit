import { signedFetch } from '../auth/signer';

const API = import.meta.env.VITE_COMPANYOS_API;
const TTL_MS = 5 * 60 * 1000;
const now = () => Date.now();
const LIST_LS = 'companyos.decks.cache.v1';
const DECK_LS = (id) => `companyos.decks.${id}.v1`;
const SLIDE_LS = (id, n) => `companyos.decks.${id}.slide.${n}.v1`;

function readLS(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (!ts || now() - ts > TTL_MS) return null;
    return data;
  } catch { return null; }
}
function writeLS(key, data) { try { localStorage.setItem(key, JSON.stringify({ ts: now(), data })); } catch {} }

export function readCache() { return readLS(LIST_LS); }
export function writeCache(data) { writeLS(LIST_LS, data); }

export async function fetchRemoteDecks({ force = false } = {}) {
  if (!API) return [];
  if (!force) { const c = readCache(); if (c) return c; }
  try {
    const r = await signedFetch('/v1/decks', { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const list = await r.json();
    writeCache(list);
    return Array.isArray(list) ? list : [];
  } catch { return []; }
}

// NEW: detail fetch with cache
export async function fetchRemoteDeckById(id, { force = false } = {}) {
  if (!API) return null;
  if (!force) { const c = readLS(DECK_LS(id)); if (c) return c; }
  try {
    const r = await signedFetch(`/v1/decks/${encodeURIComponent(id)}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const deck = await r.json(); // shape: { id, title, slides:[{title, md|content}], notes?:[...] }
    writeLS(DECK_LS(id), deck);
    return deck;
  } catch { return null; }
}

// NEW: incremental slide fetch: GET /v1/decks/{id}/slides/{n}
export async function fetchRemoteDeckSlide(id, n, { force = false } = {}) {
  if (!API) return null;
  const key = SLIDE_LS(id, n);
  if (!force) { const c = readLS(key); if (c) return c; }
  try {
    const r = await signedFetch(`/v1/decks/${encodeURIComponent(id)}/slides/${n}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const slide = await r.json(); // { index:n, ...content }
    writeLS(key, slide);
    return slide;
  } catch { return null; }
}