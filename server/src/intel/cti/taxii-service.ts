/**
 * TAXII 2.1 Service Implementation
 *
 * Provides a TAXII 2.1 compliant server for sharing STIX bundles
 * with external systems and partners.
 *
 * @see https://docs.oasis-open.org/cti/taxii/v2.1/taxii-v2.1.html
 */

import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Driver } from 'neo4j-driver';
import type {
  StixBundle,
  StixObject,
  StixIdentifier,
  TaxiiDiscovery,
  TaxiiApiRoot,
  TaxiiCollection,
  TaxiiManifest,
  TaxiiManifestEntry,
  TaxiiEnvelope,
  TaxiiStatus,
} from './types.js';
import {
  StixBundleFactory,
  createBundle,
  validateBundle,
} from './bundle-serializer.js';
import logger from '../../config/logger.js';

const taxiiLogger = logger.child({ module: 'taxii-service' });

// ============================================================================
// Types
// ============================================================================

export interface TaxiiServiceConfig {
  /** Base URL for the TAXII server */
  baseUrl: string;
  /** Title for the discovery document */
  title: string;
  /** Description for the discovery document */
  description?: string;
  /** Contact email */
  contact?: string;
  /** API root path */
  apiRootPath?: string;
  /** Maximum content length for requests (bytes) */
  maxContentLength?: number;
  /** Default page size */
  defaultPageSize?: number;
  /** Maximum page size */
  maxPageSize?: number;
}

export interface CollectionConfig {
  id: string;
  title: string;
  description?: string;
  alias?: string;
  canRead: boolean;
  canWrite: boolean;
  mediaTypes?: string[];
  /** Tenant ID restriction (null = all tenants) */
  tenantId?: string;
  /** Entity kinds to include */
  entityKinds?: string[];
}

export interface ObjectQueryOptions {
  /** Filter by added_after timestamp */
  addedAfter?: string;
  /** Pagination limit */
  limit?: number;
  /** Pagination cursor */
  next?: string;
  /** Match filters */
  match?: Record<string, string>;
  /** Filter by STIX type */
  type?: string[];
  /** Filter by STIX ID */
  id?: StixIdentifier[];
  /** Filter by spec version */
  specVersion?: string[];
}

// ============================================================================
// TAXII Service
// ============================================================================

export class TaxiiService {
  private readonly config: Required<TaxiiServiceConfig>;
  private readonly collections: Map<string, CollectionConfig> = new Map();
  private readonly objectStore: Map<string, Map<string, StoredObject>> = new Map();
  private readonly pendingStatuses: Map<string, TaxiiStatus> = new Map();
  private bundleFactory: StixBundleFactory | null = null;

  constructor(
    config: TaxiiServiceConfig,
    private deps: { pg: Pool; neo4j: Driver },
  ) {
    this.config = {
      baseUrl: config.baseUrl,
      title: config.title,
      description: config.description || 'IntelGraph TAXII 2.1 Server',
      contact: config.contact || 'security@intelgraph.io',
      apiRootPath: config.apiRootPath || '/taxii2/api',
      maxContentLength: config.maxContentLength || 10_485_760, // 10MB
      defaultPageSize: config.defaultPageSize || 100,
      maxPageSize: config.maxPageSize || 1000,
    };

    this.bundleFactory = new StixBundleFactory(deps);

    // Initialize with default collection
    this.registerCollection({
      id: 'default',
      title: 'IntelGraph Intelligence Feed',
      description: 'Default collection for IntelGraph threat intelligence sharing.',
      alias: 'intel-feed',
      canRead: true,
      canWrite: true,
    });

    taxiiLogger.info({
      baseUrl: this.config.baseUrl,
      title: this.config.title,
    }, 'TAXII service initialized');
  }

  // ==========================================================================
  // Collection Management
  // ==========================================================================

  /**
   * Register a new collection
   */
  registerCollection(collection: CollectionConfig): void {
    this.collections.set(collection.id, collection);
    this.objectStore.set(collection.id, new Map());
    taxiiLogger.info({ collectionId: collection.id, title: collection.title }, 'Collection registered');
  }

  /**
   * Get collection by ID
   */
  getCollection(collectionId: string): CollectionConfig | undefined {
    return this.collections.get(collectionId);
  }

  /**
   * List all collections (filtered by access)
   */
  listCollections(canRead?: boolean, canWrite?: boolean): CollectionConfig[] {
    let collections = Array.from(this.collections.values());

    if (canRead !== undefined) {
      collections = collections.filter(c => c.canRead === canRead);
    }

    if (canWrite !== undefined) {
      collections = collections.filter(c => c.canWrite === canWrite);
    }

    return collections;
  }

  // ==========================================================================
  // TAXII Discovery Endpoints
  // ==========================================================================

  /**
   * Generate discovery document
   */
  getDiscoveryDocument(): TaxiiDiscovery {
    return {
      title: this.config.title,
      description: this.config.description,
      contact: this.config.contact,
      default: `${this.config.baseUrl}${this.config.apiRootPath}/`,
      api_roots: [`${this.config.baseUrl}${this.config.apiRootPath}/`],
    };
  }

  /**
   * Generate API root information
   */
  getApiRootInfo(): TaxiiApiRoot {
    return {
      title: `${this.config.title} API Root`,
      description: `Primary API root for ${this.config.title}`,
      versions: ['2.1'],
      max_content_length: this.config.maxContentLength,
    };
  }

  /**
   * Get collection metadata
   */
  getCollectionMetadata(collectionId: string): TaxiiCollection | null {
    const collection = this.collections.get(collectionId);
    if (!collection) return null;

    return {
      id: collection.id,
      title: collection.title,
      description: collection.description,
      alias: collection.alias,
      can_read: collection.canRead,
      can_write: collection.canWrite,
      media_types: collection.mediaTypes || [
        'application/stix+json;version=2.1',
        'application/taxii+json;version=2.1',
      ],
    };
  }

  /**
   * List all collection metadata
   */
  listCollectionMetadata(): TaxiiCollection[] {
    return Array.from(this.collections.values()).map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      alias: c.alias,
      can_read: c.canRead,
      can_write: c.canWrite,
      media_types: c.mediaTypes || [
        'application/stix+json;version=2.1',
        'application/taxii+json;version=2.1',
      ],
    }));
  }

  // ==========================================================================
  // Object Storage & Retrieval
  // ==========================================================================

  /**
   * Get objects from a collection
   */
  getObjects(
    collectionId: string,
    options: ObjectQueryOptions = {},
  ): TaxiiEnvelope {
    const store = this.objectStore.get(collectionId);
    if (!store) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    let objects = Array.from(store.values());

    // Apply filters
    if (options.addedAfter) {
      const afterDate = new Date(options.addedAfter);
      objects = objects.filter(o => new Date(o.dateAdded) > afterDate);
    }

    if (options.type?.length) {
      objects = objects.filter(o => options.type!.includes(o.object.type));
    }

    if (options.id?.length) {
      objects = objects.filter(o => options.id!.includes(o.object.id));
    }

    if (options.match) {
      for (const [key, value] of Object.entries(options.match)) {
        objects = objects.filter(o => {
          const obj = o.object as Record<string, unknown>;
          return String(obj[key]) === value;
        });
      }
    }

    // Sort by date added (newest first)
    objects.sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

    // Pagination
    const limit = Math.min(
      options.limit || this.config.defaultPageSize,
      this.config.maxPageSize,
    );

    let startIndex = 0;
    if (options.next) {
      const cursor = decodeCursor(options.next);
      startIndex = cursor.offset;
    }

    const pageObjects = objects.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < objects.length;

    return {
      more: hasMore,
      next: hasMore ? encodeCursor({ offset: startIndex + limit }) : undefined,
      objects: pageObjects.map(o => o.object),
    };
  }

  /**
   * Get object manifest
   */
  getManifest(
    collectionId: string,
    options: ObjectQueryOptions = {},
  ): TaxiiManifest {
    const store = this.objectStore.get(collectionId);
    if (!store) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    let objects = Array.from(store.values());

    // Apply same filters as getObjects
    if (options.addedAfter) {
      const afterDate = new Date(options.addedAfter);
      objects = objects.filter(o => new Date(o.dateAdded) > afterDate);
    }

    if (options.type?.length) {
      objects = objects.filter(o => options.type!.includes(o.object.type));
    }

    if (options.id?.length) {
      objects = objects.filter(o => options.id!.includes(o.object.id));
    }

    // Pagination
    const limit = Math.min(
      options.limit || this.config.defaultPageSize,
      this.config.maxPageSize,
    );

    let startIndex = 0;
    if (options.next) {
      const cursor = decodeCursor(options.next);
      startIndex = cursor.offset;
    }

    const pageObjects = objects.slice(startIndex, startIndex + limit);

    return {
      objects: pageObjects.map(o => ({
        id: o.object.id,
        date_added: o.dateAdded,
        version: o.version,
        media_type: 'application/stix+json;version=2.1',
      })),
    };
  }

  /**
   * Get a specific object by ID
   */
  getObject(
    collectionId: string,
    objectId: StixIdentifier,
    version?: string,
  ): TaxiiEnvelope | null {
    const store = this.objectStore.get(collectionId);
    if (!store) return null;

    const stored = store.get(objectId);
    if (!stored) return null;

    if (version && stored.version !== version) {
      return null;
    }

    return {
      objects: [stored.object],
    };
  }

  /**
   * Add objects to a collection
   */
  addObjects(
    collectionId: string,
    bundle: StixBundle,
    userId: string,
  ): TaxiiStatus {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    if (!collection.canWrite) {
      throw new Error(`Collection ${collectionId} does not allow writing`);
    }

    const store = this.objectStore.get(collectionId)!;
    const statusId = randomUUID();
    const timestamp = new Date().toISOString();

    // Validate bundle
    const validation = validateBundle(bundle);
    if (!validation.valid) {
      const status: TaxiiStatus = {
        id: statusId,
        status: 'failure',
        request_timestamp: timestamp,
        total_count: bundle.objects.length,
        success_count: 0,
        failure_count: bundle.objects.length,
        pending_count: 0,
        failures: bundle.objects.map(obj => ({
          id: obj.id,
          message: validation.errors.join('; '),
        })),
      };
      this.pendingStatuses.set(statusId, status);
      return status;
    }

    const successes: StixIdentifier[] = [];
    const failures: Array<{ id: StixIdentifier; message: string }> = [];

    for (const object of bundle.objects) {
      try {
        const stored: StoredObject = {
          object,
          dateAdded: timestamp,
          version: (object as any).modified || timestamp,
          addedBy: userId,
        };
        store.set(object.id, stored);
        successes.push(object.id);
      } catch (error) {
        failures.push({
          id: object.id,
          message: (error as Error).message,
        });
      }
    }

    const status: TaxiiStatus = {
      id: statusId,
      status: failures.length === 0 ? 'complete' : 'failure',
      request_timestamp: timestamp,
      total_count: bundle.objects.length,
      success_count: successes.length,
      failure_count: failures.length,
      pending_count: 0,
      successes: successes.length > 0 ? successes : undefined,
      failures: failures.length > 0 ? failures : undefined,
    };

    this.pendingStatuses.set(statusId, status);

    taxiiLogger.info({
      collectionId,
      statusId,
      successCount: successes.length,
      failureCount: failures.length,
      userId,
    }, 'Objects added to collection');

    return status;
  }

  /**
   * Get status of an add operation
   */
  getStatus(statusId: string): TaxiiStatus | null {
    return this.pendingStatuses.get(statusId) || null;
  }

  /**
   * Delete an object from a collection
   */
  deleteObject(
    collectionId: string,
    objectId: StixIdentifier,
    userId: string,
  ): boolean {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    if (!collection.canWrite) {
      throw new Error(`Collection ${collectionId} does not allow writing`);
    }

    const store = this.objectStore.get(collectionId)!;
    const deleted = store.delete(objectId);

    if (deleted) {
      taxiiLogger.info({ collectionId, objectId, userId }, 'Object deleted from collection');
    }

    return deleted;
  }

  // ==========================================================================
  // IntelGraph Integration
  // ==========================================================================

  /**
   * Sync entities from IntelGraph to TAXII collection
   */
  async syncFromIntelGraph(
    collectionId: string,
    options: {
      tenantId: string;
      entityIds?: string[];
      entityKinds?: string[];
      since?: Date;
      userId: string;
    },
  ): Promise<TaxiiStatus> {
    const collection = this.collections.get(collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionId}`);
    }

    // Query entities from database
    const entities = await this.queryEntities(options);

    if (entities.length === 0) {
      return {
        id: randomUUID(),
        status: 'complete',
        request_timestamp: new Date().toISOString(),
        total_count: 0,
        success_count: 0,
        failure_count: 0,
        pending_count: 0,
      };
    }

    // Export to STIX bundle
    const result = await this.bundleFactory!.exportBundle(entities, {
      entityIds: entities.map(e => e.id),
      includeRelationships: true,
      includeExtensions: true,
      tlpLevel: 'green',
    }, options.userId);

    // Add to collection
    return this.addObjects(collectionId, result.bundle, options.userId);
  }

  /**
   * Query entities from PostgreSQL
   */
  private async queryEntities(options: {
    tenantId: string;
    entityIds?: string[];
    entityKinds?: string[];
    since?: Date;
  }): Promise<any[]> {
    const params: any[] = [options.tenantId];
    let query = 'SELECT * FROM entities WHERE tenant_id = $1';
    let paramIndex = 2;

    if (options.entityIds?.length) {
      query += ` AND id = ANY($${paramIndex})`;
      params.push(options.entityIds);
      paramIndex++;
    }

    if (options.entityKinds?.length) {
      query += ` AND kind = ANY($${paramIndex})`;
      params.push(options.entityKinds);
      paramIndex++;
    }

    if (options.since) {
      query += ` AND updated_at >= $${paramIndex}`;
      params.push(options.since);
      paramIndex++;
    }

    query += ' ORDER BY updated_at DESC LIMIT 1000';

    const result = await this.deps.pg.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      kind: row.kind,
      labels: row.labels,
      props: row.props,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    }));
  }
}

// ============================================================================
// Internal Types
// ============================================================================

interface StoredObject {
  object: StixObject;
  dateAdded: string;
  version: string;
  addedBy: string;
}

interface PaginationCursor {
  offset: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

function encodeCursor(cursor: PaginationCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function decodeCursor(encoded: string): PaginationCursor {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString());
  } catch {
    return { offset: 0 };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createTaxiiService(
  config: Partial<TaxiiServiceConfig>,
  deps: { pg: Pool; neo4j: Driver },
): TaxiiService {
  return new TaxiiService(
    {
      baseUrl: config.baseUrl || process.env.TAXII_BASE_URL || 'http://localhost:4000',
      title: config.title || process.env.TAXII_TITLE || 'IntelGraph TAXII Server',
      description: config.description,
      contact: config.contact,
      apiRootPath: config.apiRootPath,
      maxContentLength: config.maxContentLength,
      defaultPageSize: config.defaultPageSize,
      maxPageSize: config.maxPageSize,
    },
    deps,
  );
}
