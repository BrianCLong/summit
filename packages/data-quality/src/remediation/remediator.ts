/**
 * Data quality remediation and improvement engine
 */

import { Pool } from 'pg';
import {
  RemediationPlan,
  RemediationStrategy,
  RemediationStep,
  ValidationResult,
  DataAnomaly,
} from '../types.js';

export class DataRemediator {
  constructor(private pool: Pool) {}

  /**
   * Create remediation plan for validation failures
   */
  createRemediationPlan(
    validationResult: ValidationResult,
    strategy: RemediationStrategy
  ): RemediationPlan {
    const steps: RemediationStep[] = [];

    switch (strategy) {
      case 'cleanse':
        steps.push(...this.createCleanseSteps(validationResult));
        break;
      case 'standardize':
        steps.push(...this.createStandardizeSteps(validationResult));
        break;
      case 'deduplicate':
        steps.push(...this.createDeduplicateSteps(validationResult));
        break;
      case 'impute':
        steps.push(...this.createImputeSteps(validationResult));
        break;
      case 'quarantine':
        steps.push(...this.createQuarantineSteps(validationResult));
        break;
    }

    return {
      id: this.generateId(),
      validationResultId: validationResult.ruleId,
      strategy,
      steps,
      status: 'pending',
      automatable: this.isAutomatable(strategy, validationResult),
      estimatedDuration: this.estimateDuration(steps),
      createdAt: new Date(),
    };
  }

  /**
   * Execute remediation plan
   */
  async executeRemediationPlan(plan: RemediationPlan): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      plan.status = 'in-progress';
      plan.executedAt = new Date();

      for (const step of plan.steps) {
        step.status = 'running';

        try {
          const result = await this.executeStep(client, step);
          step.result = result;
          step.status = 'completed';
        } catch (error) {
          step.status = 'failed';
          step.result = { error: error instanceof Error ? error.message : 'Unknown error' };
          throw error;
        }
      }

      await client.query('COMMIT');
      plan.status = 'completed';
      plan.completedAt = new Date();
    } catch (error) {
      await client.query('ROLLBACK');
      plan.status = 'failed';
      throw error;
    } finally {
      client.release();
    }
  }

  private async executeStep(client: any, step: RemediationStep): Promise<any> {
    const { action, parameters } = step;

    switch (action) {
      case 'remove-nulls':
        return await this.removeNulls(client, parameters);
      case 'remove-duplicates':
        return await this.removeDuplicates(client, parameters);
      case 'standardize-format':
        return await this.standardizeFormat(client, parameters);
      case 'impute-values':
        return await this.imputeValues(client, parameters);
      case 'quarantine-records':
        return await this.quarantineRecords(client, parameters);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private createCleanseSteps(validationResult: ValidationResult): RemediationStep[] {
    return [
      {
        order: 1,
        action: 'remove-nulls',
        parameters: {
          tableName: validationResult.ruleId.split(':')[0],
          columns: validationResult.affectedColumns,
        },
        status: 'pending',
      },
      {
        order: 2,
        action: 'remove-invalid-values',
        parameters: {
          tableName: validationResult.ruleId.split(':')[0],
          columns: validationResult.affectedColumns,
        },
        status: 'pending',
      },
    ];
  }

  private createStandardizeSteps(validationResult: ValidationResult): RemediationStep[] {
    return [
      {
        order: 1,
        action: 'standardize-format',
        parameters: {
          tableName: validationResult.ruleId.split(':')[0],
          columns: validationResult.affectedColumns,
          format: 'uppercase',
        },
        status: 'pending',
      },
      {
        order: 2,
        action: 'trim-whitespace',
        parameters: {
          tableName: validationResult.ruleId.split(':')[0],
          columns: validationResult.affectedColumns,
        },
        status: 'pending',
      },
    ];
  }

  private createDeduplicateSteps(validationResult: ValidationResult): RemediationStep[] {
    return [
      {
        order: 1,
        action: 'identify-duplicates',
        parameters: {
          tableName: validationResult.ruleId.split(':')[0],
          columns: validationResult.affectedColumns,
        },
        status: 'pending',
      },
      {
        order: 2,
        action: 'remove-duplicates',
        parameters: {
          tableName: validationResult.ruleId.split(':')[0],
          columns: validationResult.affectedColumns,
          keepFirst: true,
        },
        status: 'pending',
      },
    ];
  }

  private createImputeSteps(validationResult: ValidationResult): RemediationStep[] {
    return [
      {
        order: 1,
        action: 'impute-values',
        parameters: {
          tableName: validationResult.ruleId.split(':')[0],
          columns: validationResult.affectedColumns,
          strategy: 'mean', // or 'median', 'mode', 'forward-fill'
        },
        status: 'pending',
      },
    ];
  }

  private createQuarantineSteps(validationResult: ValidationResult): RemediationStep[] {
    return [
      {
        order: 1,
        action: 'quarantine-records',
        parameters: {
          tableName: validationResult.ruleId.split(':')[0],
          violations: validationResult.violations,
        },
        status: 'pending',
      },
    ];
  }

  private async removeNulls(client: any, parameters: any): Promise<any> {
    const { tableName, columns } = parameters;

    const conditions = columns.map((col: string) => `"${col}" IS NULL`).join(' OR ');
    const query = `DELETE FROM "${tableName}" WHERE ${conditions}`;

    const result = await client.query(query);
    return { deletedRows: result.rowCount };
  }

  private async removeDuplicates(client: any, parameters: any): Promise<any> {
    const { tableName, columns, keepFirst } = parameters;

    const columnsStr = columns.map((col: string) => `"${col}"`).join(', ');
    const query = `
      DELETE FROM "${tableName}" a
      USING "${tableName}" b
      WHERE a.ctid < b.ctid
        AND ${columns.map((col: string) => `a."${col}" = b."${col}"`).join(' AND ')}
    `;

    const result = await client.query(query);
    return { deletedRows: result.rowCount };
  }

  private async standardizeFormat(client: any, parameters: any): Promise<any> {
    const { tableName, columns, format } = parameters;

    const updates = columns.map((col: string) => {
      if (format === 'uppercase') {
        return `"${col}" = UPPER("${col}")`;
      } else if (format === 'lowercase') {
        return `"${col}" = LOWER("${col}")`;
      }
      return '';
    }).filter(Boolean).join(', ');

    const query = `UPDATE "${tableName}" SET ${updates}`;
    const result = await client.query(query);
    return { updatedRows: result.rowCount };
  }

  private async imputeValues(client: any, parameters: any): Promise<any> {
    const { tableName, columns, strategy } = parameters;

    const results: any = {};

    for (const col of columns) {
      let imputeValue: any;

      if (strategy === 'mean') {
        const meanQuery = `SELECT AVG("${col}") as mean_val FROM "${tableName}" WHERE "${col}" IS NOT NULL`;
        const meanResult = await client.query(meanQuery);
        imputeValue = meanResult.rows[0].mean_val;
      } else if (strategy === 'median') {
        const medianQuery = `
          SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "${col}") as median_val
          FROM "${tableName}"
          WHERE "${col}" IS NOT NULL
        `;
        const medianResult = await client.query(medianQuery);
        imputeValue = medianResult.rows[0].median_val;
      } else if (strategy === 'mode') {
        const modeQuery = `
          SELECT "${col}" as mode_val
          FROM "${tableName}"
          WHERE "${col}" IS NOT NULL
          GROUP BY "${col}"
          ORDER BY COUNT(*) DESC
          LIMIT 1
        `;
        const modeResult = await client.query(modeQuery);
        imputeValue = modeResult.rows[0]?.mode_val;
      }

      if (imputeValue !== undefined) {
        const updateQuery = `
          UPDATE "${tableName}"
          SET "${col}" = $1
          WHERE "${col}" IS NULL
        `;
        const result = await client.query(updateQuery, [imputeValue]);
        results[col] = { imputedRows: result.rowCount, imputeValue };
      }
    }

    return results;
  }

  private async quarantineRecords(client: any, parameters: any): Promise<any> {
    const { tableName, violations } = parameters;
    const quarantineTable = `${tableName}_quarantine`;

    // Create quarantine table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${quarantineTable}" (
        LIKE "${tableName}" INCLUDING ALL,
        quarantine_reason TEXT,
        quarantined_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Move violating records to quarantine
    let movedRecords = 0;
    for (const violation of violations) {
      if (violation.rowId) {
        await client.query(`
          INSERT INTO "${quarantineTable}"
          SELECT *, $1, NOW()
          FROM "${tableName}"
          WHERE id = $2
        `, [violation.message, violation.rowId]);

        await client.query(`
          DELETE FROM "${tableName}"
          WHERE id = $1
        `, [violation.rowId]);

        movedRecords++;
      }
    }

    return { quarantinedRecords: movedRecords };
  }

  private isAutomatable(strategy: RemediationStrategy, validationResult: ValidationResult): boolean {
    // Some strategies are safe to automate, others require human review
    const automatable = ['cleanse', 'standardize', 'deduplicate'];
    return automatable.includes(strategy) && validationResult.severity !== 'critical';
  }

  private estimateDuration(steps: RemediationStep[]): number {
    // Simple duration estimation in minutes
    return steps.length * 5;
  }

  private generateId(): string {
    return `rem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
