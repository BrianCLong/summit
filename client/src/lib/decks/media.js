import { signedFetch } from '../auth/signer';

// Server contract: GET /v1/decks/:id/slides/:n/url -> { url, expiresAt }
export async function getSignedSlideUrl({ deckId, index }) {
  const r = await signedFetch(`/v1/decks/${encodeURIComponent(deckId)}/slides/${index}/url`);
  if (!r.ok) throw new Error(`url ${r.status}`);
  return r.json(); // { url, expiresAt }
}

export async function fetchWithExpiryRetry(urlProviderFn, { signal } = {}) {
  // urlProviderFn: () => Promise<{ url, expiresAt?: number }>
  let attempt = 0;
  while (attempt < 2) {
    attempt++;
    const { url } = await urlProviderFn();
    try {
      const res = await fetch(url, { credentials: 'include', signal });
      if (res.status === 401 || res.status === 403) throw new Error('expired');
      if (!res.ok) throw new Error(`http ${res.status}`);
      return res;
    } catch (e) {
      if (String(e).includes('expired') && attempt < 2) {
        // try again with fresh signature
        continue;
      }
      throw e;
    }
  }
}