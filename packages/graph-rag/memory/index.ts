import { createHash } from 'crypto';

export interface MemoryEntry {
  agentId: string;
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface MemoryNode {
  evidenceId: string;
  agentId: string;
  content: string;
  timestamp: number;
  metadata: string; // JSON stringified for graph storage
  labels: string[];
}

export class SharedMemory {
  /**
   * Generates a deterministic Evidence ID for a memory entry.
   * Format: EVID-<agentId>-<contentHash>
   */
  static generateEvidenceId(agentId: string, content: string): string {
    const normalizedContent = content.trim();
    const hash = createHash('sha256').update(normalizedContent).digest('hex').substring(0, 16);
    // Sanitize agentId to be alphanumeric
    const safeAgentId = agentId.replace(/[^a-zA-Z0-9]/g, '');
    return `EVID-${safeAgentId}-${hash}`;
  }

  /**
   * Prepares a memory node object for insertion into the graph.
   * Ensures deterministic properties.
   */
  static createMemoryNode(entry: MemoryEntry): MemoryNode {
    const evidenceId = this.generateEvidenceId(entry.agentId, entry.content);

    // Sort metadata keys for deterministic JSON serialization
    const sortedMetadata: Record<string, any> = {};
    if (entry.metadata) {
      Object.keys(entry.metadata).sort().forEach(key => {
        sortedMetadata[key] = entry.metadata![key];
      });
    }

    return {
      evidenceId,
      agentId: entry.agentId,
      content: entry.content.trim(),
      timestamp: entry.timestamp,
      metadata: JSON.stringify(sortedMetadata),
      labels: ['Memory', 'Evidence', `Agent:${entry.agentId}`]
    };
  }
}
