"use strict";
/**
 * Dimension Manager for creating and managing dimension tables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DimensionManager = void 0;
class DimensionManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async createDimension(name, attributes) {
        const attrDefs = attributes.map((a) => `${a} VARCHAR(255)`).join(', ');
        await this.pool.query(`
      CREATE TABLE dim_${name} (
        ${name}_id BIGSERIAL PRIMARY KEY,
        ${name}_key VARCHAR(255) UNIQUE NOT NULL,
        ${attrDefs},
        effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiry_date TIMESTAMP,
        is_current BOOLEAN DEFAULT TRUE
      )
    `);
    }
    async insertDimensionRow(dimensionName, data) {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data)
            .map((_, idx) => `$${idx + 1}`)
            .join(', ');
        const result = await this.pool.query(`INSERT INTO dim_${dimensionName} (${columns}) VALUES (${placeholders}) RETURNING ${dimensionName}_id`, Object.values(data));
        return result.rows[0][`${dimensionName}_id`];
    }
}
exports.DimensionManager = DimensionManager;
