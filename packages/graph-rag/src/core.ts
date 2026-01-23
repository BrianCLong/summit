import { createHash } from 'crypto';
import { RetrievalResult, Context, Node, Edge } from './types.js';
import { RetrievalSanitizer } from './security.js';

/**
 * Deterministically sorts nodes by ID.
 */
export function sortNodes(nodes: Node[]): Node[] {
  return [...nodes].sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Deterministically sorts edges by Source ID -> Target ID -> Type.
 */
export function sortEdges(edges: Edge[]): Edge[] {
  return [...edges].sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    if (a.target !== b.target) return a.target.localeCompare(b.target);
    return a.type.localeCompare(b.type);
  });
}

/**
 * Deterministically sorts retrieval candidates.
 * Primary key: Score (descending)
 * Tie-breaker: ID (ascending)
 */
export function sortCandidates(
  candidates: RetrievalResult['ranked_candidates']
): RetrievalResult['ranked_candidates'] {
  return [...candidates].sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (Math.abs(scoreDiff) > 0.000001) {
      return scoreDiff;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * Assembles the context payload deterministically.
 */
export function assembleContext(retrieval: RetrievalResult): Context {
  // 1. Sort candidates deterministically
  const sortedCandidates = sortCandidates(retrieval.ranked_candidates);

  // 2. Build the context string
  // Format: "Context:\n[ID] Content\n..."
  const contextLines = sortedCandidates
    .filter(c => RetrievalSanitizer.validateTrust(c.node)) // Filter untrusted
    .map(c => {
      // Sanitize content
      const rawContent = JSON.stringify(c.node.properties);
      const content = RetrievalSanitizer.sanitize(rawContent);
      return `[${c.id}] ${content}`;
    });

  const payload = `Context:\n${contextLines.join('\n')}`;

  // 3. Compute Hash
  const hash = createHash('sha256').update(payload).digest('hex');

  return {
    payload,
    content_hash: `sha256:${hash}`,
    payload_size: Buffer.byteLength(payload)
  };
}

/**
 * Simulates a retrieval step with deterministic ordering enforcement.
 * In a real system, this would call the DB.
 */
export async function mockRetrieve(
  query: string,
  mockData: { nodes: Node[]; edges: Edge[] }
): Promise<RetrievalResult> {
  // Simulate finding nodes (just take all for mock)
  const nodes = sortNodes(mockData.nodes);

  // Simulate ranking (assign deterministic scores based on ID length for demo)
  const ranked_candidates = nodes.map(n => ({
    id: n.id,
    score: 1.0 / (n.id.length + 1), // Fake score
    source: 'graph' as const,
    node: n
  }));

  // Sort candidates
  const sorted = sortCandidates(ranked_candidates);

  return {
    traversal_path: nodes.map(n => n.id),
    ranked_candidates: sorted
  };
}
