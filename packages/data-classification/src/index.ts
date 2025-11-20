/**
 * Data Classification System
 *
 * Implements data classification with TLP (Traffic Light Protocol) support,
 * automatic classification suggestions, and classification-based access control
 */

import { Pool, PoolClient } from 'pg';
import { DataClassification, PIICategory } from '@intelgraph/compliance';
import { AuditLogger, AuditActions } from '@intelgraph/audit-logging';

/**
 * Classification level hierarchy (from lowest to highest)
 */
export const CLASSIFICATION_HIERARCHY: Record<DataClassification, number> = {
  [DataClassification.PUBLIC]: 0,
  [DataClassification.TLP_CLEAR]: 1,
  [DataClassification.UNCLASSIFIED]: 2,
  [DataClassification.TLP_GREEN]: 3,
  [DataClassification.INTERNAL]: 4,
  [DataClassification.TLP_AMBER]: 5,
  [DataClassification.CONFIDENTIAL]: 6,
  [DataClassification.TLP_AMBER_STRICT]: 7,
  [DataClassification.RESTRICTED]: 8,
  [DataClassification.SECRET]: 9,
  [DataClassification.HIGHLY_RESTRICTED]: 10,
  [DataClassification.TLP_RED]: 11,
  [DataClassification.TOP_SECRET]: 12,
};

/**
 * TLP (Traffic Light Protocol) descriptions
 */
export const TLP_DESCRIPTIONS = {
  [DataClassification.TLP_CLEAR]: {
    description: 'Recipients can spread this to the world, there is no limit on disclosure',
    sharing: 'Unlimited disclosure',
    audience: 'Public',
    color: '#FFFFFF',
  },
  [DataClassification.TLP_GREEN]: {
    description: 'Recipients can share with peers and partner organizations within their sector or community',
    sharing: 'Community-wide disclosure',
    audience: 'Community',
    color: '#33FF00',
  },
  [DataClassification.TLP_AMBER]: {
    description: 'Recipients can share on a need-to-know basis within their organization and its clients',
    sharing: 'Limited disclosure',
    audience: 'Organization',
    color: '#FFC000',
  },
  [DataClassification.TLP_AMBER_STRICT]: {
    description: 'Recipients can only share on a need-to-know basis with members of their own organization',
    sharing: 'Restricted disclosure within organization only',
    audience: 'Organization (strict)',
    color: '#FF8C00',
  },
  [DataClassification.TLP_RED]: {
    description: 'Recipients cannot share with anyone else',
    sharing: 'No disclosure',
    audience: 'Named recipients only',
    color: '#FF0033',
  },
};

export interface ClassificationRule {
  id: string;
  name: string;
  description: string;
  pattern: string; // Regex pattern
  classification: DataClassification;
  confidence: number; // 0-1
  piiCategory?: PIICategory;
  enabled: boolean;
  priority: number;
}

export interface ClassificationSuggestion {
  suggestedClassification: DataClassification;
  confidence: number;
  reasons: string[];
  detectedPII: PIICategory[];
  matchedRules: string[];
}

export interface ClassifiedData {
  id: string;
  resourceType: string;
  resourceId: string;
  classification: DataClassification;
  classifiedBy: string;
  classifiedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  justification?: string;
  autoClassified: boolean;
  piiCategories: PIICategory[];
  handlingInstructions?: string;
  expiresAt?: Date;
  markings?: string[];
}

/**
 * Data Classification Manager
 */
export class DataClassificationManager {
  private pool: Pool;
  private auditLogger?: AuditLogger;

  constructor(pool: Pool, auditLogger?: AuditLogger) {
    this.pool = pool;
    this.auditLogger = auditLogger;
  }

  /**
   * Initialize classification tables
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        -- Classification rules for automatic classification
        CREATE TABLE IF NOT EXISTS classification_rules (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          pattern TEXT NOT NULL,
          classification VARCHAR(50) NOT NULL,
          confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
          pii_category VARCHAR(50),
          enabled BOOLEAN DEFAULT TRUE,
          priority INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_classification_rules_enabled ON classification_rules(enabled);
        CREATE INDEX IF NOT EXISTS idx_classification_rules_priority ON classification_rules(priority DESC);

        -- Classified data registry
        CREATE TABLE IF NOT EXISTS classified_data (
          id VARCHAR(255) PRIMARY KEY,
          resource_type VARCHAR(255) NOT NULL,
          resource_id VARCHAR(255) NOT NULL,
          classification VARCHAR(50) NOT NULL,
          classified_by VARCHAR(255) NOT NULL,
          classified_at TIMESTAMPTZ NOT NULL,
          reviewed_by VARCHAR(255),
          reviewed_at TIMESTAMPTZ,
          justification TEXT,
          auto_classified BOOLEAN DEFAULT FALSE,
          pii_categories JSONB DEFAULT '[]',
          handling_instructions TEXT,
          expires_at TIMESTAMPTZ,
          markings JSONB DEFAULT '[]',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(resource_type, resource_id)
        );

        CREATE INDEX IF NOT EXISTS idx_classified_data_classification ON classified_data(classification);
        CREATE INDEX IF NOT EXISTS idx_classified_data_resource ON classified_data(resource_type, resource_id);
        CREATE INDEX IF NOT EXISTS idx_classified_data_expires_at ON classified_data(expires_at);

        -- Classification-based access control policies
        CREATE TABLE IF NOT EXISTS cbac_policies (
          id VARCHAR(255) PRIMARY KEY,
          classification VARCHAR(50) NOT NULL,
          role VARCHAR(255) NOT NULL,
          can_read BOOLEAN DEFAULT FALSE,
          can_write BOOLEAN DEFAULT FALSE,
          can_delete BOOLEAN DEFAULT FALSE,
          can_export BOOLEAN DEFAULT FALSE,
          can_declassify BOOLEAN DEFAULT FALSE,
          requires_mfa BOOLEAN DEFAULT FALSE,
          requires_justification BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(classification, role)
        );

        CREATE INDEX IF NOT EXISTS idx_cbac_policies_classification ON cbac_policies(classification);
        CREATE INDEX IF NOT EXISTS idx_cbac_policies_role ON cbac_policies(role);

        -- Insert default classification rules
        ${this.getDefaultRulesSQL()}

        -- Insert default CBAC policies
        ${this.getDefaultCBACPoliciesSQL()}
      `);
    } finally {
      client.release();
    }
  }

  /**
   * Get default classification rules SQL
   */
  private getDefaultRulesSQL(): string {
    const rules = [
      {
        id: 'rule-ssn',
        name: 'Social Security Number',
        pattern: '\\b\\d{3}-\\d{2}-\\d{4}\\b',
        classification: DataClassification.RESTRICTED,
        confidence: 0.95,
        piiCategory: PIICategory.SSN,
      },
      {
        id: 'rule-email',
        name: 'Email Address',
        pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
        classification: DataClassification.INTERNAL,
        confidence: 0.8,
        piiCategory: PIICategory.EMAIL,
      },
      {
        id: 'rule-phone',
        name: 'Phone Number',
        pattern: '\\b(?:\\+?1[-.]?)?\\(?\\d{3}\\)?[-.]?\\d{3}[-.]?\\d{4}\\b',
        classification: DataClassification.INTERNAL,
        confidence: 0.8,
        piiCategory: PIICategory.PHONE,
      },
      {
        id: 'rule-credit-card',
        name: 'Credit Card Number',
        pattern: '\\b(?:\\d{4}[-\\s]?){3}\\d{4}\\b',
        classification: DataClassification.HIGHLY_RESTRICTED,
        confidence: 0.9,
        piiCategory: PIICategory.FINANCIAL,
      },
      {
        id: 'rule-secret-marking',
        name: 'SECRET Classification Marking',
        pattern: '\\b(SECRET|CONFIDENTIAL|TOP\\s+SECRET)\\b',
        classification: DataClassification.SECRET,
        confidence: 1.0,
        piiCategory: null,
      },
      {
        id: 'rule-tlp-red',
        name: 'TLP:RED Marking',
        pattern: '\\bTLP:?\\s*RED\\b',
        classification: DataClassification.TLP_RED,
        confidence: 1.0,
        piiCategory: null,
      },
      {
        id: 'rule-tlp-amber',
        name: 'TLP:AMBER Marking',
        pattern: '\\bTLP:?\\s*AMBER(?:\\+STRICT)?\\b',
        classification: DataClassification.TLP_AMBER,
        confidence: 1.0,
        piiCategory: null,
      },
    ];

    return rules
      .map(
        rule => `
        INSERT INTO classification_rules
        (id, name, description, pattern, classification, confidence, pii_category, enabled, priority)
        VALUES (
          '${rule.id}',
          '${rule.name}',
          'Auto-detect ${rule.name}',
          '${rule.pattern}',
          '${rule.classification}',
          ${rule.confidence},
          ${rule.piiCategory ? `'${rule.piiCategory}'` : 'NULL'},
          TRUE,
          ${Math.floor(rule.confidence * 100)}
        )
        ON CONFLICT (id) DO NOTHING;
      `
      )
      .join('\n');
  }

  /**
   * Get default CBAC policies SQL
   */
  private getDefaultCBACPoliciesSQL(): string {
    const policies = [
      // PUBLIC - Everyone can read
      { classification: DataClassification.PUBLIC, role: 'VIEWER', read: true },
      { classification: DataClassification.PUBLIC, role: 'ANALYST', read: true, write: true },
      { classification: DataClassification.PUBLIC, role: 'ADMIN', read: true, write: true, delete: true, export: true },

      // INTERNAL - Authenticated users
      { classification: DataClassification.INTERNAL, role: 'VIEWER', read: true },
      { classification: DataClassification.INTERNAL, role: 'ANALYST', read: true, write: true, export: true },
      { classification: DataClassification.INTERNAL, role: 'ADMIN', read: true, write: true, delete: true, export: true },

      // CONFIDENTIAL - Analysts and above
      { classification: DataClassification.CONFIDENTIAL, role: 'ANALYST', read: true, write: true, requiresMFA: true },
      { classification: DataClassification.CONFIDENTIAL, role: 'ADMIN', read: true, write: true, delete: true, export: true, requiresMFA: true },

      // SECRET - Admin only with MFA
      { classification: DataClassification.SECRET, role: 'ADMIN', read: true, write: true, delete: true, requiresMFA: true, requiresJustification: true },

      // TLP:GREEN - Community sharing
      { classification: DataClassification.TLP_GREEN, role: 'VIEWER', read: true },
      { classification: DataClassification.TLP_GREEN, role: 'ANALYST', read: true, write: true, export: true },
      { classification: DataClassification.TLP_GREEN, role: 'ADMIN', read: true, write: true, delete: true, export: true },

      // TLP:AMBER - Organization only
      { classification: DataClassification.TLP_AMBER, role: 'ANALYST', read: true, requiresMFA: true },
      { classification: DataClassification.TLP_AMBER, role: 'ADMIN', read: true, write: true, export: true, requiresMFA: true },

      // TLP:RED - Named recipients only
      { classification: DataClassification.TLP_RED, role: 'ADMIN', read: true, requiresMFA: true, requiresJustification: true },
    ];

    return policies
      .map(
        p => `
        INSERT INTO cbac_policies
        (id, classification, role, can_read, can_write, can_delete, can_export, can_declassify, requires_mfa, requires_justification)
        VALUES (
          'policy-${p.classification}-${p.role}',
          '${p.classification}',
          '${p.role}',
          ${p.read || false},
          ${p.write || false},
          ${p.delete || false},
          ${p.export || false},
          ${p.delete || false},
          ${p.requiresMFA || false},
          ${p.requiresJustification || false}
        )
        ON CONFLICT (classification, role) DO NOTHING;
      `
      )
      .join('\n');
  }

  /**
   * Suggest classification for content
   */
  async suggestClassification(content: string): Promise<ClassificationSuggestion> {
    const rules = await this.getActiveRules();
    const matches: Array<{ rule: ClassificationRule; matched: boolean }> = [];
    const detectedPII: Set<PIICategory> = new Set();
    const reasons: string[] = [];

    for (const rule of rules) {
      const regex = new RegExp(rule.pattern, 'gi');
      if (regex.test(content)) {
        matches.push({ rule, matched: true });
        reasons.push(`Matched rule: ${rule.name}`);

        if (rule.piiCategory) {
          detectedPII.add(rule.piiCategory);
        }
      }
    }

    // Determine highest classification from matches
    let highestClassification = DataClassification.PUBLIC;
    let highestLevel = 0;
    let totalConfidence = 0;

    for (const { rule } of matches) {
      const level = CLASSIFICATION_HIERARCHY[rule.classification];
      if (level > highestLevel) {
        highestLevel = level;
        highestClassification = rule.classification;
      }
      totalConfidence = Math.max(totalConfidence, rule.confidence);
    }

    return {
      suggestedClassification: highestClassification,
      confidence: matches.length > 0 ? totalConfidence : 0.5,
      reasons,
      detectedPII: Array.from(detectedPII),
      matchedRules: matches.map(m => m.rule.id),
    };
  }

  /**
   * Classify data
   */
  async classifyData(
    resourceType: string,
    resourceId: string,
    classification: DataClassification,
    classifiedBy: string,
    options: {
      justification?: string;
      piiCategories?: PIICategory[];
      autoClassified?: boolean;
      handlingInstructions?: string;
      expiresAt?: Date;
      markings?: string[];
    } = {}
  ): Promise<ClassifiedData> {
    const client = await this.pool.connect();
    try {
      const classified: ClassifiedData = {
        id: `classified-${resourceType}-${resourceId}`,
        resourceType,
        resourceId,
        classification,
        classifiedBy,
        classifiedAt: new Date(),
        justification: options.justification,
        autoClassified: options.autoClassified || false,
        piiCategories: options.piiCategories || [],
        handlingInstructions: options.handlingInstructions || this.getDefaultHandlingInstructions(classification),
        expiresAt: options.expiresAt,
        markings: options.markings,
      };

      await client.query(
        `INSERT INTO classified_data
         (id, resource_type, resource_id, classification, classified_by, classified_at,
          justification, auto_classified, pii_categories, handling_instructions, expires_at, markings)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (resource_type, resource_id) DO UPDATE
         SET classification = $4, classified_by = $5, classified_at = $6,
             justification = $7, auto_classified = $8, pii_categories = $9,
             handling_instructions = $10, expires_at = $11, markings = $12, updated_at = NOW()`,
        [
          classified.id,
          classified.resourceType,
          classified.resourceId,
          classified.classification,
          classified.classifiedBy,
          classified.classifiedAt,
          classified.justification,
          classified.autoClassified,
          JSON.stringify(classified.piiCategories),
          classified.handlingInstructions,
          classified.expiresAt,
          JSON.stringify(classified.markings || []),
        ]
      );

      // Audit log
      if (this.auditLogger) {
        await this.auditLogger.log({
          userId: classifiedBy,
          userName: classifiedBy,
          action: 'data.classified',
          resource: resourceType,
          resourceId,
          outcome: 'success',
          classification,
          details: {
            classification,
            autoClassified: options.autoClassified,
            piiCategories: options.piiCategories,
          },
        });
      }

      return classified;
    } finally {
      client.release();
    }
  }

  /**
   * Check access permission based on classification
   */
  async checkAccess(
    classification: DataClassification,
    userRole: string,
    action: 'read' | 'write' | 'delete' | 'export' | 'declassify'
  ): Promise<{
    allowed: boolean;
    requiresMFA: boolean;
    requiresJustification: boolean;
    reason?: string;
  }> {
    const result = await this.pool.query(
      `SELECT * FROM cbac_policies WHERE classification = $1 AND role = $2`,
      [classification, userRole]
    );

    if (result.rows.length === 0) {
      return {
        allowed: false,
        requiresMFA: false,
        requiresJustification: false,
        reason: 'No policy defined for this classification and role',
      };
    }

    const policy = result.rows[0];
    let allowed = false;

    switch (action) {
      case 'read':
        allowed = policy.can_read;
        break;
      case 'write':
        allowed = policy.can_write;
        break;
      case 'delete':
        allowed = policy.can_delete;
        break;
      case 'export':
        allowed = policy.can_export;
        break;
      case 'declassify':
        allowed = policy.can_declassify;
        break;
    }

    return {
      allowed,
      requiresMFA: policy.requires_mfa,
      requiresJustification: policy.requires_justification,
      reason: allowed ? undefined : `Role ${userRole} does not have ${action} permission for ${classification}`,
    };
  }

  /**
   * Get default handling instructions for a classification
   */
  private getDefaultHandlingInstructions(classification: DataClassification): string {
    const instructions: Record<DataClassification, string> = {
      [DataClassification.PUBLIC]: 'No special handling required',
      [DataClassification.UNCLASSIFIED]: 'For internal use only',
      [DataClassification.INTERNAL]: 'Internal use only. Do not share externally.',
      [DataClassification.CONFIDENTIAL]: 'Confidential. Authorized personnel only. Encrypt when storing or transmitting.',
      [DataClassification.SECRET]: 'SECRET. Top-tier personnel only. Must be encrypted at rest and in transit. MFA required.',
      [DataClassification.TOP_SECRET]: 'TOP SECRET. Highest security clearance required. Maximum security measures apply.',
      [DataClassification.TLP_CLEAR]: TLP_DESCRIPTIONS[DataClassification.TLP_CLEAR].description,
      [DataClassification.TLP_GREEN]: TLP_DESCRIPTIONS[DataClassification.TLP_GREEN].description,
      [DataClassification.TLP_AMBER]: TLP_DESCRIPTIONS[DataClassification.TLP_AMBER].description,
      [DataClassification.TLP_AMBER_STRICT]: TLP_DESCRIPTIONS[DataClassification.TLP_AMBER_STRICT].description,
      [DataClassification.TLP_RED]: TLP_DESCRIPTIONS[DataClassification.TLP_RED].description,
      [DataClassification.RESTRICTED]: 'Restricted access. Need-to-know basis only.',
      [DataClassification.HIGHLY_RESTRICTED]: 'Highly restricted. Maximum access controls enforced.',
    };

    return instructions[classification];
  }

  /**
   * Get active classification rules
   */
  private async getActiveRules(): Promise<ClassificationRule[]> {
    const result = await this.pool.query(
      'SELECT * FROM classification_rules WHERE enabled = TRUE ORDER BY priority DESC'
    );

    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      pattern: row.pattern,
      classification: row.classification,
      confidence: parseFloat(row.confidence),
      piiCategory: row.pii_category,
      enabled: row.enabled,
      priority: row.priority,
    }));
  }

  /**
   * Get classification for a resource
   */
  async getClassification(resourceType: string, resourceId: string): Promise<ClassifiedData | null> {
    const result = await this.pool.query(
      'SELECT * FROM classified_data WHERE resource_type = $1 AND resource_id = $2',
      [resourceType, resourceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      classification: row.classification,
      classifiedBy: row.classified_by,
      classifiedAt: row.classified_at,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      justification: row.justification,
      autoClassified: row.auto_classified,
      piiCategories: row.pii_categories || [],
      handlingInstructions: row.handling_instructions,
      expiresAt: row.expires_at,
      markings: row.markings || [],
    };
  }
}
