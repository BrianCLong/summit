/**
 * Semantic Layer for BI Tools
 *
 * Provides business-friendly names and relationships for BI tools
 */

import { Pool } from 'pg';

export interface SemanticModel {
  name: string;
  description: string;
  tables: SemanticTable[];
  relationships: SemanticRelationship[];
  measures: SemanticMeasure[];
}

export interface SemanticTable {
  logicalName: string;
  physicalName: string;
  description: string;
  columns: SemanticColumn[];
}

export interface SemanticColumn {
  logicalName: string;
  physicalName: string;
  dataType: string;
  description: string;
  aggregation?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  format?: string;
}

export interface SemanticRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cardinality: '1:1' | '1:N' | 'N:N';
}

export interface SemanticMeasure {
  name: string;
  expression: string;
  format: string;
  description: string;
}

export class SemanticLayer {
  constructor(private pool: Pool) {}

  /**
   * Create semantic model
   */
  async createModel(model: SemanticModel): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO warehouse_semantic_models (name, description, definition)
      VALUES ($1, $2, $3)
      ON CONFLICT (name) DO UPDATE
      SET description = EXCLUDED.description,
          definition = EXCLUDED.definition
    `,
      [model.name, model.description, JSON.stringify(model)],
    );
  }

  /**
   * Get model definition
   */
  async getModel(name: string): Promise<SemanticModel | null> {
    const result = await this.pool.query(
      `SELECT definition FROM warehouse_semantic_models WHERE name = $1`,
      [name],
    );

    if (result.rows.length === 0) return null;

    return JSON.parse(result.rows[0].definition);
  }

  /**
   * Generate Tableau TDS file
   */
  generateTableauTDS(model: SemanticModel): string {
    const relations = model.tables
      .map(
        (table) => `
      <relation name="${table.logicalName}" table="${table.physicalName}" type="table">
        ${table.columns
          .map(
            (col) => `
          <column name="${col.logicalName}" datatype="${this.mapToTableauType(col.dataType)}" />
        `,
          )
          .join('')}
      </relation>
    `,
      )
      .join('');

    const joins = model.relationships
      .map(
        (rel) => `
      <relation join="inner" type="join">
        <clause type="join">
          <expression op="=">${rel.fromTable}.${rel.fromColumn}</expression>
          <expression op="=">${rel.toTable}.${rel.toColumn}</expression>
        </clause>
      </relation>
    `,
      )
      .join('');

    return `<?xml version="1.0" encoding="utf-8"?>
<datasource name="${model.name}" version="10.0">
  <connection class="postgres" dbname="warehouse" server="localhost" port="5432">
    ${relations}
    ${joins}
  </connection>
</datasource>`;
  }

  /**
   * Generate LookML for Looker
   */
  generateLookML(model: SemanticModel): string {
    const views = model.tables
      .map(
        (table) => `
view: ${table.logicalName} {
  sql_table_name: ${table.physicalName} ;;

  ${table.columns
    .map(
      (col) => `
  dimension: ${col.logicalName} {
    type: ${this.mapToLookerType(col.dataType)}
    sql: \${TABLE}.${col.physicalName} ;;
    description: "${col.description}"
  }
  `,
    )
    .join('')}
}
`,
      )
      .join('\n');

    const explores = `
explore: ${model.tables[0].logicalName} {
  ${model.relationships
    .map(
      (rel) => `
  join: ${rel.toTable} {
    sql_on: \${${rel.fromTable}.${rel.fromColumn}} = \${${rel.toTable}.${rel.toColumn}} ;;
    relationship: ${rel.cardinality.replace(':', '_to_')}
  }
  `,
    )
    .join('')}
}
`;

    return `${views}\n${explores}`;
  }

  /**
   * Generate Power BI M Query
   */
  generatePowerBIM(model: SemanticModel): string {
    return `let
  Source = PostgreSQL.Database("localhost", "warehouse"),
  ${model.tables
    .map(
      (table, idx) => `
  Table${idx} = Source{[Schema="public",Item="${table.physicalName}"]}[Data],
  Renamed${idx} = Table.RenameColumns(Table${idx}, {
    ${table.columns.map((col) => `{"${col.physicalName}", "${col.logicalName}"}`).join(',\n    ')}
  })`,
    )
    .join(',\n  ')}
in
  Renamed0`;
  }

  /**
   * Initialize semantic layer tables
   */
  async initializeTables(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS warehouse_semantic_models (
        model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        definition JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_semantic_models_name
      ON warehouse_semantic_models(name);
    `);
  }

  /**
   * Create example semantic model
   */
  async createExampleModel(): Promise<void> {
    const model: SemanticModel = {
      name: 'Sales Analytics',
      description: 'Comprehensive sales analytics model',
      tables: [
        {
          logicalName: 'Sales',
          physicalName: 'fact_sales',
          description: 'Sales transactions',
          columns: [
            {
              logicalName: 'Sale Date',
              physicalName: 'sale_date',
              dataType: 'DATE',
              description: 'Date of sale',
            },
            {
              logicalName: 'Revenue',
              physicalName: 'revenue',
              dataType: 'DECIMAL',
              description: 'Total revenue',
              aggregation: 'SUM',
              format: '$#,##0.00',
            },
            {
              logicalName: 'Quantity',
              physicalName: 'quantity',
              dataType: 'INTEGER',
              description: 'Quantity sold',
              aggregation: 'SUM',
            },
          ],
        },
        {
          logicalName: 'Products',
          physicalName: 'dim_product',
          description: 'Product dimension',
          columns: [
            {
              logicalName: 'Product Name',
              physicalName: 'product_name',
              dataType: 'VARCHAR',
              description: 'Product name',
            },
            {
              logicalName: 'Category',
              physicalName: 'category',
              dataType: 'VARCHAR',
              description: 'Product category',
            },
          ],
        },
      ],
      relationships: [
        {
          fromTable: 'Sales',
          fromColumn: 'product_key',
          toTable: 'Products',
          toColumn: 'product_key',
          cardinality: 'N:1',
        },
      ],
      measures: [
        {
          name: 'Total Revenue',
          expression: 'SUM(revenue)',
          format: '$#,##0.00',
          description: 'Sum of all revenue',
        },
        {
          name: 'Average Order Value',
          expression: 'SUM(revenue) / COUNT(DISTINCT order_id)',
          format: '$#,##0.00',
          description: 'Average revenue per order',
        },
      ],
    };

    await this.createModel(model);
  }

  // Helper methods for type mapping

  private mapToTableauType(sqlType: string): string {
    const mapping: Record<string, string> = {
      INTEGER: 'integer',
      BIGINT: 'integer',
      DECIMAL: 'real',
      NUMERIC: 'real',
      VARCHAR: 'string',
      TEXT: 'string',
      DATE: 'date',
      TIMESTAMP: 'datetime',
      BOOLEAN: 'boolean',
    };
    return mapping[sqlType.toUpperCase()] || 'string';
  }

  private mapToLookerType(sqlType: string): string {
    const mapping: Record<string, string> = {
      INTEGER: 'number',
      BIGINT: 'number',
      DECIMAL: 'number',
      NUMERIC: 'number',
      VARCHAR: 'string',
      TEXT: 'string',
      DATE: 'date',
      TIMESTAMP: 'time',
      BOOLEAN: 'yesno',
    };
    return mapping[sqlType.toUpperCase()] || 'string';
  }
}
