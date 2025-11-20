/**
 * ArtifactStore - Manage model artifacts and storage
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import pino from 'pino';
import { ModelArtifact, ModelArtifactSchema, ModelRegistryConfig } from '../types.js';

export class ArtifactStore {
  private pool: Pool;
  private logger: pino.Logger;
  private config: ModelRegistryConfig;

  constructor(pool: Pool, config: ModelRegistryConfig) {
    this.pool = pool;
    this.config = config;
    this.logger = pino({ name: 'artifact-store' });
  }

  /**
   * Initialize artifact storage tables
   */
  async initialize(): Promise<void> {
    const createArtifactsTable = `
      CREATE TABLE IF NOT EXISTS ml_model_artifacts (
        id UUID PRIMARY KEY,
        model_id UUID NOT NULL,
        model_version VARCHAR(100) NOT NULL,
        artifact_type VARCHAR(50) NOT NULL,
        uri TEXT NOT NULL,
        size_bytes BIGINT NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        metadata JSONB DEFAULT '{}',
        FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_artifacts_model_id ON ml_model_artifacts(model_id);
      CREATE INDEX IF NOT EXISTS idx_artifacts_type ON ml_model_artifacts(artifact_type);
    `;

    await this.pool.query(createArtifactsTable);

    // Ensure storage directory exists for local storage
    if (this.config.storage.type === 'local') {
      await fs.mkdir(this.config.storage.basePath, { recursive: true });
    }

    this.logger.info('Artifact store initialized');
  }

  /**
   * Store a model artifact
   */
  async storeArtifact(
    modelId: string,
    modelVersion: string,
    artifactType: ModelArtifact['artifact_type'],
    filePath: string,
    metadata: Record<string, any> = {}
  ): Promise<ModelArtifact> {
    // Read file and calculate checksum
    const fileBuffer = await fs.readFile(filePath);
    const checksum = this.calculateChecksum(fileBuffer);
    const sizeBytes = fileBuffer.length;

    // Generate storage URI
    const uri = await this.saveToStorage(modelId, modelVersion, artifactType, fileBuffer);

    const id = uuidv4();
    const now = new Date().toISOString();

    const artifact: ModelArtifact = {
      id,
      model_id: modelId,
      model_version: modelVersion,
      artifact_type: artifactType,
      uri,
      size_bytes: sizeBytes,
      checksum,
      created_at: now,
      metadata,
    };

    const validated = ModelArtifactSchema.parse(artifact);

    const query = `
      INSERT INTO ml_model_artifacts (
        id, model_id, model_version, artifact_type, uri, size_bytes,
        checksum, created_at, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;

    const values = [
      validated.id,
      validated.model_id,
      validated.model_version,
      validated.artifact_type,
      validated.uri,
      validated.size_bytes,
      validated.checksum,
      validated.created_at,
      JSON.stringify(validated.metadata),
    ];

    const result = await this.pool.query(query, values);

    this.logger.info(
      { artifactId: id, modelId, type: artifactType, size: sizeBytes },
      'Artifact stored'
    );

    return this.parseArtifactRow(result.rows[0]);
  }

  /**
   * Get artifact by ID
   */
  async getArtifact(artifactId: string): Promise<ModelArtifact | null> {
    const query = 'SELECT * FROM ml_model_artifacts WHERE id = $1';
    const result = await this.pool.query(query, [artifactId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.parseArtifactRow(result.rows[0]);
  }

  /**
   * List artifacts for a model
   */
  async listArtifacts(modelId: string, version?: string): Promise<ModelArtifact[]> {
    let query = 'SELECT * FROM ml_model_artifacts WHERE model_id = $1';
    const params: any[] = [modelId];

    if (version) {
      query += ' AND model_version = $2';
      params.push(version);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);

    return result.rows.map(row => this.parseArtifactRow(row));
  }

  /**
   * Download artifact
   */
  async downloadArtifact(artifactId: string, destinationPath: string): Promise<void> {
    const artifact = await this.getArtifact(artifactId);
    if (!artifact) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    const data = await this.loadFromStorage(artifact.uri);

    // Verify checksum
    const checksum = this.calculateChecksum(data);
    if (checksum !== artifact.checksum) {
      throw new Error('Artifact checksum mismatch - data may be corrupted');
    }

    await fs.writeFile(destinationPath, data);

    this.logger.info({ artifactId, destinationPath }, 'Artifact downloaded');
  }

  /**
   * Delete artifact
   */
  async deleteArtifact(artifactId: string): Promise<void> {
    const artifact = await this.getArtifact(artifactId);
    if (!artifact) {
      throw new Error(`Artifact ${artifactId} not found`);
    }

    // Delete from storage
    await this.deleteFromStorage(artifact.uri);

    // Delete from database
    const query = 'DELETE FROM ml_model_artifacts WHERE id = $1';
    await this.pool.query(query, [artifactId]);

    this.logger.info({ artifactId }, 'Artifact deleted');
  }

  /**
   * Calculate checksum for buffer
   */
  private calculateChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Save to configured storage backend
   */
  private async saveToStorage(
    modelId: string,
    modelVersion: string,
    artifactType: string,
    data: Buffer
  ): Promise<string> {
    const fileName = `${modelId}_${modelVersion}_${artifactType}_${Date.now()}`;

    if (this.config.storage.type === 'local') {
      const filePath = path.join(this.config.storage.basePath, fileName);
      await fs.writeFile(filePath, data);
      return filePath;
    }

    // For S3, GCS, Azure - implement using respective SDKs
    // This is a placeholder for demonstration
    throw new Error(`Storage type ${this.config.storage.type} not implemented yet`);
  }

  /**
   * Load from configured storage backend
   */
  private async loadFromStorage(uri: string): Promise<Buffer> {
    if (this.config.storage.type === 'local') {
      return fs.readFile(uri);
    }

    // For S3, GCS, Azure - implement using respective SDKs
    throw new Error(`Storage type ${this.config.storage.type} not implemented yet`);
  }

  /**
   * Delete from configured storage backend
   */
  private async deleteFromStorage(uri: string): Promise<void> {
    if (this.config.storage.type === 'local') {
      await fs.unlink(uri);
      return;
    }

    // For S3, GCS, Azure - implement using respective SDKs
    throw new Error(`Storage type ${this.config.storage.type} not implemented yet`);
  }

  /**
   * Parse database row into ModelArtifact
   */
  private parseArtifactRow(row: any): ModelArtifact {
    return ModelArtifactSchema.parse({
      ...row,
      metadata: row.metadata || {},
    });
  }

  /**
   * Get total storage used by a model
   */
  async getStorageUsed(modelId: string): Promise<number> {
    const query = 'SELECT SUM(size_bytes) as total FROM ml_model_artifacts WHERE model_id = $1';
    const result = await this.pool.query(query, [modelId]);

    return parseInt(result.rows[0].total) || 0;
  }

  /**
   * Get total storage used across all models
   */
  async getTotalStorageUsed(): Promise<number> {
    const query = 'SELECT SUM(size_bytes) as total FROM ml_model_artifacts';
    const result = await this.pool.query(query);

    return parseInt(result.rows[0].total) || 0;
  }
}
