import crypto from "node:crypto";
import { nanoid } from "nanoid";

type Extracted = {
  docId: string;
  inputSha256: string;
  nodes: Array<{ id: string; label: string; kind: string; score: number }>;
  edges: Array<{ id: string; src: string; dst: string; kind: string; weight: number }>;
};

function sha256(s: string) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

// Tiny “entity” heuristic: capitalized words + distinct tokens
export function extractGraph(content: string): Extracted {
  const docId = `doc_${nanoid(10)}`;
  const inputSha256 = sha256(content);

  const tokens = content
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

  const counts = new Map<string, number>();
  for (const t of tokens) {
    if (t.length < 3) {continue;}
    const key = t.trim();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const candidates = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([label, c]) => ({
      id: `n_${nanoid(10)}`,
      label,
      kind: /^[A-Z]/.test(label) ? "proper" : "token",
      score: c
    }));

  // Co-occurrence edges across top 12 candidates (very small demo)
  const top = candidates.slice(0, 12);
  const edges: Extracted["edges"] = [];
  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      const w = 1; // keep simple
      const srcItem = top[i];
      const dstItem = top[j];
      if (!srcItem || !dstItem) { continue; } // Ensure items are not null/undefined
      edges.push({ id: `e_${nanoid(10)}`, src: srcItem.id, dst: dstItem.id, kind: "cooccurs", weight: w });
    }
  }

  return { docId, inputSha256, nodes: candidates, edges };
}
