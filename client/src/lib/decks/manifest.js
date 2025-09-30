import { fetchRemoteDecks, fetchRemoteDeckById, fetchRemoteDeckSlide } from './remote';

// Local bundle-time discovery
const jsonMods = import.meta.glob('../../decks/**/*.json', { eager: true, import: 'default' });
const mdxMods  = import.meta.glob('../../decks/**/*.mdx',  { eager: true });

function mdxMeta(mod) {
  const id = mod?.frontmatter?.id || 'mdx-deck';
  const title = mod?.frontmatter?.title || 'Untitled Deck';
  return { id, title };
}

function listLocal() {
  const list = [];
  for (const [path, data] of Object.entries(jsonMods)) {
    const id = data.id || path.split('/').pop().replace(/\.json$/,'');
    list.push({ id, title: data.title || id, type: 'json', load: async () => ({ type: 'json', deck: data }) });
  }
  for (const [path, mod] of Object.entries(mdxMods)) {
    const meta = mdxMeta(mod);
    const id = meta.id || path.split('/').pop().replace(/\.mdx$/,'');
    list.push({ id, title: meta.title || id, type: 'mdx', load: async () => ({ type: 'mdx', mod }) });
  }
  return list;
}

export function attachLazySlides(deckSummary) {
  const deck = { ...deckSummary };
  deck.getSlide = async (n) => {
    const s = deck.slides?.[n];
    if (s && (s.content || s.image)) return s; // already full
    const fetched = await fetchRemoteDeckSlide(deck.id, n);
    if (!deck.slides) deck.slides = [];
    deck.slides[n] = { ...(deck.slides[n]||{}), ...(fetched||{}) };
    return deck.slides[n];
  };
  return deck;
}

let memo; // runtime memoization of merged decks
export async function listDecksMerged({ forceRemote = false } = {}) {
  const local = listLocal();

  // turn local into a map for easy override
  const byId = new Map(local.map(d => [d.id, d]));

  // pull remote (cached)
  const remote = await fetchRemoteDecks({ force: forceRemote });

  for (const r of remote) {
    const entry = {
      id: r.id,
      title: r.title || r.id,
      type: r.type || 'json',
      load: async () => {
        const full = await fetchRemoteDeckById(r.id);
        return { type: 'remote', deck: attachLazySlides(full || r) }; // fall back to summary if detail missing
      },
    };
    // Remote takes precedence (can override local with same id)
    byId.set(entry.id, entry);
  }

  const merged = Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title));
  memo = merged;
  return merged;
}

export function getDeckByIdMerged(id) {
  if (!memo) return null;
  return memo.find(d => d.id === id) || null;
}