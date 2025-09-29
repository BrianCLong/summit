export type Claim = { id?: string; text: string; confidence?: number };

// Minimal placeholder; replace with model-backed extraction
export function extractClaims(text?: string): Claim[] {
  if (!text) return [];
  const candidates: Claim[] = [];
  const sentences = String(text).split(/[.!?]\s+/).slice(0, 10);
  for (const s of sentences) {
    if (/\b(claims?|says?|reports?)\b/i.test(s)) {
      candidates.push({ text: s.trim(), confidence: 0.5 });
    }
  }
  return candidates.slice(0, 20);
}

