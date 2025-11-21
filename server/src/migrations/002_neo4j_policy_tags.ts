/**
 * Neo4j Migration: Add Policy Tags to Entities and Relationships
 *
 * This migration adds governance policy tags to all nodes and relationships
 * in the graph database to enable ABAC authorization.
 */

import { Driver, Session } from 'neo4j-driver';
import { logger } from '../utils/logger';

export interface PolicyTags {
  policy_origin: string;
  policy_sensitivity: string;
  policy_legal_basis: string[];
  policy_purpose: string[];
  policy_data_classification: string;
  policy_retention_days: number;
  policy_collection_date: string;
  policy_jurisdiction: string;
  policy_access_count: number;
  policy_pii_flags: {
    has_names: boolean;
    has_emails: boolean;
    has_phones: boolean;
    has_ssn: boolean;
    has_addresses: boolean;
    has_biometric: boolean;
  };
}

const DEFAULT_POLICY_TAGS: PolicyTags = {
  policy_origin: 'existing_data',
  policy_sensitivity: 'internal',
  policy_legal_basis: ['legitimate_interest'],
  policy_purpose: ['investigation', 'threat_intel'],
  policy_data_classification: 'general',
  policy_retention_days: 2555, // 7 years
  policy_collection_date: new Date().toISOString(),
  policy_jurisdiction: 'US',
  policy_access_count: 0,
  policy_pii_flags: {
    has_names: false,
    has_emails: false,
    has_phones: false,
    has_ssn: false,
    has_addresses: false,
    has_biometric: false,
  },
};

/**
 * Apply policy tags to all existing nodes
 */
async function addPolicyTagsToNodes(session: Session): Promise<number> {
  logger.info('Adding policy tags to all nodes...');

  const result = await session.run(
    `
    MATCH (n)
    WHERE NOT EXISTS(n.policy_sensitivity)
    SET n.policy_origin = $policy_origin,
        n.policy_sensitivity = $policy_sensitivity,
        n.policy_legal_basis = $policy_legal_basis,
        n.policy_purpose = $policy_purpose,
        n.policy_data_classification = $policy_data_classification,
        n.policy_retention_days = $policy_retention_days,
        n.policy_collection_date = datetime($policy_collection_date),
        n.policy_jurisdiction = $policy_jurisdiction,
        n.policy_access_count = $policy_access_count,
        n.policy_pii_flags = $policy_pii_flags
    RETURN count(n) as updated
    `,
    DEFAULT_POLICY_TAGS,
  );

  const updated = result.records[0]?.get('updated').toNumber() || 0;
  logger.info(`Updated ${updated} nodes with policy tags`);
  return updated;
}

/**
 * Apply policy tags to all existing relationships
 */
async function addPolicyTagsToRelationships(session: Session): Promise<number> {
  logger.info('Adding policy tags to all relationships...');

  const result = await session.run(
    `
    MATCH ()-[r]->()
    WHERE NOT EXISTS(r.policy_sensitivity)
    SET r.policy_sensitivity = $policy_sensitivity,
        r.policy_legal_basis = $policy_legal_basis,
        r.policy_confidence = 0.5,
        r.policy_provenance = 'existing_data'
    RETURN count(r) as updated
    `,
    {
      policy_sensitivity: 'internal',
      policy_legal_basis: ['legitimate_interest'],
    },
  );

  const updated = result.records[0]?.get('updated').toNumber() || 0;
  logger.info(`Updated ${updated} relationships with policy tags`);
  return updated;
}

/**
 * Create indexes for policy tag queries
 */
async function createPolicyTagIndexes(session: Session): Promise<void> {
  logger.info('Creating indexes for policy tags...');

  const indexes = [
    {
      name: 'entity_policy_sensitivity',
      cypher: 'CREATE INDEX entity_policy_sensitivity IF NOT EXISTS FOR (n:Entity) ON (n.policy_sensitivity)',
    },
    {
      name: 'entity_policy_legal_basis',
      cypher: 'CREATE INDEX entity_policy_legal_basis IF NOT EXISTS FOR (n:Entity) ON (n.policy_legal_basis)',
    },
    {
      name: 'entity_policy_purpose',
      cypher: 'CREATE INDEX entity_policy_purpose IF NOT EXISTS FOR (n:Entity) ON (n.policy_purpose)',
    },
    {
      name: 'entity_policy_jurisdiction',
      cypher: 'CREATE INDEX entity_policy_jurisdiction IF NOT EXISTS FOR (n:Entity) ON (n.policy_jurisdiction)',
    },
    {
      name: 'entity_policy_classification',
      cypher: 'CREATE INDEX entity_policy_classification IF NOT EXISTS FOR (n:Entity) ON (n.policy_data_classification)',
    },
    {
      name: 'entity_policy_expiry',
      cypher: 'CREATE INDEX entity_policy_expiry IF NOT EXISTS FOR (n:Entity) ON (n.policy_expiry_date)',
    },
  ];

  for (const index of indexes) {
    try {
      await session.run(index.cypher);
      logger.info(`Created index: ${index.name}`);
    } catch (error) {
      logger.warn(`Index ${index.name} may already exist: ${error.message}`);
    }
  }
}

/**
 * Detect and flag PII in existing data
 * This is a basic heuristic-based detection; should be enhanced with ML
 */
async function detectAndFlagPII(session: Session): Promise<number> {
  logger.info('Detecting and flagging PII in existing data...');

  const piiPatterns = {
    has_emails: `(?i).*@.*\\..*`,
    has_phones: `(?i).*(\\d{3}[-.]?\\d{3}[-.]?\\d{4}).*`,
    has_ssn: `(?i).*(\\d{3}-\\d{2}-\\d{4}).*`,
  };

  let totalUpdated = 0;

  // Check for emails
  const emailResult = await session.run(
    `
    MATCH (n:Entity)
    WHERE ANY(prop IN keys(n) WHERE n[prop] =~ $pattern)
    AND NOT n.policy_pii_flags.has_emails
    SET n.policy_pii_flags = apoc.map.merge(
      coalesce(n.policy_pii_flags, {}),
      {has_emails: true}
    ),
    n.policy_data_classification = CASE
      WHEN n.policy_data_classification = 'general' THEN 'pii'
      ELSE n.policy_data_classification
    END
    RETURN count(n) as updated
    `,
    { pattern: piiPatterns.has_emails },
  );
  totalUpdated += emailResult.records[0]?.get('updated').toNumber() || 0;

  // Check for phones
  const phoneResult = await session.run(
    `
    MATCH (n:Entity)
    WHERE ANY(prop IN keys(n) WHERE toString(n[prop]) =~ $pattern)
    AND NOT n.policy_pii_flags.has_phones
    SET n.policy_pii_flags = apoc.map.merge(
      coalesce(n.policy_pii_flags, {}),
      {has_phones: true}
    ),
    n.policy_data_classification = CASE
      WHEN n.policy_data_classification = 'general' THEN 'pii'
      ELSE n.policy_data_classification
    END
    RETURN count(n) as updated
    `,
    { pattern: piiPatterns.has_phones },
  );
  totalUpdated += phoneResult.records[0]?.get('updated').toNumber() || 0;

  logger.info(`Flagged PII in ${totalUpdated} entities`);
  return totalUpdated;
}

/**
 * Add policy owner based on entity type
 */
async function assignPolicyOwners(session: Session): Promise<number> {
  logger.info('Assigning policy owners...');

  const result = await session.run(
    `
    MATCH (n)
    WHERE NOT EXISTS(n.policy_owner)
    SET n.policy_owner = CASE
      WHEN n:Investigation THEN 'investigation_team'
      WHEN n:Entity THEN 'analyst_team'
      WHEN n:Evidence THEN 'evidence_custodian'
      ELSE 'system_admin'
    END
    RETURN count(n) as updated
    `,
  );

  const updated = result.records[0]?.get('updated').toNumber() || 0;
  logger.info(`Assigned policy owners to ${updated} nodes`);
  return updated;
}

/**
 * Calculate and set policy expiry dates based on retention policies
 */
async function setPolicyExpiryDates(session: Session): Promise<number> {
  logger.info('Setting policy expiry dates...');

  const result = await session.run(
    `
    MATCH (n)
    WHERE n.policy_retention_days IS NOT NULL
    AND n.policy_collection_date IS NOT NULL
    AND NOT EXISTS(n.policy_expiry_date)
    SET n.policy_expiry_date = datetime(n.policy_collection_date) + duration({days: n.policy_retention_days})
    RETURN count(n) as updated
    `,
  );

  const updated = result.records[0]?.get('updated').toNumber() || 0;
  logger.info(`Set expiry dates for ${updated} nodes`);
  return updated;
}

/**
 * Create constraints for policy tags
 */
async function createPolicyTagConstraints(session: Session): Promise<void> {
  logger.info('Creating constraints for policy tags...');

  const constraints = [
    {
      name: 'valid_sensitivity_levels',
      cypher: `
        CREATE CONSTRAINT valid_sensitivity_levels IF NOT EXISTS
        FOR (n:Entity)
        REQUIRE n.policy_sensitivity IN ['public', 'internal', 'confidential', 'restricted', 'top_secret']
      `,
    },
  ];

  for (const constraint of constraints) {
    try {
      await session.run(constraint.cypher);
      logger.info(`Created constraint: ${constraint.name}`);
    } catch (error) {
      // Constraints may not be supported in all Neo4j versions
      logger.warn(`Could not create constraint ${constraint.name}: ${error.message}`);
    }
  }
}

/**
 * Main migration function
 */
export async function up(driver: Driver): Promise<void> {
  const session = driver.session();

  try {
    logger.info('Starting Neo4j policy tags migration...');

    // 1. Add policy tags to nodes
    const nodesUpdated = await addPolicyTagsToNodes(session);

    // 2. Add policy tags to relationships
    const relsUpdated = await addPolicyTagsToRelationships(session);

    // 3. Create indexes
    await createPolicyTagIndexes(session);

    // 4. Detect and flag PII (optional, requires APOC)
    try {
      const piiUpdated = await detectAndFlagPII(session);
      logger.info(`PII detection completed: ${piiUpdated} entities flagged`);
    } catch (error) {
      logger.warn('PII detection skipped (may require APOC plugin)', { error: error.message });
    }

    // 5. Assign policy owners
    const ownersAssigned = await assignPolicyOwners(session);

    // 6. Set expiry dates
    const expiryDatesSet = await setPolicyExpiryDates(session);

    // 7. Create constraints (optional)
    try {
      await createPolicyTagConstraints(session);
    } catch (error) {
      logger.warn('Constraint creation skipped', { error: error.message });
    }

    logger.info('Neo4j policy tags migration completed successfully', {
      nodesUpdated,
      relsUpdated,
      ownersAssigned,
      expiryDatesSet,
    });
  } catch (error) {
    logger.error('Neo4j policy tags migration failed', { error: error.message });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Rollback migration (remove policy tags)
 */
export async function down(driver: Driver): Promise<void> {
  const session = driver.session();

  try {
    logger.info('Rolling back Neo4j policy tags migration...');

    // Remove policy tag properties from nodes
    await session.run(
      `
      MATCH (n)
      WHERE EXISTS(n.policy_sensitivity)
      REMOVE n.policy_origin,
             n.policy_sensitivity,
             n.policy_legal_basis,
             n.policy_purpose,
             n.policy_data_classification,
             n.policy_retention_days,
             n.policy_collection_date,
             n.policy_expiry_date,
             n.policy_jurisdiction,
             n.policy_access_count,
             n.policy_pii_flags,
             n.policy_owner,
             n.policy_source_warrant,
             n.policy_last_accessed
      RETURN count(n) as removed
      `,
    );

    // Remove policy tag properties from relationships
    await session.run(
      `
      MATCH ()-[r]->()
      WHERE EXISTS(r.policy_sensitivity)
      REMOVE r.policy_sensitivity,
             r.policy_legal_basis,
             r.policy_confidence,
             r.policy_provenance,
             r.policy_source_warrant
      RETURN count(r) as removed
      `,
    );

    // Drop indexes (if needed)
    const indexes = [
      'entity_policy_sensitivity',
      'entity_policy_legal_basis',
      'entity_policy_purpose',
      'entity_policy_jurisdiction',
      'entity_policy_classification',
      'entity_policy_expiry',
    ];

    for (const indexName of indexes) {
      try {
        await session.run(`DROP INDEX ${indexName} IF EXISTS`);
        logger.info(`Dropped index: ${indexName}`);
      } catch (error) {
        logger.warn(`Could not drop index ${indexName}: ${error.message}`);
      }
    }

    logger.info('Neo4j policy tags rollback completed');
  } catch (error) {
    logger.error('Neo4j policy tags rollback failed', { error: error.message });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Check if migration is needed
 */
export async function isMigrationNeeded(driver: Driver): Promise<boolean> {
  const session = driver.session();

  try {
    const result = await session.run(
      `
      MATCH (n)
      WHERE EXISTS(n.policy_sensitivity)
      RETURN count(n) > 0 as migrated
      LIMIT 1
      `,
    );

    const migrated = result.records[0]?.get('migrated') || false;
    return !migrated;
  } finally {
    await session.close();
  }
}
