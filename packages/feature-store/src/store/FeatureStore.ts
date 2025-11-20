/**
 * FeatureStore - Unified feature store with online and offline serving
 */

import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';
import {
  Feature,
  FeatureSchema,
  FeatureGroup,
  FeatureGroupSchema,
  FeatureValue,
  FeatureVector,
  FeatureStoreConfig,
} from '../types.js';

export class FeatureStore {
  private pool: Pool;
  private redis: RedisClientType;
  private logger: pino.Logger;
  private config: FeatureStoreConfig;

  constructor(config: FeatureStoreConfig) {
    this.config = config;
    this.logger = pino({ name: 'feature-store' });

    // Initialize PostgreSQL for offline features
    this.pool = new Pool({
      host: config.postgres.host,
      port: config.postgres.port,
      database: config.postgres.database,
      user: config.postgres.user,
      password: config.postgres.password,
      max: 20,
    });

    // Initialize Redis for online features
    this.redis = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      password: config.redis.password,
    });

    this.redis.on('error', (err) => {
      this.logger.error({ err }, 'Redis connection error');
    });
  }

  /**
   * Initialize feature store
   */
  async initialize(): Promise<void> {
    await this.createTables();
    await this.redis.connect();
    this.logger.info('Feature Store initialized');
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    const createFeaturesTable = `
      CREATE TABLE IF NOT EXISTS features (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(100) NOT NULL,
        feature_type VARCHAR(50) NOT NULL,
        description TEXT,
        entity_type VARCHAR(100) NOT NULL,
        tags TEXT[],
        owner VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        transformation TEXT,
        dependencies TEXT[],
        metadata JSONB DEFAULT '{}',
        online_enabled BOOLEAN DEFAULT true,
        offline_enabled BOOLEAN DEFAULT true,
        ttl_seconds INTEGER,
        UNIQUE(name, version)
      );

      CREATE TABLE IF NOT EXISTS feature_groups (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        version VARCHAR(100) NOT NULL,
        description TEXT,
        entity_type VARCHAR(100) NOT NULL,
        features TEXT[] NOT NULL,
        owner VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        tags TEXT[],
        metadata JSONB DEFAULT '{}',
        UNIQUE(name, version)
      );

      CREATE TABLE IF NOT EXISTS feature_values_offline (
        feature_id UUID NOT NULL,
        entity_id VARCHAR(255) NOT NULL,
        value JSONB NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        version VARCHAR(100) NOT NULL,
        PRIMARY KEY (feature_id, entity_id, timestamp),
        FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_features_name ON features(name);
      CREATE INDEX IF NOT EXISTS idx_features_entity_type ON features(entity_type);
      CREATE INDEX IF NOT EXISTS idx_feature_groups_name ON feature_groups(name);
      CREATE INDEX IF NOT EXISTS idx_feature_values_entity ON feature_values_offline(entity_id);
      CREATE INDEX IF NOT EXISTS idx_feature_values_timestamp ON feature_values_offline(timestamp DESC);
    `;

    await this.pool.query(createFeaturesTable);
  }

  /**
   * Register a new feature
   */
  async registerFeature(feature: Omit<Feature, 'id' | 'created_at' | 'updated_at'>): Promise<Feature> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const fullFeature: Feature = {
      id,
      created_at: now,
      updated_at: now,
      ...feature,
    };

    const validated = FeatureSchema.parse(fullFeature);

    const query = `
      INSERT INTO features (
        id, name, version, feature_type, description, entity_type, tags, owner,
        created_at, updated_at, transformation, dependencies, metadata,
        online_enabled, offline_enabled, ttl_seconds
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;

    const values = [
      validated.id,
      validated.name,
      validated.version,
      validated.feature_type,
      validated.description,
      validated.entity_type,
      validated.tags,
      validated.owner,
      validated.created_at,
      validated.updated_at,
      validated.transformation,
      validated.dependencies,
      JSON.stringify(validated.metadata),
      validated.online_enabled,
      validated.offline_enabled,
      validated.ttl_seconds,
    ];

    const result = await this.pool.query(query, values);

    this.logger.info({ featureId: id, name: validated.name }, 'Feature registered');

    return this.parseFeatureRow(result.rows[0]);
  }

  /**
   * Register a feature group
   */
  async registerFeatureGroup(
    group: Omit<FeatureGroup, 'id' | 'created_at' | 'updated_at'>
  ): Promise<FeatureGroup> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const fullGroup: FeatureGroup = {
      id,
      created_at: now,
      updated_at: now,
      ...group,
    };

    const validated = FeatureGroupSchema.parse(fullGroup);

    const query = `
      INSERT INTO feature_groups (
        id, name, version, description, entity_type, features, owner,
        created_at, updated_at, tags, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const values = [
      validated.id,
      validated.name,
      validated.version,
      validated.description,
      validated.entity_type,
      validated.features,
      validated.owner,
      validated.created_at,
      validated.updated_at,
      validated.tags,
      JSON.stringify(validated.metadata),
    ];

    const result = await this.pool.query(query, values);

    this.logger.info({ groupId: id, name: validated.name }, 'Feature group registered');

    return this.parseFeatureGroupRow(result.rows[0]);
  }

  /**
   * Write feature value (online + offline)
   */
  async writeFeature(
    featureName: string,
    entityId: string,
    value: any,
    version = 'latest',
    timestamp?: Date
  ): Promise<void> {
    // Get feature metadata
    const feature = await this.getFeature(featureName, version);
    if (!feature) {
      throw new Error(`Feature ${featureName} version ${version} not found`);
    }

    const ts = timestamp || new Date();
    const tsString = ts.toISOString();

    // Write to offline store
    if (feature.offline_enabled) {
      const query = `
        INSERT INTO feature_values_offline (feature_id, entity_id, value, timestamp, version)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (feature_id, entity_id, timestamp) DO UPDATE
        SET value = EXCLUDED.value;
      `;

      await this.pool.query(query, [
        feature.id,
        entityId,
        JSON.stringify(value),
        tsString,
        version,
      ]);
    }

    // Write to online store (Redis)
    if (feature.online_enabled) {
      const key = `feature:${feature.id}:${entityId}`;
      const data = JSON.stringify({ value, timestamp: tsString, version });

      if (feature.ttl_seconds) {
        await this.redis.setEx(key, feature.ttl_seconds, data);
      } else {
        await this.redis.set(key, data);
      }
    }

    this.logger.debug({ featureId: feature.id, entityId }, 'Feature value written');
  }

  /**
   * Read feature value (online-first, fallback to offline)
   */
  async readFeature(
    featureName: string,
    entityId: string,
    version = 'latest'
  ): Promise<FeatureValue | null> {
    const feature = await this.getFeature(featureName, version);
    if (!feature) {
      return null;
    }

    // Try online store first
    if (feature.online_enabled) {
      const key = `feature:${feature.id}:${entityId}`;
      const cached = await this.redis.get(key);

      if (cached) {
        const data = JSON.parse(cached);
        return {
          feature_id: feature.id,
          entity_id: entityId,
          value: data.value,
          timestamp: data.timestamp,
          version: data.version,
        };
      }
    }

    // Fallback to offline store
    if (feature.offline_enabled) {
      const query = `
        SELECT * FROM feature_values_offline
        WHERE feature_id = $1 AND entity_id = $2
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      const result = await this.pool.query(query, [feature.id, entityId]);

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          feature_id: row.feature_id,
          entity_id: row.entity_id,
          value: row.value,
          timestamp: row.timestamp,
          version: row.version,
        };
      }
    }

    return null;
  }

  /**
   * Read feature vector (multiple features for an entity)
   */
  async readFeatureVector(
    entityType: string,
    entityId: string,
    featureNames: string[],
    version = 'latest'
  ): Promise<FeatureVector> {
    const features: Record<string, any> = {};
    let latestTimestamp = new Date(0).toISOString();

    for (const featureName of featureNames) {
      const featureValue = await this.readFeature(featureName, entityId, version);
      if (featureValue) {
        features[featureName] = featureValue.value;
        if (featureValue.timestamp > latestTimestamp) {
          latestTimestamp = featureValue.timestamp;
        }
      }
    }

    return {
      entity_id: entityId,
      entity_type: entityType,
      features,
      timestamp: latestTimestamp,
      version,
    };
  }

  /**
   * Batch read features
   */
  async batchReadFeatures(
    featureName: string,
    entityIds: string[],
    version = 'latest'
  ): Promise<Map<string, FeatureValue>> {
    const results = new Map<string, FeatureValue>();

    // For large batches, use offline store
    const feature = await this.getFeature(featureName, version);
    if (!feature) {
      return results;
    }

    const query = `
      SELECT DISTINCT ON (entity_id) *
      FROM feature_values_offline
      WHERE feature_id = $1 AND entity_id = ANY($2)
      ORDER BY entity_id, timestamp DESC
    `;

    const result = await this.pool.query(query, [feature.id, entityIds]);

    for (const row of result.rows) {
      results.set(row.entity_id, {
        feature_id: row.feature_id,
        entity_id: row.entity_id,
        value: row.value,
        timestamp: row.timestamp,
        version: row.version,
      });
    }

    return results;
  }

  /**
   * Get feature by name and version
   */
  async getFeature(name: string, version: string): Promise<Feature | null> {
    const query = 'SELECT * FROM features WHERE name = $1 AND version = $2';
    const result = await this.pool.query(query, [name, version]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseFeatureRow(result.rows[0]);
  }

  /**
   * List all features
   */
  async listFeatures(entityType?: string): Promise<Feature[]> {
    let query = 'SELECT * FROM features';
    const params: any[] = [];

    if (entityType) {
      query += ' WHERE entity_type = $1';
      params.push(entityType);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);

    return result.rows.map(row => this.parseFeatureRow(row));
  }

  /**
   * Get feature group
   */
  async getFeatureGroup(name: string, version: string): Promise<FeatureGroup | null> {
    const query = 'SELECT * FROM feature_groups WHERE name = $1 AND version = $2';
    const result = await this.pool.query(query, [name, version]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseFeatureGroupRow(result.rows[0]);
  }

  /**
   * Parse feature row
   */
  private parseFeatureRow(row: any): Feature {
    return FeatureSchema.parse({
      ...row,
      tags: row.tags || [],
      dependencies: row.dependencies || [],
      metadata: row.metadata || {},
    });
  }

  /**
   * Parse feature group row
   */
  private parseFeatureGroupRow(row: any): FeatureGroup {
    return FeatureGroupSchema.parse({
      ...row,
      tags: row.tags || [],
      metadata: row.metadata || {},
    });
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    await this.pool.end();
    await this.redis.disconnect();
    this.logger.info('Feature Store closed');
  }
}
