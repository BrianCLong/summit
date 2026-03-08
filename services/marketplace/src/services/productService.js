"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = void 0;
const uuid_1 = require("uuid");
const db_js_1 = require("../utils/db.js");
const logger_js_1 = require("../utils/logger.js");
const riskScorerService_js_1 = require("./riskScorerService.js");
/**
 * Service for managing data products in the marketplace.
 * Handles product lifecycle including creation, search, publishing, and risk assessment.
 */
exports.productService = {
    /**
     * Creates a new data product in the marketplace.
     * Automatically performs risk assessment and assigns risk scores.
     *
     * @param providerId - The ID of the provider creating the product
     * @param input - Product details including name, description, schema, and pricing
     * @returns The created data product with generated ID and risk assessment
     * @throws Error if database operation fails
     */
    async create(providerId, input) {
        const id = (0, uuid_1.v4)();
        const now = new Date();
        const product = {
            id,
            providerId,
            ...input,
            status: 'draft',
            createdAt: now,
            updatedAt: now,
        };
        // Auto-assess risk
        const riskAssessment = await riskScorerService_js_1.riskScorerService.assess(product);
        product.riskScore = riskAssessment.overallScore;
        product.riskLevel = riskAssessment.riskLevel;
        await db_js_1.db.query(`INSERT INTO data_products (
        id, provider_id, name, description, category, tags,
        schema_definition, classification, pii_fields, regulations,
        pricing_model, base_price_cents, currency, status,
        risk_score, risk_level, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`, [
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
        ]);
        logger_js_1.logger.info('Product created', { productId: id, providerId });
        return product;
    },
    /**
     * Retrieves a data product by its ID.
     *
     * @param id - The unique identifier of the product
     * @returns The data product if found, null otherwise
     */
    async findById(id) {
        const result = await db_js_1.db.query('SELECT * FROM data_products WHERE id = $1', [id]);
        return result.rows[0] ? mapRowToProduct(result.rows[0]) : null;
    },
    /**
     * Searches for published data products with filtering and pagination.
     * Supports full-text search, category filtering, risk level filtering, and price ranges.
     *
     * @param params - Search parameters
     * @param params.query - Optional text search across name and description
     * @param params.category - Optional category filter
     * @param params.maxRiskLevel - Optional maximum risk level (low, medium, high, critical)
     * @param params.minPrice - Optional minimum price filter
     * @param params.maxPrice - Optional maximum price filter
     * @param params.regulations - Optional array of regulation compliance filters
     * @param params.limit - Maximum number of results to return (default: 20)
     * @param params.offset - Number of results to skip for pagination (default: 0)
     * @returns Object containing matching products array and total count
     */
    async search(params) {
        const conditions = ["status = 'published'"];
        const values = [];
        let paramIndex = 1;
        if (params.query) {
            conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
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
            const maxLevel = riskOrder[params.maxRiskLevel];
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
        const countResult = await db_js_1.db.query(`SELECT COUNT(*) FROM data_products WHERE ${whereClause}`, values);
        const result = await db_js_1.db.query(`SELECT * FROM data_products WHERE ${whereClause}
       ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...values, limit, offset]);
        return {
            products: result.rows.map(mapRowToProduct),
            total: parseInt(countResult.rows[0].count, 10),
        };
    },
    /**
     * Publishes a data product, making it available in the marketplace.
     * Only the product owner (provider) can publish their products.
     *
     * @param id - The ID of the product to publish
     * @param providerId - The ID of the provider (must match product owner)
     * @returns The updated product if found and published, null otherwise
     */
    async publish(id, providerId) {
        const result = await db_js_1.db.query(`UPDATE data_products
       SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND provider_id = $2
       RETURNING *`, [id, providerId]);
        if (result.rows[0]) {
            logger_js_1.logger.info('Product published', { productId: id });
            return mapRowToProduct(result.rows[0]);
        }
        return null;
    },
    /**
     * Retrieves all data products for a specific provider.
     * Returns products in descending order by creation date.
     *
     * @param providerId - The ID of the provider
     * @returns Array of data products owned by the provider
     */
    async getByProvider(providerId) {
        const result = await db_js_1.db.query('SELECT * FROM data_products WHERE provider_id = $1 ORDER BY created_at DESC', [providerId]);
        return result.rows.map(mapRowToProduct);
    },
};
/**
 * Maps a database row to a DataProduct object.
 * Handles type conversions and snake_case to camelCase transformation.
 *
 * @param row - The database row containing product data
 * @returns Typed DataProduct object
 */
function mapRowToProduct(row) {
    return {
        id: row.id,
        providerId: row.provider_id,
        name: row.name,
        description: row.description,
        category: row.category,
        tags: row.tags,
        schemaDefinition: row.schema_definition,
        rowCount: row.row_count,
        sizeBytes: row.size_bytes,
        lastUpdated: row.last_updated,
        updateFrequency: row.update_frequency,
        qualityScore: row.quality_score,
        completeness: row.completeness,
        accuracy: row.accuracy,
        riskScore: row.risk_score,
        riskLevel: row.risk_level,
        classification: row.classification,
        piiFields: row.pii_fields,
        regulations: row.regulations,
        pricingModel: row.pricing_model,
        basePriceCents: row.base_price_cents,
        currency: row.currency,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
