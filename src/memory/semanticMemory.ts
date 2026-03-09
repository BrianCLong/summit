import { createHash } from 'crypto';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join } from 'path';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

interface MemoryEntry {
  id: string;
  type: 'code' | 'error' | 'solution' | 'pattern' | 'context';
  content: string;
  embedding?: number[];
  metadata: {
    timestamp: string;
    project: string;
    file?: string;
    tags: string[];
    frequency: number;
    lastAccessed: string;
    success: boolean;
  };
  relations: string[];
}

interface SemanticQuery {
  query: string;
  type?: string[];
  tags?: string[];
  similarity?: number;
  limit?: number;
}

interface SemanticResult {
  entry: MemoryEntry;
  similarity: number;
  rank: number;
}

export class SemanticMemory {
  private memoryPath: string;
  private indexPath: string;
  private entries: Map<string, MemoryEntry>;
  private vectorDimension: number = 1536; // OpenAI embedding dimension
  private maxEntries: number = 10000;

  constructor(projectRoot: string = process.cwd()) {
    this.memoryPath = join(projectRoot, '.maestro', 'memory');
    this.indexPath = join(this.memoryPath, 'index.json');
    this.entries = new Map();
  }

  async initialize(): Promise<void> {
    try {
      await mkdir(this.memoryPath, { recursive: true });
      await this.loadMemory();
    } catch (error) {
      console.warn('Failed to initialize semantic memory:', error.message);
    }
  }

  async store(
    content: string,
    type: MemoryEntry['type'],
    metadata: Partial<MemoryEntry['metadata']> = {},
  ): Promise<string> {
    const id = this.generateId(content, type);
    const existing = this.entries.get(id);

    if (existing) {
      // Update existing entry
      existing.metadata.frequency += 1;
      existing.metadata.lastAccessed = new Date().toISOString();
      await this.persistMemory();
      return id;
    }

    // Create new entry
    const entry: MemoryEntry = {
      id,
      type,
      content: this.normalizeContent(content),
      metadata: {
        timestamp: new Date().toISOString(),
        project: this.extractProjectName(),
        frequency: 1,
        lastAccessed: new Date().toISOString(),
        success: true,
        tags: [],
        ...metadata,
      },
      relations: [],
    };

    // Generate embedding for semantic search
    try {
      entry.embedding = await this.generateEmbedding(content);
    } catch (error) {
      console.warn(`Failed to generate embedding for ${id}:`, error.message);
    }

    // Extract tags automatically
    entry.metadata.tags = [
      ...entry.metadata.tags,
      ...this.extractTags(content, type),
    ];

    this.entries.set(id, entry);

    // Enforce memory limits
    await this.enforceMemoryLimits();
    await this.persistMemory();

    return id;
  }

  async retrieve(query: SemanticQuery): Promise<SemanticResult[]> {
    let candidates = Array.from(this.entries.values());

    // Filter by type
    if (query.type && query.type.length > 0) {
      candidates = candidates.filter((entry) =>
        query.type!.includes(entry.type),
      );
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      candidates = candidates.filter((entry) =>
        query.tags!.some((tag) => entry.metadata.tags.includes(tag)),
      );
    }

    // Semantic similarity search
    const results: SemanticResult[] = [];

    if (candidates.length === 0) {
      return results;
    }

    try {
      const queryEmbedding = await this.generateEmbedding(query.query);

      for (const entry of candidates) {
        if (!entry.embedding) continue;

        const similarity = this.cosineSimilarity(
          queryEmbedding,
          entry.embedding,
        );

        if (similarity >= (query.similarity || 0.7)) {
          results.push({
            entry,
            similarity,
            rank: 0, // Will be set after sorting
          });
        }
      }
    } catch (error) {
      console.warn(
        'Failed to perform semantic search, falling back to text search',
      );

      // Fallback to text-based search
      const queryLower = query.query.toLowerCase();
      for (const entry of candidates) {
        const contentLower = entry.content.toLowerCase();

        if (contentLower.includes(queryLower)) {
          const similarity = this.textSimilarity(queryLower, contentLower);
          results.push({
            entry,
            similarity,
            rank: 0,
          });
        }
      }
    }

    // Sort by similarity and frequency
    results.sort((a, b) => {
      const scoreA =
        a.similarity * 0.7 + (a.entry.metadata.frequency / 100) * 0.3;
      const scoreB =
        b.similarity * 0.7 + (b.entry.metadata.frequency / 100) * 0.3;
      return scoreB - scoreA;
    });

    // Set ranks and limit results
    results.forEach((result, index) => {
      result.rank = index + 1;
      // Update access time
      result.entry.metadata.lastAccessed = new Date().toISOString();
    });

    const limited = results.slice(0, query.limit || 10);

    // Persist updated access times
    if (limited.length > 0) {
      await this.persistMemory();
    }

    return limited;
  }

  async addRelation(fromId: string, toId: string): Promise<void> {
    const fromEntry = this.entries.get(fromId);
    const toEntry = this.entries.get(toId);

    if (fromEntry && toEntry) {
      if (!fromEntry.relations.includes(toId)) {
        fromEntry.relations.push(toId);
      }
      if (!toEntry.relations.includes(fromId)) {
        toEntry.relations.push(fromId);
      }
      await this.persistMemory();
    }
  }

  async recordSuccess(id: string, success: boolean): Promise<void> {
    const entry = this.entries.get(id);
    if (entry) {
      entry.metadata.success = success;
      entry.metadata.frequency += success ? 1 : -0.5;
      entry.metadata.lastAccessed = new Date().toISOString();
      await this.persistMemory();
    }
  }

  async forget(id: string): Promise<void> {
    this.entries.delete(id);
    await this.persistMemory();
  }

  async cleanup(olderThanDays: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let removed = 0;
    for (const [id, entry] of this.entries.entries()) {
      const lastAccessed = new Date(entry.metadata.lastAccessed);

      if (lastAccessed < cutoff && entry.metadata.frequency < 2) {
        this.entries.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      await this.persistMemory();
    }

    return removed;
  }

  async getStats(): Promise<{
    totalEntries: number;
    typeDistribution: Record<string, number>;
    averageFrequency: number;
    memorySize: number;
  }> {
    const typeDistribution: Record<string, number> = {};
    let totalFrequency = 0;

    for (const entry of this.entries.values()) {
      typeDistribution[entry.type] = (typeDistribution[entry.type] || 0) + 1;
      totalFrequency += entry.metadata.frequency;
    }

    return {
      totalEntries: this.entries.size,
      typeDistribution,
      averageFrequency: totalFrequency / this.entries.size || 0,
      memorySize: JSON.stringify(Array.from(this.entries.values())).length,
    };
  }

  private generateId(content: string, type: string): string {
    return createHash('sha256')
      .update(content + type)
      .digest('hex')
      .substring(0, 16);
  }

  private normalizeContent(content: string): string {
    return content.trim().replace(/\s+/g, ' ').substring(0, 10000); // Limit content size
  }

  private extractProjectName(): string {
    try {
      const packageJson = require(join(process.cwd(), 'package.json'));
      return packageJson.name || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private extractTags(content: string, type: string): string[] {
    const tags: string[] = [];

    // Language/framework tags
    const patterns = {
      typescript: /\.ts|interface|type|export/i,
      javascript: /\.js|function|const|let|var/i,
      react: /jsx|tsx|useEffect|useState|Component/i,
      node: /require|module\.exports|process\./i,
      git: /git|commit|branch|merge/i,
      test: /test|spec|describe|it\(/i,
      error: /error|exception|fail|throw/i,
      api: /api|endpoint|route|express/i,
      database: /sql|query|database|db\./i,
      security: /auth|token|password|security/i,
    };

    for (const [tag, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {
        tags.push(tag);
      }
    }

    // Add type as tag
    tags.push(type);

    return [...new Set(tags)]; // Remove duplicates
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // This would normally call OpenAI API or similar
    // For now, we'll use a simple hash-based approach
    const hash = createHash('sha256').update(text).digest();
    const embedding: number[] = [];

    for (let i = 0; i < Math.min(this.vectorDimension, hash.length * 8); i++) {
      const byteIndex = Math.floor(i / 8);
      const bitIndex = i % 8;
      const bit = (hash[byteIndex] >> bitIndex) & 1;
      embedding.push(bit * 2 - 1); // Convert to -1 or 1
    }

    // Pad if necessary
    while (embedding.length < this.vectorDimension) {
      embedding.push(0);
    }

    return embedding.slice(0, this.vectorDimension);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private textSimilarity(query: string, content: string): number {
    const queryWords = query.split(/\s+/);
    const contentWords = content.split(/\s+/);

    const querySet = new Set(queryWords);
    const contentSet = new Set(contentWords);

    const intersection = new Set(
      [...querySet].filter((x) => contentSet.has(x)),
    );
    const union = new Set([...querySet, ...contentSet]);

    return intersection.size / union.size; // Jaccard similarity
  }

  private async loadMemory(): Promise<void> {
    try {
      await access(this.indexPath);
      const data = await readFile(this.indexPath, 'utf8');
      const entries: MemoryEntry[] = JSON.parse(data);

      this.entries.clear();
      for (const entry of entries) {
        this.entries.set(entry.id, entry);
      }
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      this.entries.clear();
    }
  }

  private async persistMemory(): Promise<void> {
    try {
      const data = JSON.stringify(Array.from(this.entries.values()), null, 2);
      await writeFile(this.indexPath, data);
    } catch (error) {
      console.warn('Failed to persist memory:', error.message);
    }
  }

  private async enforceMemoryLimits(): Promise<void> {
    if (this.entries.size <= this.maxEntries) return;

    // Remove least frequently used entries
    const sortedEntries = Array.from(this.entries.values()).sort((a, b) => {
      const scoreA =
        a.metadata.frequency +
        (Date.now() - new Date(a.metadata.lastAccessed).getTime()) /
          (1000 * 60 * 60 * 24);
      const scoreB =
        b.metadata.frequency +
        (Date.now() - new Date(b.metadata.lastAccessed).getTime()) /
          (1000 * 60 * 60 * 24);
      return scoreA - scoreB;
    });

    const toRemove = sortedEntries.slice(
      0,
      this.entries.size - this.maxEntries,
    );
    for (const entry of toRemove) {
      this.entries.delete(entry.id);
    }
  }
}
