/**
 * Threat Library Repository
 *
 * Data access layer for the threat pattern library with caching support.
 * Provides CRUD operations for ThreatArchetypes, TTPs, PatternTemplates, and IndicatorPatterns.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type ThreatArchetype,
  type TTP,
  type PatternTemplate,
  type IndicatorPattern,
  type GraphMotif,
  type Pagination,
  type ThreatFilter,
  type PatternFilter,
  type TTPFilter,
  type PatternStatus,
  type Metadata,
  threatArchetypeSchema,
  ttpSchema,
  patternTemplateSchema,
  indicatorPatternSchema,
  graphMotifSchema,
} from './types.js';
import { ThreatLibraryCache, createCacheKey } from './utils/cache.js';
import { NotFoundError, ValidationError, ConflictError } from './errors.js';

// ============================================================================
// INTERFACES
// ============================================================================

export interface RepositoryOptions {
  cacheMaxSize?: number;
  cacheTtlMs?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateOptions {
  author: string;
}

export interface UpdateOptions {
  author: string;
  description?: string;
}

// ============================================================================
// REPOSITORY IMPLEMENTATION
// ============================================================================

/**
 * In-memory repository with caching for the threat library
 * Can be replaced with a database-backed implementation
 */
export class ThreatLibraryRepository {
  private threatArchetypes: Map<string, ThreatArchetype> = new Map();
  private ttps: Map<string, TTP> = new Map();
  private patternTemplates: Map<string, PatternTemplate> = new Map();
  private indicatorPatterns: Map<string, IndicatorPattern> = new Map();
  private graphMotifs: Map<string, GraphMotif> = new Map();

  private cache: ThreatLibraryCache<unknown>;

  constructor(options: RepositoryOptions = {}) {
    this.cache = new ThreatLibraryCache({
      maxSize: options.cacheMaxSize ?? 1000,
      defaultTtlMs: options.cacheTtlMs ?? 300000, // 5 minutes
    });
  }

  // ==========================================================================
  // THREAT ARCHETYPE OPERATIONS
  // ==========================================================================

  /**
   * Create a new threat archetype
   */
  async createThreatArchetype(
    data: Omit<ThreatArchetype, 'id' | 'metadata'>,
    options: CreateOptions
  ): Promise<ThreatArchetype> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const metadata: Metadata = {
      createdAt: now,
      createdBy: options.author,
      updatedAt: now,
      updatedBy: options.author,
      version: 1,
      changelog: [
        {
          version: 1,
          timestamp: now,
          author: options.author,
          description: 'Initial creation',
        },
      ],
    };

    const archetype: ThreatArchetype = {
      ...data,
      id,
      metadata,
    };

    // Validate
    const result = threatArchetypeSchema.safeParse(archetype);
    if (!result.success) {
      throw new ValidationError('Invalid threat archetype data', result.error.errors);
    }

    this.threatArchetypes.set(id, archetype);
    this.invalidateArchetypeCache();

    return archetype;
  }

  /**
   * Get a threat archetype by ID
   */
  async getThreatArchetypeById(id: string): Promise<ThreatArchetype> {
    const cacheKey = createCacheKey('archetype', id);
    const cached = this.cache.get(cacheKey) as ThreatArchetype | undefined;
    if (cached) {
      return cached;
    }

    const archetype = this.threatArchetypes.get(id);
    if (!archetype) {
      throw new NotFoundError('ThreatArchetype', id);
    }

    this.cache.set(cacheKey, archetype);
    return archetype;
  }

  /**
   * List threat archetypes with filtering and pagination
   */
  async listThreatArchetypes(
    filter: ThreatFilter = {},
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<ThreatArchetype>> {
    let archetypes = Array.from(this.threatArchetypes.values());

    // Apply filters
    if (filter.status) {
      archetypes = archetypes.filter((a) => a.status === filter.status);
    }
    if (filter.severity !== undefined) {
      archetypes = archetypes.filter((a) => a.riskScore >= this.severityToScore(filter.severity!));
    }
    if (filter.sophistication) {
      archetypes = archetypes.filter((a) => a.sophistication === filter.sophistication);
    }
    if (filter.motivation) {
      archetypes = archetypes.filter((a) => a.motivation.includes(filter.motivation!));
    }
    if (filter.sector) {
      archetypes = archetypes.filter((a) =>
        a.targetSectors.some((s) =>
          s.toLowerCase().includes(filter.sector!.toLowerCase())
        )
      );
    }
    if (filter.active !== undefined) {
      archetypes = archetypes.filter((a) => a.active === filter.active);
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      archetypes = archetypes.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.description.toLowerCase().includes(searchLower) ||
          (a.aliases && a.aliases.some((alias) => alias.toLowerCase().includes(searchLower)))
      );
    }

    // Sort by risk score descending
    archetypes.sort((a, b) => b.riskScore - a.riskScore);

    // Paginate
    const total = archetypes.length;
    const totalPages = Math.ceil(total / pagination.limit);
    const offset = (pagination.page - 1) * pagination.limit;
    const items = archetypes.slice(offset, offset + pagination.limit);

    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Update a threat archetype
   */
  async updateThreatArchetype(
    id: string,
    updates: Partial<Omit<ThreatArchetype, 'id' | 'metadata'>>,
    options: UpdateOptions
  ): Promise<ThreatArchetype> {
    const existing = await this.getThreatArchetypeById(id);
    const now = new Date().toISOString();

    const newVersion = existing.metadata.version + 1;
    const metadata: Metadata = {
      ...existing.metadata,
      updatedAt: now,
      updatedBy: options.author,
      version: newVersion,
      changelog: [
        ...existing.metadata.changelog,
        {
          version: newVersion,
          timestamp: now,
          author: options.author,
          description: options.description ?? 'Updated',
        },
      ],
    };

    const updated: ThreatArchetype = {
      ...existing,
      ...updates,
      id,
      metadata,
    };

    // Validate
    const result = threatArchetypeSchema.safeParse(updated);
    if (!result.success) {
      throw new ValidationError('Invalid threat archetype data', result.error.errors);
    }

    this.threatArchetypes.set(id, updated);
    this.invalidateArchetypeCache(id);

    return updated;
  }

  /**
   * Delete a threat archetype (soft delete by setting status to ARCHIVED)
   */
  async deleteThreatArchetype(id: string, options: UpdateOptions): Promise<void> {
    await this.updateThreatArchetype(
      id,
      { status: 'ARCHIVED' as PatternStatus, active: false },
      { ...options, description: 'Archived' }
    );
  }

  // ==========================================================================
  // TTP OPERATIONS
  // ==========================================================================

  /**
   * Create a new TTP
   */
  async createTTP(
    data: Omit<TTP, 'id' | 'metadata'>,
    options: CreateOptions
  ): Promise<TTP> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const metadata: Metadata = {
      createdAt: now,
      createdBy: options.author,
      updatedAt: now,
      updatedBy: options.author,
      version: 1,
      changelog: [
        {
          version: 1,
          timestamp: now,
          author: options.author,
          description: 'Initial creation',
        },
      ],
    };

    const ttp: TTP = {
      ...data,
      id,
      metadata,
    };

    const result = ttpSchema.safeParse(ttp);
    if (!result.success) {
      throw new ValidationError('Invalid TTP data', result.error.errors);
    }

    this.ttps.set(id, ttp);
    this.invalidateTTPCache();

    return ttp;
  }

  /**
   * Get a TTP by ID
   */
  async getTTPById(id: string): Promise<TTP> {
    const cacheKey = createCacheKey('ttp', id);
    const cached = this.cache.get(cacheKey) as TTP | undefined;
    if (cached) {
      return cached;
    }

    const ttp = this.ttps.get(id);
    if (!ttp) {
      throw new NotFoundError('TTP', id);
    }

    this.cache.set(cacheKey, ttp);
    return ttp;
  }

  /**
   * List TTPs with filtering and pagination
   */
  async listTTPs(
    filter: TTPFilter = {},
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<TTP>> {
    let ttps = Array.from(this.ttps.values());

    // Apply filters
    if (filter.status) {
      ttps = ttps.filter((t) => t.status === filter.status);
    }
    if (filter.tactic) {
      ttps = ttps.filter((t) => t.tactic === filter.tactic);
    }
    if (filter.platform) {
      ttps = ttps.filter((t) =>
        t.platforms.some((p) => p.toLowerCase() === filter.platform!.toLowerCase())
      );
    }
    if (filter.severity) {
      ttps = ttps.filter((t) => t.severity === filter.severity);
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      ttps = ttps.filter(
        (t) =>
          t.name.toLowerCase().includes(searchLower) ||
          t.description.toLowerCase().includes(searchLower) ||
          t.techniqueId.toLowerCase().includes(searchLower)
      );
    }

    // Sort by severity
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
    ttps.sort(
      (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    );

    // Paginate
    const total = ttps.length;
    const totalPages = Math.ceil(total / pagination.limit);
    const offset = (pagination.page - 1) * pagination.limit;
    const items = ttps.slice(offset, offset + pagination.limit);

    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get TTPs by technique ID (MITRE ATT&CK)
   */
  async getTTPsByTechniqueId(techniqueId: string): Promise<TTP[]> {
    const cacheKey = createCacheKey('ttps-technique', techniqueId);
    const cached = this.cache.get(cacheKey) as TTP[] | undefined;
    if (cached) {
      return cached;
    }

    const ttps = Array.from(this.ttps.values()).filter(
      (t) => t.techniqueId === techniqueId || t.subTechniqueId === techniqueId
    );

    this.cache.set(cacheKey, ttps);
    return ttps;
  }

  /**
   * Update a TTP
   */
  async updateTTP(
    id: string,
    updates: Partial<Omit<TTP, 'id' | 'metadata'>>,
    options: UpdateOptions
  ): Promise<TTP> {
    const existing = await this.getTTPById(id);
    const now = new Date().toISOString();

    const newVersion = existing.metadata.version + 1;
    const metadata: Metadata = {
      ...existing.metadata,
      updatedAt: now,
      updatedBy: options.author,
      version: newVersion,
      changelog: [
        ...existing.metadata.changelog,
        {
          version: newVersion,
          timestamp: now,
          author: options.author,
          description: options.description ?? 'Updated',
        },
      ],
    };

    const updated: TTP = {
      ...existing,
      ...updates,
      id,
      metadata,
    };

    const result = ttpSchema.safeParse(updated);
    if (!result.success) {
      throw new ValidationError('Invalid TTP data', result.error.errors);
    }

    this.ttps.set(id, updated);
    this.invalidateTTPCache(id);

    return updated;
  }

  // ==========================================================================
  // PATTERN TEMPLATE OPERATIONS
  // ==========================================================================

  /**
   * Create a new pattern template
   */
  async createPatternTemplate(
    data: Omit<PatternTemplate, 'id' | 'metadata'>,
    options: CreateOptions
  ): Promise<PatternTemplate> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const metadata: Metadata = {
      createdAt: now,
      createdBy: options.author,
      updatedAt: now,
      updatedBy: options.author,
      version: 1,
      changelog: [
        {
          version: 1,
          timestamp: now,
          author: options.author,
          description: 'Initial creation',
        },
      ],
    };

    const pattern: PatternTemplate = {
      ...data,
      id,
      metadata,
    };

    const result = patternTemplateSchema.safeParse(pattern);
    if (!result.success) {
      throw new ValidationError('Invalid pattern template data', result.error.errors);
    }

    this.patternTemplates.set(id, pattern);
    this.invalidatePatternCache();

    return pattern;
  }

  /**
   * Get a pattern template by ID
   */
  async getPatternTemplateById(id: string): Promise<PatternTemplate> {
    const cacheKey = createCacheKey('pattern', id);
    const cached = this.cache.get(cacheKey) as PatternTemplate | undefined;
    if (cached) {
      return cached;
    }

    const pattern = this.patternTemplates.get(id);
    if (!pattern) {
      throw new NotFoundError('PatternTemplate', id);
    }

    this.cache.set(cacheKey, pattern);
    return pattern;
  }

  /**
   * List pattern templates with filtering and pagination
   */
  async listPatternTemplates(
    filter: PatternFilter = {},
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<PatternTemplate>> {
    let patterns = Array.from(this.patternTemplates.values());

    // Apply filters
    if (filter.status) {
      patterns = patterns.filter((p) => p.status === filter.status);
    }
    if (filter.category) {
      patterns = patterns.filter((p) => p.category === filter.category);
    }
    if (filter.severity) {
      patterns = patterns.filter((p) => p.severity === filter.severity);
    }
    if (filter.threatArchetypeId) {
      // Find patterns associated with the threat archetype
      const archetype = this.threatArchetypes.get(filter.threatArchetypeId);
      if (archetype) {
        const patternIds = new Set(archetype.patternTemplates);
        patterns = patterns.filter((p) => patternIds.has(p.id));
      }
    }
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      patterns = patterns.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort by severity
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'];
    patterns.sort(
      (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    );

    // Paginate
    const total = patterns.length;
    const totalPages = Math.ceil(total / pagination.limit);
    const offset = (pagination.page - 1) * pagination.limit;
    const items = patterns.slice(offset, offset + pagination.limit);

    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get patterns for a threat archetype
   */
  async getPatternsForThreat(threatId: string): Promise<PatternTemplate[]> {
    const cacheKey = createCacheKey('patterns-threat', threatId);
    const cached = this.cache.get(cacheKey) as PatternTemplate[] | undefined;
    if (cached) {
      return cached;
    }

    const archetype = await this.getThreatArchetypeById(threatId);
    const patterns: PatternTemplate[] = [];

    for (const patternId of archetype.patternTemplates) {
      try {
        const pattern = await this.getPatternTemplateById(patternId);
        patterns.push(pattern);
      } catch {
        // Pattern may have been deleted, skip
      }
    }

    this.cache.set(cacheKey, patterns);
    return patterns;
  }

  /**
   * Update a pattern template
   */
  async updatePatternTemplate(
    id: string,
    updates: Partial<Omit<PatternTemplate, 'id' | 'metadata'>>,
    options: UpdateOptions
  ): Promise<PatternTemplate> {
    const existing = await this.getPatternTemplateById(id);
    const now = new Date().toISOString();

    const newVersion = existing.metadata.version + 1;
    const metadata: Metadata = {
      ...existing.metadata,
      updatedAt: now,
      updatedBy: options.author,
      version: newVersion,
      changelog: [
        ...existing.metadata.changelog,
        {
          version: newVersion,
          timestamp: now,
          author: options.author,
          description: options.description ?? 'Updated',
        },
      ],
    };

    const updated: PatternTemplate = {
      ...existing,
      ...updates,
      id,
      metadata,
    };

    const result = patternTemplateSchema.safeParse(updated);
    if (!result.success) {
      throw new ValidationError('Invalid pattern template data', result.error.errors);
    }

    this.patternTemplates.set(id, updated);
    this.invalidatePatternCache(id);

    return updated;
  }

  // ==========================================================================
  // INDICATOR PATTERN OPERATIONS
  // ==========================================================================

  /**
   * Create a new indicator pattern
   */
  async createIndicatorPattern(
    data: Omit<IndicatorPattern, 'id' | 'metadata'>,
    options: CreateOptions
  ): Promise<IndicatorPattern> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const metadata: Metadata = {
      createdAt: now,
      createdBy: options.author,
      updatedAt: now,
      updatedBy: options.author,
      version: 1,
      changelog: [
        {
          version: 1,
          timestamp: now,
          author: options.author,
          description: 'Initial creation',
        },
      ],
    };

    const indicator: IndicatorPattern = {
      ...data,
      id,
      metadata,
    };

    const result = indicatorPatternSchema.safeParse(indicator);
    if (!result.success) {
      throw new ValidationError('Invalid indicator pattern data', result.error.errors);
    }

    this.indicatorPatterns.set(id, indicator);
    this.invalidateIndicatorCache();

    return indicator;
  }

  /**
   * Get an indicator pattern by ID
   */
  async getIndicatorPatternById(id: string): Promise<IndicatorPattern> {
    const cacheKey = createCacheKey('indicator', id);
    const cached = this.cache.get(cacheKey) as IndicatorPattern | undefined;
    if (cached) {
      return cached;
    }

    const indicator = this.indicatorPatterns.get(id);
    if (!indicator) {
      throw new NotFoundError('IndicatorPattern', id);
    }

    this.cache.set(cacheKey, indicator);
    return indicator;
  }

  /**
   * List indicator patterns
   */
  async listIndicatorPatterns(
    pagination: Pagination = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<IndicatorPattern>> {
    const indicators = Array.from(this.indicatorPatterns.values()).filter(
      (i) => i.status !== 'ARCHIVED'
    );

    const total = indicators.length;
    const totalPages = Math.ceil(total / pagination.limit);
    const offset = (pagination.page - 1) * pagination.limit;
    const items = indicators.slice(offset, offset + pagination.limit);

    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
      },
    };
  }

  // ==========================================================================
  // GRAPH MOTIF OPERATIONS
  // ==========================================================================

  /**
   * Create a new graph motif
   */
  async createGraphMotif(data: Omit<GraphMotif, 'id'>): Promise<GraphMotif> {
    const id = uuidv4();
    const motif: GraphMotif = { ...data, id };

    const result = graphMotifSchema.safeParse(motif);
    if (!result.success) {
      throw new ValidationError('Invalid graph motif data', result.error.errors);
    }

    this.graphMotifs.set(id, motif);
    return motif;
  }

  /**
   * Get a graph motif by ID
   */
  async getGraphMotifById(id: string): Promise<GraphMotif> {
    const motif = this.graphMotifs.get(id);
    if (!motif) {
      throw new NotFoundError('GraphMotif', id);
    }
    return motif;
  }

  /**
   * Get all graph motifs for a pattern template
   */
  async getGraphMotifsForPattern(patternId: string): Promise<GraphMotif[]> {
    const pattern = await this.getPatternTemplateById(patternId);
    return pattern.graphMotifs;
  }

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  /**
   * Get all TTPs for a threat archetype
   */
  async getTTPsForThreat(threatId: string): Promise<TTP[]> {
    const archetype = await this.getThreatArchetypeById(threatId);
    const ttps: TTP[] = [];

    for (const ttpId of archetype.typicalTTPs) {
      try {
        const ttp = await this.getTTPById(ttpId);
        ttps.push(ttp);
      } catch {
        // TTP may have been deleted, skip
      }
    }

    return ttps;
  }

  /**
   * Get all indicators for a threat archetype
   */
  async getIndicatorsForThreat(threatId: string): Promise<IndicatorPattern[]> {
    const archetype = await this.getThreatArchetypeById(threatId);
    const indicators: IndicatorPattern[] = [];

    for (const indicatorId of archetype.indicators) {
      try {
        const indicator = await this.getIndicatorPatternById(indicatorId);
        indicators.push(indicator);
      } catch {
        // Indicator may have been deleted, skip
      }
    }

    return indicators;
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  /**
   * Get repository statistics
   */
  async getStatistics(): Promise<{
    threatArchetypes: number;
    ttps: number;
    patternTemplates: number;
    indicatorPatterns: number;
    graphMotifs: number;
    cacheStats: { size: number; hits: number; misses: number; evictions: number };
  }> {
    return {
      threatArchetypes: this.threatArchetypes.size,
      ttps: this.ttps.size,
      patternTemplates: this.patternTemplates.size,
      indicatorPatterns: this.indicatorPatterns.size,
      graphMotifs: this.graphMotifs.size,
      cacheStats: this.cache.getStats(),
    };
  }

  // ==========================================================================
  // CACHE HELPERS
  // ==========================================================================

  private invalidateArchetypeCache(id?: string): void {
    if (id) {
      this.cache.delete(createCacheKey('archetype', id));
    }
    // Invalidate list caches
    this.cache.keys().forEach((key) => {
      if (key.startsWith('archetypes-') || key.startsWith('patterns-threat')) {
        this.cache.delete(key);
      }
    });
  }

  private invalidateTTPCache(id?: string): void {
    if (id) {
      this.cache.delete(createCacheKey('ttp', id));
    }
    this.cache.keys().forEach((key) => {
      if (key.startsWith('ttps-')) {
        this.cache.delete(key);
      }
    });
  }

  private invalidatePatternCache(id?: string): void {
    if (id) {
      this.cache.delete(createCacheKey('pattern', id));
    }
    this.cache.keys().forEach((key) => {
      if (key.startsWith('patterns-')) {
        this.cache.delete(key);
      }
    });
  }

  private invalidateIndicatorCache(id?: string): void {
    if (id) {
      this.cache.delete(createCacheKey('indicator', id));
    }
    this.cache.keys().forEach((key) => {
      if (key.startsWith('indicators-')) {
        this.cache.delete(key);
      }
    });
  }

  private severityToScore(severity: string): number {
    const scores: Record<string, number> = {
      CRITICAL: 80,
      HIGH: 60,
      MEDIUM: 40,
      LOW: 20,
      INFORMATIONAL: 0,
    };
    return scores[severity] ?? 0;
  }
}

/**
 * Create a singleton repository instance
 */
let repositoryInstance: ThreatLibraryRepository | null = null;

export function getRepository(options?: RepositoryOptions): ThreatLibraryRepository {
  if (!repositoryInstance) {
    repositoryInstance = new ThreatLibraryRepository(options);
  }
  return repositoryInstance;
}

export function resetRepository(): void {
  repositoryInstance = null;
}
