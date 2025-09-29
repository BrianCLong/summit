import natural from 'natural';

export type EntityRef = { id: string; kind: string; name?: string };

// Very simple heuristic NER for MVP-2; replace with proper service later
export function extractEntities(text?: string): EntityRef[] {
  if (!text) return [];
  const tokenizer = new natural.WordTokenizer();
  const words = tokenizer.tokenize(text).slice(0, 500);
  const entities: Record<string, EntityRef> = {};
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (/^[A-Z][a-zA-Z0-9_-]{2,}$/.test(w)) {
      const id = w.toLowerCase();
      entities[id] = { id, kind: 'PROPER_NOUN', name: w };
    }
  }
  return Object.values(entities).slice(0, 50);
}

