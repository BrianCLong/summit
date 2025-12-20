/**
 * @fileoverview Graph-backed memory system for IntelGraph agents
 * Provides persistent, queryable memory backed by Neo4j
 * @module @intelgraph/strands-agents/memory/graph-memory
 */

import type { Driver, Session } from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';
import { MemoryEntrySchema, type MemoryEntry } from '../types.js';

// ============================================================================
// Types
// ============================================================================

export interface GraphMemoryConfig {
  /** Neo4j driver instance */
  driver: Driver;
  /** Database name */
  database?: string;
  /** Agent identifier */
  agentId: string;
  /** Maximum entries to keep per session */
  maxEntriesPerSession?: number;
  /** TTL for memory entries (ISO 8601 duration) */
  defaultTTL?: string;
}

export interface MemorySearchOptions {
  /** Session ID to search within */
  sessionId?: string;
  /** Memory types to filter */
  types?: MemoryEntry['type'][];
  /** Minimum importance threshold */
  minImportance?: number;
  /** Text search query */
  query?: string;
  /** Maximum results */
  limit?: number;
  /** Include expired entries */
  includeExpired?: boolean;
}

export interface ConversationContext {
  /** Recent conversation turns */
  recentTurns: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
  /** Relevant facts from memory */
  relevantFacts: string[];
  /** Active entities being discussed */
  activeEntities: Array<{
    id: string;
    type: string;
    label: string;
  }>;
  /** Current investigation context */
  investigation?: {
    id: string;
    title: string;
    status: string;
  };
}

// ============================================================================
// Graph Memory Implementation
// ============================================================================

/**
 * Creates a graph-backed memory system for Strands Agents
 *
 * Features:
 * - Persistent memory stored in Neo4j
 * - Hierarchical organization (facts, entities, insights)
 * - Importance-based retrieval
 * - Automatic expiration
 * - Full-text search support
 *
 * @example
 * ```typescript
 * import { createGraphMemory } from '@intelgraph/strands-agents/memory';
 * import neo4j from 'neo4j-driver';
 *
 * const driver = neo4j.driver('bolt://localhost:7687');
 *
 * const memory = createGraphMemory({
 *   driver,
 *   agentId: 'investigation-agent-1',
 * });
 *
 * // Store a fact
 * await memory.remember({
 *   type: 'FACT',
 *   content: 'Entity X is connected to Entity Y through Organization Z',
 *   importance: 0.8,
 * });
 *
 * // Recall relevant memories
 * const memories = await memory.recall({
 *   query: 'Entity X connections',
 *   limit: 10,
 * });
 * ```
 */
export function createGraphMemory(config: GraphMemoryConfig) {
  const {
    driver,
    database = 'neo4j',
    agentId,
    maxEntriesPerSession = 1000,
    defaultTTL = 'P7D', // 7 days
  } = config;

  let currentSessionId = uuidv4();

  /**
   * Start a new memory session
   */
  function startSession(sessionId?: string): string {
    currentSessionId = sessionId || uuidv4();
    return currentSessionId;
  }

  /**
   * Get current session ID
   */
  function getSessionId(): string {
    return currentSessionId;
  }

  /**
   * Store a memory entry
   */
  async function remember(entry: Omit<MemoryEntry, 'id' | 'agentId' | 'sessionId' | 'timestamp'>) {
    const memoryEntry: MemoryEntry = {
      ...entry,
      id: uuidv4(),
      agentId,
      sessionId: currentSessionId,
      timestamp: new Date().toISOString(),
      expiresAt: entry.expiresAt || calculateExpiry(defaultTTL),
    };

    // Validate entry
    const validated = MemoryEntrySchema.parse(memoryEntry);

    let session: Session | null = null;
    try {
      session = driver.session({ database, defaultAccessMode: 'WRITE' });

      const query = `
        MERGE (a:Agent {id: $agentId})
        MERGE (s:MemorySession {id: $sessionId})
        MERGE (a)-[:HAS_SESSION]->(s)

        CREATE (m:Memory {
          id: $id,
          type: $type,
          content: $content,
          importance: $importance,
          timestamp: datetime($timestamp),
          expiresAt: datetime($expiresAt)
        })
        SET m += $metadata

        CREATE (s)-[:CONTAINS_MEMORY]->(m)

        // Link to entities if mentioned
        WITH m
        OPTIONAL MATCH (e:Entity)
        WHERE e.label IN $mentionedLabels
        WITH m, collect(e) as entities
        FOREACH (e IN entities | CREATE (m)-[:MENTIONS]->(e))

        RETURN m { .* } as memory
      `;

      // Extract potential entity mentions from content
      const mentionedLabels = extractEntityMentions(validated.content);

      const result = await session.run(query, {
        agentId,
        sessionId: currentSessionId,
        id: validated.id,
        type: validated.type,
        content: validated.content,
        importance: validated.importance,
        timestamp: validated.timestamp,
        expiresAt: validated.expiresAt || calculateExpiry(defaultTTL),
        metadata: validated.metadata || {},
        mentionedLabels,
      });

      return result.records[0]?.get('memory');
    } finally {
      if (session) {
        await session.close();
      }
    }
  }

  /**
   * Recall memories based on search criteria
   */
  async function recall(options: MemorySearchOptions = {}): Promise<MemoryEntry[]> {
    const {
      sessionId = currentSessionId,
      types,
      minImportance = 0,
      query,
      limit = 20,
      includeExpired = false,
    } = options;

    let session: Session | null = null;
    try {
      session = driver.session({ database, defaultAccessMode: 'READ' });

      const filters: string[] = ['m.agentId = $agentId'];

      if (sessionId) {
        filters.push('s.id = $sessionId');
      }
      if (types?.length) {
        filters.push('m.type IN $types');
      }
      if (minImportance > 0) {
        filters.push('m.importance >= $minImportance');
      }
      if (!includeExpired) {
        filters.push('(m.expiresAt IS NULL OR m.expiresAt > datetime())');
      }

      let cypher: string;
      if (query) {
        // Full-text search
        cypher = `
          CALL db.index.fulltext.queryNodes('memory_search', $query)
          YIELD node as m, score
          MATCH (s:MemorySession)-[:CONTAINS_MEMORY]->(m)
          WHERE ${filters.join(' AND ')}
          RETURN m { .*, relevance: score } as memory
          ORDER BY score DESC, m.importance DESC, m.timestamp DESC
          LIMIT $limit
        `;
      } else {
        cypher = `
          MATCH (s:MemorySession)-[:CONTAINS_MEMORY]->(m:Memory)
          WHERE ${filters.join(' AND ')}
          RETURN m { .* } as memory
          ORDER BY m.importance DESC, m.timestamp DESC
          LIMIT $limit
        `;
      }

      const result = await session.run(cypher, {
        agentId,
        sessionId,
        types,
        minImportance,
        query: query ? `${query}~` : undefined,
        limit,
      });

      return result.records.map((r) => r.get('memory'));
    } finally {
      if (session) {
        await session.close();
      }
    }
  }

  /**
   * Get conversation context for the current session
   */
  async function getContext(maxTurns = 10): Promise<ConversationContext> {
    let session: Session | null = null;
    try {
      session = driver.session({ database, defaultAccessMode: 'READ' });

      // Get recent memories of type ACTION (conversation turns)
      const turnsQuery = `
        MATCH (s:MemorySession {id: $sessionId})-[:CONTAINS_MEMORY]->(m:Memory)
        WHERE m.type IN ['ACTION', 'FACT']
        RETURN m { .* } as memory
        ORDER BY m.timestamp DESC
        LIMIT $maxTurns
      `;

      const turnsResult = await session.run(turnsQuery, {
        sessionId: currentSessionId,
        maxTurns,
      });

      const recentTurns = turnsResult.records
        .map((r) => {
          const m = r.get('memory');
          return {
            role: m.metadata?.role || 'assistant',
            content: m.content,
            timestamp: m.timestamp,
          };
        })
        .reverse();

      // Get relevant facts
      const factsQuery = `
        MATCH (s:MemorySession {id: $sessionId})-[:CONTAINS_MEMORY]->(m:Memory)
        WHERE m.type = 'FACT'
          AND m.importance >= 0.5
          AND (m.expiresAt IS NULL OR m.expiresAt > datetime())
        RETURN m.content as fact
        ORDER BY m.importance DESC
        LIMIT 10
      `;

      const factsResult = await session.run(factsQuery, {
        sessionId: currentSessionId,
      });

      const relevantFacts = factsResult.records.map((r) => r.get('fact'));

      // Get active entities
      const entitiesQuery = `
        MATCH (s:MemorySession {id: $sessionId})-[:CONTAINS_MEMORY]->(m:Memory)-[:MENTIONS]->(e:Entity)
        WHERE m.timestamp > datetime() - duration('PT1H')
        RETURN DISTINCT e { .id, .type, .label } as entity
        LIMIT 20
      `;

      const entitiesResult = await session.run(entitiesQuery, {
        sessionId: currentSessionId,
      });

      const activeEntities = entitiesResult.records.map((r) => r.get('entity'));

      // Get current investigation if any
      const investigationQuery = `
        MATCH (s:MemorySession {id: $sessionId})-[:CONTAINS_MEMORY]->(m:Memory)
        WHERE m.metadata.investigationId IS NOT NULL
        WITH m.metadata.investigationId as invId
        ORDER BY m.timestamp DESC
        LIMIT 1
        MATCH (i:Investigation {id: invId})
        RETURN i { .id, .title, .status } as investigation
      `;

      const invResult = await session.run(investigationQuery, {
        sessionId: currentSessionId,
      });

      const investigation = invResult.records[0]?.get('investigation');

      return {
        recentTurns,
        relevantFacts,
        activeEntities,
        investigation,
      };
    } finally {
      if (session) {
        await session.close();
      }
    }
  }

  /**
   * Forget memories (soft delete by setting expiry to now)
   */
  async function forget(memoryIds: string[]) {
    let session: Session | null = null;
    try {
      session = driver.session({ database, defaultAccessMode: 'WRITE' });

      const query = `
        MATCH (m:Memory)
        WHERE m.id IN $memoryIds AND m.agentId = $agentId
        SET m.expiresAt = datetime()
        RETURN count(m) as forgotten
      `;

      const result = await session.run(query, { memoryIds, agentId });
      return result.records[0]?.get('forgotten')?.toNumber() || 0;
    } finally {
      if (session) {
        await session.close();
      }
    }
  }

  /**
   * Consolidate memories - merge similar memories and update importance
   */
  async function consolidate() {
    let session: Session | null = null;
    try {
      session = driver.session({ database, defaultAccessMode: 'WRITE' });

      // Increase importance of frequently accessed memories
      const boostQuery = `
        MATCH (s:MemorySession {id: $sessionId})-[:CONTAINS_MEMORY]->(m:Memory)
        WHERE m.type = 'FACT'
          AND m.accessCount IS NOT NULL
          AND m.accessCount > 3
        SET m.importance = CASE
          WHEN m.importance < 0.9 THEN m.importance + 0.1
          ELSE m.importance
        END
        RETURN count(m) as boosted
      `;

      await session.run(boostQuery, { sessionId: currentSessionId });

      // Clean up expired memories
      const cleanupQuery = `
        MATCH (m:Memory)
        WHERE m.agentId = $agentId
          AND m.expiresAt IS NOT NULL
          AND m.expiresAt < datetime() - duration('P1D')
        DETACH DELETE m
        RETURN count(m) as deleted
      `;

      const cleanupResult = await session.run(cleanupQuery, { agentId });
      return cleanupResult.records[0]?.get('deleted')?.toNumber() || 0;
    } finally {
      if (session) {
        await session.close();
      }
    }
  }

  /**
   * Get memory statistics
   */
  async function getStats() {
    let session: Session | null = null;
    try {
      session = driver.session({ database, defaultAccessMode: 'READ' });

      const query = `
        MATCH (a:Agent {id: $agentId})-[:HAS_SESSION]->(s:MemorySession)-[:CONTAINS_MEMORY]->(m:Memory)
        WITH s, m
        WHERE m.expiresAt IS NULL OR m.expiresAt > datetime()
        RETURN
          count(DISTINCT s) as sessionCount,
          count(m) as totalMemories,
          avg(m.importance) as avgImportance,
          collect(DISTINCT m.type) as memoryTypes,
          max(m.timestamp) as lastActivity
      `;

      const result = await session.run(query, { agentId });
      const record = result.records[0];

      return {
        agentId,
        sessionCount: record?.get('sessionCount')?.toNumber() || 0,
        totalMemories: record?.get('totalMemories')?.toNumber() || 0,
        avgImportance: record?.get('avgImportance') || 0,
        memoryTypes: record?.get('memoryTypes') || [],
        lastActivity: record?.get('lastActivity'),
      };
    } finally {
      if (session) {
        await session.close();
      }
    }
  }

  return {
    startSession,
    getSessionId,
    remember,
    recall,
    getContext,
    forget,
    consolidate,
    getStats,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateExpiry(duration: string): string {
  // Parse ISO 8601 duration and add to current time
  // Simplified implementation - in production use a proper duration library
  const now = new Date();
  const durationMatch = duration.match(/P(\d+)D/);
  if (durationMatch) {
    const days = parseInt(durationMatch[1], 10);
    now.setDate(now.getDate() + days);
  }
  return now.toISOString();
}

function extractEntityMentions(content: string): string[] {
  // Simple extraction - in production, use NER
  // Look for capitalized words that might be entity names
  const matches = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  return [...new Set(matches)].slice(0, 10);
}

export type GraphMemory = ReturnType<typeof createGraphMemory>;
