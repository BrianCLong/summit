/**
 * Glossary Manager
 * Business glossary management for standardized terminology
 * Manages business terms, definitions, and their relationships with data assets
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { BusinessTerm } from '../types.js';

/**
 * Glossary configuration
 */
export interface GlossaryConfig {
  /** Database connection pool */
  pool: Pool;
  /** Enable term approval workflow */
  requireApproval?: boolean;
  /** Enable term versioning */
  enableVersioning?: boolean;
}

/**
 * Term search filters
 */
export interface TermFilter {
  /** Search text (name, definition) */
  searchText?: string;
  /** Filter by domain */
  domain?: string;
  /** Filter by status */
  status?: ('DRAFT' | 'APPROVED' | 'DEPRECATED')[];
  /** Filter by steward */
  steward?: string;
}

/**
 * Term relationship types
 */
export enum TermRelationType {
  SYNONYM = 'SYNONYM',
  RELATED = 'RELATED',
  BROADER = 'BROADER',
  NARROWER = 'NARROWER',
  OPPOSITE = 'OPPOSITE',
}

/**
 * Term relationship
 */
export interface TermRelationship {
  id: string;
  sourceTermId: string;
  targetTermId: string;
  type: TermRelationType;
  createdAt: Date;
  createdBy: string;
}

/**
 * Business Glossary Manager
 * Manages business terms and their relationships
 */
export class GlossaryManager {
  private pool: Pool;
  private config: GlossaryConfig;

  constructor(config: GlossaryConfig) {
    this.pool = config.pool;
    this.config = {
      requireApproval: config.requireApproval ?? true,
      enableVersioning: config.enableVersioning ?? true,
    };
  }

  /**
   * Initialize database schema for glossary
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();

    try {
      // Create business terms table
      await client.query(`
        CREATE TABLE IF NOT EXISTS glossary_terms (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          display_name TEXT NOT NULL,
          definition TEXT NOT NULL,
          domain TEXT NOT NULL,
          related_terms TEXT[] DEFAULT '{}',
          synonyms TEXT[] DEFAULT '{}',
          status TEXT NOT NULL DEFAULT 'DRAFT',
          steward TEXT NOT NULL,
          attributes JSONB,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by TEXT NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_by TEXT NOT NULL,
          linked_assets TEXT[] DEFAULT '{}',
          version INTEGER DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_terms_name ON glossary_terms(name);
        CREATE INDEX IF NOT EXISTS idx_terms_domain ON glossary_terms(domain);
        CREATE INDEX IF NOT EXISTS idx_terms_status ON glossary_terms(status);
        CREATE INDEX IF NOT EXISTS idx_terms_steward ON glossary_terms(steward);
        CREATE INDEX IF NOT EXISTS idx_terms_search ON glossary_terms USING gin(to_tsvector('english', name || ' ' || definition));
      `);

      // Create term relationships table
      await client.query(`
        CREATE TABLE IF NOT EXISTS glossary_term_relationships (
          id UUID PRIMARY KEY,
          source_term_id UUID NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
          target_term_id UUID NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by TEXT NOT NULL,
          UNIQUE(source_term_id, target_term_id, type)
        );

        CREATE INDEX IF NOT EXISTS idx_term_rels_source ON glossary_term_relationships(source_term_id);
        CREATE INDEX IF NOT EXISTS idx_term_rels_target ON glossary_term_relationships(target_term_id);
      `);

      // Create term versions table (if versioning enabled)
      if (this.config.enableVersioning) {
        await client.query(`
          CREATE TABLE IF NOT EXISTS glossary_term_versions (
            id UUID PRIMARY KEY,
            term_id UUID NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
            version INTEGER NOT NULL,
            data JSONB NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            created_by TEXT NOT NULL,
            change_notes TEXT,
            UNIQUE(term_id, version)
          );

          CREATE INDEX IF NOT EXISTS idx_term_versions_term ON glossary_term_versions(term_id);
        `);
      }

      // Create asset-term links table
      await client.query(`
        CREATE TABLE IF NOT EXISTS glossary_asset_links (
          id UUID PRIMARY KEY,
          term_id UUID NOT NULL REFERENCES glossary_terms(id) ON DELETE CASCADE,
          asset_id UUID NOT NULL,
          field_name TEXT,
          confidence FLOAT DEFAULT 1.0,
          link_type TEXT DEFAULT 'MANUAL',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by TEXT NOT NULL,
          UNIQUE(term_id, asset_id, field_name)
        );

        CREATE INDEX IF NOT EXISTS idx_asset_links_term ON glossary_asset_links(term_id);
        CREATE INDEX IF NOT EXISTS idx_asset_links_asset ON glossary_asset_links(asset_id);
      `);

      console.log('Glossary schema initialized successfully');
    } finally {
      client.release();
    }
  }

  /**
   * Create a new business term
   */
  async createTerm(term: Partial<BusinessTerm>): Promise<BusinessTerm> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const newTerm: BusinessTerm = {
        id: term.id || uuidv4(),
        name: term.name!,
        displayName: term.displayName || term.name!,
        definition: term.definition!,
        domain: term.domain!,
        relatedTerms: term.relatedTerms || [],
        synonyms: term.synonyms || [],
        status: this.config.requireApproval ? 'DRAFT' : 'APPROVED',
        steward: term.steward!,
        attributes: term.attributes,
        createdAt: new Date(),
        createdBy: term.createdBy || term.steward!,
        updatedAt: new Date(),
        updatedBy: term.updatedBy || term.steward!,
        linkedAssets: term.linkedAssets || [],
      };

      // Insert term
      await client.query(
        `
        INSERT INTO glossary_terms (
          id, name, display_name, definition, domain, related_terms, synonyms,
          status, steward, attributes, created_at, created_by, updated_at, updated_by,
          linked_assets, version
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 1)
      `,
        [
          newTerm.id,
          newTerm.name,
          newTerm.displayName,
          newTerm.definition,
          newTerm.domain,
          newTerm.relatedTerms,
          newTerm.synonyms,
          newTerm.status,
          newTerm.steward,
          newTerm.attributes ? JSON.stringify(newTerm.attributes) : null,
          newTerm.createdAt,
          newTerm.createdBy,
          newTerm.updatedAt,
          newTerm.updatedBy,
          newTerm.linkedAssets,
        ]
      );

      // Create version snapshot if enabled
      if (this.config.enableVersioning) {
        await this.createVersionSnapshot(newTerm, 1, 'Initial version', client);
      }

      await client.query('COMMIT');
      return newTerm;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a business term
   */
  async updateTerm(id: string, updates: Partial<BusinessTerm>): Promise<BusinessTerm> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get existing term
      const existing = await this.getTermById(id);
      if (!existing) {
        throw new Error(`Term not found: ${id}`);
      }

      // Merge updates
      const updated = { ...existing, ...updates };
      updated.updatedAt = new Date();

      // Get current version
      const versionResult = await client.query(
        'SELECT version FROM glossary_terms WHERE id = $1',
        [id]
      );
      const currentVersion = versionResult.rows[0].version;
      const newVersion = currentVersion + 1;

      // Update term
      await client.query(
        `
        UPDATE glossary_terms SET
          name = $2,
          display_name = $3,
          definition = $4,
          domain = $5,
          related_terms = $6,
          synonyms = $7,
          status = $8,
          steward = $9,
          attributes = $10,
          updated_at = $11,
          updated_by = $12,
          linked_assets = $13,
          version = $14
        WHERE id = $1
      `,
        [
          id,
          updated.name,
          updated.displayName,
          updated.definition,
          updated.domain,
          updated.relatedTerms,
          updated.synonyms,
          updated.status,
          updated.steward,
          updated.attributes ? JSON.stringify(updated.attributes) : null,
          updated.updatedAt,
          updated.updatedBy,
          updated.linkedAssets,
          newVersion,
        ]
      );

      // Create version snapshot if enabled
      if (this.config.enableVersioning) {
        await this.createVersionSnapshot(
          updated,
          newVersion,
          'Term updated',
          client
        );
      }

      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get term by ID
   */
  async getTermById(id: string): Promise<BusinessTerm | null> {
    const result = await this.pool.query(
      'SELECT * FROM glossary_terms WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTerm(result.rows[0]);
  }

  /**
   * Get term by name
   */
  async getTermByName(name: string): Promise<BusinessTerm | null> {
    const result = await this.pool.query(
      'SELECT * FROM glossary_terms WHERE name = $1',
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTerm(result.rows[0]);
  }

  /**
   * Search terms
   */
  async searchTerms(
    filter?: TermFilter,
    limit: number = 100,
    offset: number = 0
  ): Promise<{
    terms: BusinessTerm[];
    total: number;
  }> {
    let query = 'SELECT * FROM glossary_terms WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filter?.searchText) {
      query += ` AND to_tsvector('english', name || ' ' || definition) @@ plainto_tsquery('english', $${paramIndex})`;
      params.push(filter.searchText);
      paramIndex++;
    }

    if (filter?.domain) {
      query += ` AND domain = $${paramIndex}`;
      params.push(filter.domain);
      paramIndex++;
    }

    if (filter?.status && filter.status.length > 0) {
      query += ` AND status = ANY($${paramIndex}::text[])`;
      params.push(filter.status);
      paramIndex++;
    }

    if (filter?.steward) {
      query += ` AND steward = $${paramIndex}`;
      params.push(filter.steward);
      paramIndex++;
    }

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM (${query}) AS filtered`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Add pagination
    query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Get terms
    const result = await this.pool.query(query, params);
    const terms = result.rows.map((row) => this.mapRowToTerm(row));

    return { terms, total };
  }

  /**
   * Delete a term
   */
  async deleteTerm(id: string): Promise<void> {
    await this.pool.query('DELETE FROM glossary_terms WHERE id = $1', [id]);
  }

  /**
   * Approve a term (change status to APPROVED)
   */
  async approveTerm(id: string, approvedBy: string): Promise<BusinessTerm> {
    return this.updateTerm(id, {
      status: 'APPROVED',
      updatedBy: approvedBy,
    });
  }

  /**
   * Deprecate a term
   */
  async deprecateTerm(id: string, deprecatedBy: string): Promise<BusinessTerm> {
    return this.updateTerm(id, {
      status: 'DEPRECATED',
      updatedBy: deprecatedBy,
    });
  }

  /**
   * Link a term to a data asset
   */
  async linkToAsset(
    termId: string,
    assetId: string,
    fieldName?: string,
    confidence: number = 1.0,
    linkType: string = 'MANUAL',
    createdBy: string = 'system'
  ): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO glossary_asset_links (
        id, term_id, asset_id, field_name, confidence, link_type, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      ON CONFLICT (term_id, asset_id, field_name) DO UPDATE SET
        confidence = EXCLUDED.confidence,
        link_type = EXCLUDED.link_type
    `,
      [uuidv4(), termId, assetId, fieldName, confidence, linkType, createdBy]
    );

    // Update term's linked assets
    const term = await this.getTermById(termId);
    if (term && !term.linkedAssets?.includes(assetId)) {
      term.linkedAssets = [...(term.linkedAssets || []), assetId];
      await this.updateTerm(termId, { linkedAssets: term.linkedAssets });
    }
  }

  /**
   * Unlink a term from a data asset
   */
  async unlinkFromAsset(termId: string, assetId: string, fieldName?: string): Promise<void> {
    await this.pool.query(
      `
      DELETE FROM glossary_asset_links
      WHERE term_id = $1 AND asset_id = $2 AND ($3::text IS NULL OR field_name = $3)
    `,
      [termId, assetId, fieldName]
    );

    // Update term's linked assets
    const term = await this.getTermById(termId);
    if (term && term.linkedAssets) {
      term.linkedAssets = term.linkedAssets.filter((id) => id !== assetId);
      await this.updateTerm(termId, { linkedAssets: term.linkedAssets });
    }
  }

  /**
   * Get asset links for a term
   */
  async getAssetLinks(termId: string): Promise<any[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM glossary_asset_links
      WHERE term_id = $1
      ORDER BY created_at DESC
    `,
      [termId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      termId: row.term_id,
      assetId: row.asset_id,
      fieldName: row.field_name,
      confidence: row.confidence,
      linkType: row.link_type,
      createdAt: row.created_at,
      createdBy: row.created_by,
    }));
  }

  /**
   * Get terms linked to an asset
   */
  async getTermsForAsset(assetId: string): Promise<BusinessTerm[]> {
    const result = await this.pool.query(
      `
      SELECT t.* FROM glossary_terms t
      JOIN glossary_asset_links l ON t.id = l.term_id
      WHERE l.asset_id = $1
      ORDER BY t.name
    `,
      [assetId]
    );

    return result.rows.map((row) => this.mapRowToTerm(row));
  }

  /**
   * Create a relationship between terms
   */
  async createTermRelationship(relationship: Omit<TermRelationship, 'id' | 'createdAt'>): Promise<TermRelationship> {
    const newRelationship: TermRelationship = {
      id: uuidv4(),
      ...relationship,
      createdAt: new Date(),
    };

    await this.pool.query(
      `
      INSERT INTO glossary_term_relationships (
        id, source_term_id, target_term_id, type, created_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (source_term_id, target_term_id, type) DO NOTHING
    `,
      [
        newRelationship.id,
        newRelationship.sourceTermId,
        newRelationship.targetTermId,
        newRelationship.type,
        newRelationship.createdAt,
        newRelationship.createdBy,
      ]
    );

    return newRelationship;
  }

  /**
   * Get relationships for a term
   */
  async getTermRelationships(termId: string): Promise<TermRelationship[]> {
    const result = await this.pool.query(
      `
      SELECT * FROM glossary_term_relationships
      WHERE source_term_id = $1 OR target_term_id = $1
      ORDER BY created_at DESC
    `,
      [termId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      sourceTermId: row.source_term_id,
      targetTermId: row.target_term_id,
      type: row.type as TermRelationType,
      createdAt: row.created_at,
      createdBy: row.created_by,
    }));
  }

  /**
   * Get term version history
   */
  async getTermVersions(termId: string): Promise<any[]> {
    if (!this.config.enableVersioning) {
      return [];
    }

    const result = await this.pool.query(
      `
      SELECT * FROM glossary_term_versions
      WHERE term_id = $1
      ORDER BY version DESC
    `,
      [termId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      termId: row.term_id,
      version: row.version,
      data: row.data,
      createdAt: row.created_at,
      createdBy: row.created_by,
      changeNotes: row.change_notes,
    }));
  }

  /**
   * Get all domains
   */
  async getDomains(): Promise<string[]> {
    const result = await this.pool.query(
      'SELECT DISTINCT domain FROM glossary_terms ORDER BY domain'
    );
    return result.rows.map((row) => row.domain);
  }

  /**
   * Get terms by domain
   */
  async getTermsByDomain(domain: string): Promise<BusinessTerm[]> {
    const result = await this.pool.query(
      'SELECT * FROM glossary_terms WHERE domain = $1 ORDER BY name',
      [domain]
    );
    return result.rows.map((row) => this.mapRowToTerm(row));
  }

  /**
   * Find similar terms (fuzzy search)
   */
  async findSimilarTerms(name: string, threshold: number = 0.3): Promise<BusinessTerm[]> {
    const result = await this.pool.query(
      `
      SELECT *, similarity(name, $1) as sim
      FROM glossary_terms
      WHERE similarity(name, $1) > $2
      ORDER BY sim DESC
      LIMIT 10
    `,
      [name, threshold]
    );

    return result.rows.map((row) => this.mapRowToTerm(row));
  }

  /**
   * Create version snapshot
   */
  private async createVersionSnapshot(
    term: BusinessTerm,
    version: number,
    changeNotes: string,
    client: any
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO glossary_term_versions (
        id, term_id, version, data, created_at, created_by, change_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      [
        uuidv4(),
        term.id,
        version,
        JSON.stringify(term),
        new Date(),
        term.updatedBy,
        changeNotes,
      ]
    );
  }

  /**
   * Map database row to BusinessTerm
   */
  private mapRowToTerm(row: any): BusinessTerm {
    return {
      id: row.id,
      name: row.name,
      displayName: row.display_name,
      definition: row.definition,
      domain: row.domain,
      relatedTerms: row.related_terms || [],
      synonyms: row.synonyms || [],
      status: row.status,
      steward: row.steward,
      attributes: row.attributes,
      createdAt: row.created_at,
      createdBy: row.created_by,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by,
      linkedAssets: row.linked_assets || [],
    };
  }
}
