import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import type { DataProduct, CreateProductInputType } from '../models/types.js';
import { riskScorerService } from './riskScorerService.js';

export const productService = {
  async create(
    providerId: string,
    input: CreateProductInputType
  ): Promise<DataProduct> {
    const id = uuidv4();
    const now = new Date();

    const product: DataProduct = {
      id,
      providerId,
      ...input,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    };

    // Auto-assess risk
    const riskAssessment = await riskScorerService.assess(product);
    product.riskScore = riskAssessment.overallScore;
    product.riskLevel = riskAssessment.riskLevel;

    await db.query(
      `INSERT INTO data_products (
        id, provider_id, name, description, category, tags,
        schema_definition, classification, pii_fields, regulations,
        pricing_model, base_price_cents, currency, status,
        risk_score, risk_level, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        product.id,
        product.providerId,
        product.name,
        product.description,
        product.category,
        JSON.stringify(product.tags),
        JSON.stringify(product.schemaDefinition),
        product.classification,
        JSON.stringify(product.piiFields),
        JSON.stringify(product.regulations),
        product.pricingModel,
        product.basePriceCents,
        product.currency,
        product.status,
        product.riskScore,
        product.riskLevel,
        product.createdAt,
        product.updatedAt,
      ]
    );

    logger.info('Product created', { productId: id, providerId });
    return product;
  },

  async findById(id: string): Promise<DataProduct | null> {
    const result = await db.query(
      'SELECT * FROM data_products WHERE id = $1',
      [id]
    );
    return result.rows[0] ? mapRowToProduct(result.rows[0]) : null;
  },

  async search(params: {
    query?: string;
    category?: string;
    maxRiskLevel?: string;
    minPrice?: number;
    maxPrice?: number;
    regulations?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ products: DataProduct[]; total: number }> {
    const conditions: string[] = ["status = 'published'"];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.query) {
      conditions.push(
        `(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
      );
      values.push(`%${params.query}%`);
      paramIndex++;
    }

    if (params.category) {
      conditions.push(`category = $${paramIndex}`);
      values.push(params.category);
      paramIndex++;
    }

    if (params.maxRiskLevel) {
      const riskOrder = { low: 1, medium: 2, high: 3, critical: 4 };
      const maxLevel = riskOrder[params.maxRiskLevel as keyof typeof riskOrder];
      conditions.push(`
        CASE risk_level
          WHEN 'low' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'high' THEN 3
          WHEN 'critical' THEN 4
        END <= $${paramIndex}
      `);
      values.push(maxLevel);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');
    const limit = params.limit || 20;
    const offset = params.offset || 0;

    const countResult = await db.query(
      `SELECT COUNT(*) FROM data_products WHERE ${whereClause}`,
      values
    );

    const result = await db.query(
      `SELECT * FROM data_products WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...values, limit, offset]
    );

    return {
      products: result.rows.map(mapRowToProduct),
      total: parseInt(countResult.rows[0].count, 10),
    };
  },

  async publish(id: string, providerId: string): Promise<DataProduct | null> {
    const result = await db.query(
      `UPDATE data_products
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND provider_id = $2
       RETURNING *`,
      [id, providerId]
    );

    if (result.rows[0]) {
      logger.info('Product published', { productId: id });
      return mapRowToProduct(result.rows[0]);
    }
    return null;
  },

  async getByProvider(providerId: string): Promise<DataProduct[]> {
    const result = await db.query(
      'SELECT * FROM data_products WHERE provider_id = $1 ORDER BY created_at DESC',
      [providerId]
    );
    return result.rows.map(mapRowToProduct);
  },
};

function mapRowToProduct(row: Record<string, unknown>): DataProduct {
  return {
    id: row.id as string,
    providerId: row.provider_id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    category: row.category as DataProduct['category'],
    tags: row.tags as string[],
    schemaDefinition: row.schema_definition as Record<string, unknown>,
    rowCount: row.row_count as number | undefined,
    sizeBytes: row.size_bytes as number | undefined,
    lastUpdated: row.last_updated as Date | undefined,
    updateFrequency: row.update_frequency as string | undefined,
    qualityScore: row.quality_score as number | undefined,
    completeness: row.completeness as number | undefined,
    accuracy: row.accuracy as number | undefined,
    riskScore: row.risk_score as number | undefined,
    riskLevel: row.risk_level as DataProduct['riskLevel'],
    classification: row.classification as DataProduct['classification'],
    piiFields: row.pii_fields as string[],
    regulations: row.regulations as DataProduct['regulations'],
    pricingModel: row.pricing_model as string,
    basePriceCents: row.base_price_cents as number,
    currency: row.currency as string,
    status: row.status as string,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}
