import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRemoteDeckById } from '../src/lib/decks/remote';

const API = 'http://localhost:9999';
const KEY = (id) => `companyos.decks.${id}.v1`;

function setLS(k, v) { localStorage.setItem(k, JSON.stringify({ ts: Date.now(), data: v })); }

describe('remote deck cache', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_COMPANYOS_API', API);
    localStorage.clear();
    global.fetch = vi.fn();
  });

  it('returns cached deck when fresh', async () => {
    const cached = { id:'deck-1', title:'Cached Deck', slides:[{ title:'S1' }] };
    setLS(KEY('deck-1'), cached);
    const res = await fetchRemoteDeckById('deck-1');
    expect(res?.title).toBe('Cached Deck');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to network when not cached', async () => {
    (global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ id:'deck-2', title:'Remote Deck' }), { status: 200 }));
    const res = await fetchRemoteDeckById('deck-2', { force:false });
    expect(res?.title).toBe('Remote Deck');
  });
});