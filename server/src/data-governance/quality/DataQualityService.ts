
import { getPostgresPool } from '../../db/postgres.js';
import { QualityRule, QualityCheckResult, DataAsset } from '../types.js';
import { DataCatalogService } from '../catalog/DataCatalogService.js';
import { v4 as uuidv4 } from 'uuid';

export class DataQualityService {
  private static instance: DataQualityService;
  private catalog: DataCatalogService;

  private constructor() {
    this.catalog = DataCatalogService.getInstance();
  }

  static getInstance(): DataQualityService {
    if (!DataQualityService.instance) {
      DataQualityService.instance = new DataQualityService();
    }
    return DataQualityService.instance;
  }

  async defineRule(rule: Omit<QualityRule, 'id'>): Promise<QualityRule> {
    const pool = getPostgresPool();
    const id = uuidv4();
    const newRule: QualityRule = { ...rule, id };

    await pool.query(
      `INSERT INTO data_quality_rules (
        id, asset_id, name, type, params, criticality, tenant_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        newRule.id,
        newRule.assetId,
        newRule.name,
        newRule.type,
        JSON.stringify(newRule.params),
        newRule.criticality,
        newRule.tenantId,
      ]
    );

    return newRule;
  }

  async getRulesForAsset(assetId: string): Promise<QualityRule[]> {
    const pool = getPostgresPool();
    const result = await pool.query('SELECT * FROM data_quality_rules WHERE asset_id = $1', [assetId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      assetId: row.asset_id,
      name: row.name,
      type: row.type,
      params: row.params,
      criticality: row.criticality,
      tenantId: row.tenant_id,
    }));
  }

  async runChecks(assetId: string, tenantId: string): Promise<QualityCheckResult[]> {
    const asset = await this.catalog.getAsset(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }
    if (asset.tenantId !== tenantId) {
      throw new Error('Access denied: Asset belongs to a different tenant');
    }

    // Filter rules by tenant as well for double safety
    const allRules = await this.getRulesForAsset(assetId);
    const rules = allRules.filter(r => r.tenantId === tenantId);

    const results: QualityCheckResult[] = [];
    const pool = getPostgresPool();

    for (const rule of rules) {
      let passed = false;
      let observedValue: any = null;
      let details = '';

      try {
        if (asset.source === 'postgres') {
          const checkResult = await this.executePostgresCheck(asset, rule);
          passed = checkResult.passed;
          observedValue = checkResult.observedValue;
          details = checkResult.details || '';
        } else {
          // For now, skip non-postgres assets or mock
          details = 'Source not supported for automated checks';
          passed = false;
        }
      } catch (err: any) {
        details = `Error executing check: ${err.message}`;
        passed = false;
      }

      const result: QualityCheckResult = {
        id: uuidv4(),
        ruleId: rule.id,
        assetId,
        passed,
        observedValue,
        details,
        executedAt: new Date(),
        tenantId: asset.tenantId,
      };

      results.push(result);

      await pool.query(
        `INSERT INTO data_quality_results (
          id, rule_id, asset_id, passed, observed_value, details, executed_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          result.id,
          result.ruleId,
          result.assetId,
          result.passed,
          JSON.stringify(result.observedValue),
          result.details,
          result.executedAt,
          result.tenantId,
        ]
      );
    }

    return results;
  }

  // Basic identifier validation to prevent SQL injection
  private validateIdentifier(identifier: string): string {
    if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
      throw new Error(`Invalid identifier: ${identifier}`);
    }
    return `"${identifier}"`;
  }

  private async executePostgresCheck(asset: DataAsset, rule: QualityRule): Promise<{ passed: boolean, observedValue: any, details?: string }> {
    // NOTE: This assumes the asset name corresponds to a real table in the SAME database.
    // In a real system, we'd need a connector to the specific source DB.
    // For MVP, we assume it's checking tables within the app's DB or we mock it.

    const pool = getPostgresPool();

    // Strict validation of table name from asset name
    // This is still risky if asset.name is user controlled without validation elsewhere,
    // but assuming asset registration is trusted or validated.
    // We'll enforce a strict regex here.
    const tableName = this.validateIdentifier(asset.name);

    switch (rule.type) {
      case 'expect_column_values_to_be_not_null': {
        const column = this.validateIdentifier(rule.params.column);
        const query = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${column} IS NULL`;
        const res = await pool.query(query);
        const nullCount = parseInt(res.rows[0].count, 10);
        return { passed: nullCount === 0, observedValue: nullCount };
      }
      case 'expect_table_row_count_to_be_between': {
        const min = rule.params.min || 0;
        const max = rule.params.max || Number.MAX_SAFE_INTEGER;
        const query = `SELECT COUNT(*) as count FROM ${tableName}`;
        const res = await pool.query(query);
        const count = parseInt(res.rows[0].count, 10);
        return { passed: count >= min && count <= max, observedValue: count };
      }
      case 'expect_column_values_to_be_unique': {
        const column = this.validateIdentifier(rule.params.column);
        // distinct count vs total count
        const query = `SELECT COUNT(*) as total, COUNT(DISTINCT ${column}) as distinct_count FROM ${tableName}`;
        const res = await pool.query(query);
        const total = parseInt(res.rows[0].total, 10);
        const distinctCount = parseInt(res.rows[0].distinct_count, 10);
        return { passed: total === distinctCount, observedValue: { total, distinctCount } };
      }
      default:
        return { passed: false, observedValue: null, details: `Unsupported rule type: ${rule.type}` };
    }
  }
}
