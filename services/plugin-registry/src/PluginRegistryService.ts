import { PluginManifest, PluginMetadata, PluginState } from '@summit/plugin-system';
import { Pool } from 'pg';
import { createClient } from 'redis';

/**
 * Plugin registry service with persistent storage
 */
export class PluginRegistryService {
  private db: Pool;
  private cache: any; // Redis client

  constructor() {
    // Initialize PostgreSQL
    this.db = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'plugin_registry',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
    });

    // Initialize Redis cache
    this.initializeCache();
  }

  private async initializeCache() {
    this.cache = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    await this.cache.connect();
  }

  /**
   * Register a new plugin
   */
  async register(manifest: PluginManifest, packageUrl: string): Promise<void> {
    const query = `
      INSERT INTO plugins (
        id, name, version, description, author, category,
        manifest, package_url, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (id, version) DO UPDATE SET
        updated_at = NOW(),
        manifest = $7,
        package_url = $8
    `;

    await this.db.query(query, [
      manifest.id,
      manifest.name,
      manifest.version,
      manifest.description,
      JSON.stringify(manifest.author),
      manifest.category,
      JSON.stringify(manifest),
      packageUrl,
    ]);

    // Invalidate cache
    await this.cache.del(`plugin:${manifest.id}`);
  }

  /**
   * Get plugin by ID
   */
  async getPlugin(pluginId: string, version?: string): Promise<PluginMetadata | null> {
    // Try cache first
    const cacheKey = `plugin:${pluginId}${version ? `:${version}` : ''}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    let query = 'SELECT * FROM plugins WHERE id = $1';
    const params: any[] = [pluginId];

    if (version) {
      query += ' AND version = $2';
      params.push(version);
    } else {
      query += ' ORDER BY created_at DESC LIMIT 1';
    }

    const result = await this.db.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const metadata = this.rowToMetadata(row);

    // Cache result
    await this.cache.setEx(cacheKey, 3600, JSON.stringify(metadata));

    return metadata;
  }

  /**
   * List plugins with filtering and pagination
   */
  async listPlugins(options: {
    category?: string;
    author?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ plugins: PluginMetadata[]; total: number }> {
    let query = `
      SELECT DISTINCT ON (id) *
      FROM plugins
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (options.category) {
      query += ` AND category = $${paramCount++}`;
      params.push(options.category);
    }

    if (options.author) {
      query += ` AND author->>'name' = $${paramCount++}`;
      params.push(options.author);
    }

    if (options.search) {
      query += ` AND (
        name ILIKE $${paramCount} OR
        description ILIKE $${paramCount} OR
        id ILIKE $${paramCount}
      )`;
      params.push(`%${options.search}%`);
      paramCount++;
    }

    query += ' ORDER BY id, created_at DESC';

    if (options.limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET $${paramCount++}`;
      params.push(options.offset);
    }

    const result = await this.db.query(query, params);

    // Get total count
    const countResult = await this.db.query('SELECT COUNT(DISTINCT id) FROM plugins');
    const total = parseInt(countResult.rows[0].count);

    return {
      plugins: result.rows.map(row => this.rowToMetadata(row)),
      total,
    };
  }

  /**
   * Update plugin stats
   */
  async updateStats(pluginId: string, stats: {
    downloads?: number;
    rating?: number;
    reviews?: number;
  }): Promise<void> {
    const query = `
      UPDATE plugins
      SET stats = stats || $1::jsonb,
          updated_at = NOW()
      WHERE id = $2
    `;

    await this.db.query(query, [JSON.stringify(stats), pluginId]);
    await this.cache.del(`plugin:${pluginId}`);
  }

  /**
   * Delete plugin
   */
  async deletePlugin(pluginId: string, version?: string): Promise<void> {
    let query = 'DELETE FROM plugins WHERE id = $1';
    const params: any[] = [pluginId];

    if (version) {
      query += ' AND version = $2';
      params.push(version);
    }

    await this.db.query(query, params);
    await this.cache.del(`plugin:${pluginId}`);
  }

  /**
   * Get plugin versions
   */
  async getVersions(pluginId: string): Promise<string[]> {
    const query = `
      SELECT version
      FROM plugins
      WHERE id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [pluginId]);
    return result.rows.map(row => row.version);
  }

  /**
   * Convert database row to PluginMetadata
   */
  private rowToMetadata(row: any): PluginMetadata {
    return {
      manifest: row.manifest,
      state: PluginState.UNLOADED,
      installedAt: row.created_at,
      updatedAt: row.updated_at,
      config: {},
      stats: row.stats || {
        downloads: 0,
        activeInstalls: 0,
        rating: 0,
        reviews: 0,
        errorCount: 0,
        successCount: 0,
      },
    };
  }
}
