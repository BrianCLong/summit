"use strict";
/**
 * Star Schema Implementation for Data Warehousing
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StarSchema = void 0;
class StarSchema {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async createDimensionTable(dimension) {
        const columnDefs = dimension.columns
            .map((c) => {
            const pk = c.isPrimaryKey ? 'PRIMARY KEY' : '';
            return `${c.name} ${c.type} ${pk}`.trim();
        })
            .join(',\n  ');
        await this.pool.query(`
      CREATE TABLE ${dimension.name} (
        ${columnDefs},
        effective_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expiry_date TIMESTAMP,
        is_current BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Create indexes
        await this.pool.query(`
      CREATE INDEX idx_${dimension.name}_${dimension.surrogateKey}
      ON ${dimension.name}(${dimension.surrogateKey})
    `);
        if (dimension.naturalKey) {
            await this.pool.query(`
        CREATE INDEX idx_${dimension.name}_natural
        ON ${dimension.name}(${dimension.naturalKey.join(', ')})
      `);
        }
    }
    async createFactTable(fact) {
        const measureDefs = fact.measures
            .map((m) => `${m.name} ${m.type}`)
            .join(',\n  ');
        const dimensionKeys = fact.dimensions
            .map((d) => `${d}_key BIGINT REFERENCES ${d}(${d}_id)`)
            .join(',\n  ');
        const partitionClause = fact.partitionKey
            ? `PARTITION BY RANGE(${fact.partitionKey})`
            : '';
        await this.pool.query(`
      CREATE TABLE ${fact.name} (
        fact_id BIGSERIAL PRIMARY KEY,
        ${dimensionKeys},
        ${measureDefs},
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ${partitionClause}
    `);
        // Create indexes on foreign keys
        for (const dimension of fact.dimensions) {
            await this.pool.query(`
        CREATE INDEX idx_${fact.name}_${dimension}
        ON ${fact.name}(${dimension}_key)
      `);
        }
    }
    async queryStarSchema(factTable, dimensions, measures, filters) {
        const joins = dimensions
            .map((d) => `LEFT JOIN ${d} ON ${factTable}.${d}_key = ${d}.${d}_id`)
            .join('\n');
        const selectCols = [
            ...dimensions.map((d) => `${d}.*`),
            ...measures.map((m) => `${factTable}.${m}`),
        ].join(', ');
        const whereClause = filters
            ? `WHERE ${Object.entries(filters)
                .map(([k, v]) => `${k} = '${v}'`)
                .join(' AND ')}`
            : '';
        const query = `
      SELECT ${selectCols}
      FROM ${factTable}
      ${joins}
      ${whereClause}
    `;
        const result = await this.pool.query(query);
        return result.rows;
    }
}
exports.StarSchema = StarSchema;
