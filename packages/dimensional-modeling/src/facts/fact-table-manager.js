"use strict";
/**
 * Fact Table Manager
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FactTableManager = void 0;
class FactTableManager {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async createFactTable(name, dimensions, measures) {
        const dimensionKeys = dimensions
            .map((d) => `${d}_key BIGINT`)
            .join(', ');
        const measureDefs = measures
            .map((m) => `${m.name} ${m.type}`)
            .join(', ');
        await this.pool.query(`
      CREATE TABLE fact_${name} (
        fact_id BIGSERIAL PRIMARY KEY,
        ${dimensionKeys},
        ${measureDefs},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    }
    async insertFact(factName, data) {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data)
            .map((_, idx) => `$${idx + 1}`)
            .join(', ');
        await this.pool.query(`INSERT INTO fact_${factName} (${columns}) VALUES (${placeholders})`, Object.values(data));
    }
}
exports.FactTableManager = FactTableManager;
