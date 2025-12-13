/**
 * Policy Engine
 *
 * Evaluates license-aware policy decisions for data operations.
 */

import { Pool } from 'pg';
import { z } from 'zod';

export type OperationType = 'INGEST' | 'EXPORT' | 'SHARE' | 'TRANSFORM';

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  licenseId: string;
  violations?: string[];
  warnings?: string[];
  context?: Record<string, unknown>;
}

export interface PolicyContext {
  operation: OperationType;
  licenseId: string;
  audience?: string; // 'internal' | 'external' | 'third-party'
  jurisdiction?: string; // ISO country code
  purpose?: string;
  requestedBy?: string;
}

/**
 * License interface (subset needed for policy evaluation)
 */
interface License {
  id: string;
  name: string;
  type: string;
  restrictions: {
    commercial_use: boolean;
    export_allowed: boolean;
    research_only: boolean;
    attribution_required: boolean;
    share_alike: boolean;
    internal_only?: boolean;
    no_third_party?: boolean;
  };
  compliance_level: 'allow' | 'warn' | 'block';
  expiry_date?: string;
}

/**
 * Data Source interface (subset needed for policy evaluation)
 */
interface DataSource {
  id: string;
  name: string;
  license_id: string;
  dpia_completed: boolean;
  pii_classification: 'none' | 'low' | 'medium' | 'high' | 'critical';
  geographic_restrictions: string[];
}

/**
 * Policy Engine
 */
export class PolicyEngine {
  constructor(private pool: Pool) {}

  /**
   * Evaluate a policy decision
   */
  async evaluate(context: PolicyContext): Promise<PolicyDecision> {
    const { operation, licenseId, audience, jurisdiction, purpose } = context;

    // Load license
    const license = await this.getLicense(licenseId);

    if (!license) {
      return {
        allow: false,
        reason: `License not found: ${licenseId}`,
        licenseId,
      };
    }

    // Check if license is expired
    if (license.expiry_date) {
      const expiryDate = new Date(license.expiry_date);
      if (expiryDate < new Date()) {
        return {
          allow: false,
          reason: `License expired on ${license.expiry_date}`,
          licenseId,
        };
      }
    }

    const violations: string[] = [];
    const warnings: string[] = [];

    // Operation-specific checks
    switch (operation) {
      case 'INGEST':
        this.evaluateIngest(license, violations, warnings);
        break;

      case 'EXPORT':
        this.evaluateExport(license, audience, violations, warnings);
        break;

      case 'SHARE':
        this.evaluateShare(license, audience, jurisdiction, violations, warnings);
        break;

      case 'TRANSFORM':
        this.evaluateTransform(license, purpose, violations, warnings);
        break;
    }

    // Apply compliance level
    if (license.compliance_level === 'block') {
      violations.push('License is marked as blocked for compliance reasons');
    } else if (license.compliance_level === 'warn') {
      warnings.push('License requires additional review and approval');
    }

    // Determine overall decision
    const allow = violations.length === 0;

    return {
      allow,
      reason: allow
        ? this.generateAllowReason(operation, warnings)
        : this.generateDenyReason(violations),
      licenseId,
      violations: violations.length > 0 ? violations : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      context: {
        operation,
        audience,
        jurisdiction,
        purpose,
        licenseType: license.type,
      },
    };
  }

  /**
   * Evaluate policy for data source
   */
  async evaluateForDataSource(
    dataSourceId: string,
    operation: OperationType,
    context?: Omit<PolicyContext, 'operation' | 'licenseId'>
  ): Promise<PolicyDecision> {
    // Load data source
    const dataSource = await this.getDataSource(dataSourceId);

    if (!dataSource) {
      return {
        allow: false,
        reason: `Data source not found: ${dataSourceId}`,
        licenseId: '',
      };
    }

    // Evaluate license
    const policyContext: PolicyContext = {
      operation,
      licenseId: dataSource.license_id,
      ...context,
    };

    const decision = await this.evaluate(policyContext);

    // Add data source-specific checks
    if (decision.allow) {
      const dsViolations: string[] = [];
      const dsWarnings: string[] = [];

      // DPIA check for high-risk data
      if (
        ['high', 'critical'].includes(dataSource.pii_classification) &&
        !dataSource.dpia_completed
      ) {
        dsWarnings.push(
          'DPIA assessment required for high-risk PII processing'
        );
      }

      // Geographic restrictions
      if (
        context?.jurisdiction &&
        dataSource.geographic_restrictions.includes(context.jurisdiction)
      ) {
        dsViolations.push(
          `Data processing restricted in jurisdiction: ${context.jurisdiction}`
        );
      }

      if (dsViolations.length > 0) {
        return {
          allow: false,
          reason: this.generateDenyReason([
            ...(decision.violations || []),
            ...dsViolations,
          ]),
          licenseId: dataSource.license_id,
          violations: [...(decision.violations || []), ...dsViolations],
          warnings: [...(decision.warnings || []), ...dsWarnings],
          context: decision.context,
        };
      }

      if (dsWarnings.length > 0) {
        return {
          ...decision,
          warnings: [...(decision.warnings || []), ...dsWarnings],
          reason: this.generateAllowReason(operation, [
            ...(decision.warnings || []),
            ...dsWarnings,
          ]),
        };
      }
    }

    return decision;
  }

  /**
   * Evaluate INGEST operation
   */
  private evaluateIngest(
    license: License,
    violations: string[],
    warnings: string[]
  ): void {
    // INGEST is generally allowed unless explicitly forbidden
    // Most licenses allow ingestion, restrictions apply to downstream use

    if (license.compliance_level === 'block') {
      // Will be caught by compliance level check
      return;
    }

    if (license.restrictions.attribution_required) {
      warnings.push(
        'License requires attribution - ensure proper source attribution is maintained'
      );
    }
  }

  /**
   * Evaluate EXPORT operation
   */
  private evaluateExport(
    license: License,
    audience: string | undefined,
    violations: string[],
    warnings: string[]
  ): void {
    // Check export permission
    if (!license.restrictions.export_allowed) {
      violations.push('Export not permitted under license terms');
      return;
    }

    // Check internal-only restriction
    if (license.restrictions.internal_only && audience !== 'internal') {
      violations.push(
        'License restricts use to internal audience only - external export not permitted'
      );
    }

    // Check third-party restriction
    if (
      license.restrictions.no_third_party &&
      audience === 'third-party'
    ) {
      violations.push(
        'License prohibits sharing with third parties'
      );
    }

    // Research-only check
    if (license.restrictions.research_only) {
      warnings.push(
        'License restricts use to research purposes - verify export purpose'
      );
    }

    // Attribution check
    if (license.restrictions.attribution_required) {
      warnings.push(
        'License requires attribution - ensure exported data includes proper source attribution'
      );
    }
  }

  /**
   * Evaluate SHARE operation
   */
  private evaluateShare(
    license: License,
    audience: string | undefined,
    jurisdiction: string | undefined,
    violations: string[],
    warnings: string[]
  ): void {
    // Similar to EXPORT but with additional checks

    // Check export permission (sharing requires export)
    if (!license.restrictions.export_allowed) {
      violations.push('Sharing not permitted (export restricted under license)');
      return;
    }

    // Check internal-only restriction
    if (license.restrictions.internal_only) {
      violations.push(
        'License restricts use to internal audience only - sharing not permitted'
      );
    }

    // Check third-party restriction
    if (license.restrictions.no_third_party) {
      violations.push('License prohibits sharing with third parties');
    }

    // Research-only check
    if (license.restrictions.research_only && audience !== 'internal') {
      violations.push(
        'License restricts use to research purposes - external sharing not permitted'
      );
    }

    // Share-alike check
    if (license.restrictions.share_alike) {
      warnings.push(
        'License requires share-alike - derivative works must use same license'
      );
    }

    // Attribution check
    if (license.restrictions.attribution_required) {
      warnings.push(
        'License requires attribution - ensure shared data includes proper source attribution'
      );
    }
  }

  /**
   * Evaluate TRANSFORM operation
   */
  private evaluateTransform(
    license: License,
    purpose: string | undefined,
    violations: string[],
    warnings: string[]
  ): void {
    // Research-only check
    if (license.restrictions.research_only && purpose !== 'research') {
      violations.push(
        'License restricts use to research purposes - commercial transformation not permitted'
      );
    }

    // Commercial use check
    if (!license.restrictions.commercial_use && purpose === 'commercial') {
      violations.push(
        'License does not permit commercial use - commercial transformation not allowed'
      );
    }

    // Share-alike check
    if (license.restrictions.share_alike) {
      warnings.push(
        'License requires share-alike - transformed data must use same license'
      );
    }
  }

  /**
   * Get license by ID
   */
  private async getLicense(licenseId: string): Promise<License | null> {
    const result = await this.pool.query(
      'SELECT * FROM licenses WHERE id = $1',
      [licenseId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      restrictions: row.restrictions,
      compliance_level: row.compliance_level,
      expiry_date: row.expiry_date,
    };
  }

  /**
   * Get data source by ID
   */
  private async getDataSource(
    dataSourceId: string
  ): Promise<DataSource | null> {
    const result = await this.pool.query(
      'SELECT * FROM data_sources WHERE id = $1',
      [dataSourceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];

    return {
      id: row.id,
      name: row.name,
      license_id: row.license_id,
      dpia_completed: row.dpia_completed,
      pii_classification: row.pii_classification,
      geographic_restrictions: row.geographic_restrictions,
    };
  }

  /**
   * Generate allow reason
   */
  private generateAllowReason(
    operation: OperationType,
    warnings: string[]
  ): string {
    const baseReason = `${operation} operation is permitted under license terms`;

    if (warnings.length > 0) {
      return `${baseReason}. WARNINGS: ${warnings.join('; ')}.`;
    }

    return `${baseReason}.`;
  }

  /**
   * Generate deny reason
   */
  private generateDenyReason(violations: string[]): string {
    return `Operation blocked due to license violations: ${violations.join('; ')}.`;
  }
}
