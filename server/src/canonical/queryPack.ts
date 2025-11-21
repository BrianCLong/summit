/**
 * Canonical Entities - Sample Query Pack
 *
 * Demonstrates time-travel queries and bitemporal analysis
 */

// @ts-ignore - pg type imports
import { Pool } from 'pg';
import {
  snapshotAtTime,
  getEntityHistory,
  getEntitiesInTimeRange,
  temporalDistance,
} from './helpers';
import { CanonicalPerson } from './entities/Person';
import { CanonicalOrganization } from './entities/Organization';
import { CanonicalCase } from './entities/Case';
import { BaseCanonicalEntity } from './types';

/**
 * Query 1: "Show me all people as they were known on January 1, 2024"
 *
 * This demonstrates querying the transaction time dimension.
 */
export async function queryPeopleAsKnownAt(
  pool: Pool,
  tenantId: string,
  knownAt: Date,
): Promise<CanonicalPerson[]> {
  return snapshotAtTime<CanonicalPerson>(
    pool,
    'Person',
    tenantId,
    new Date(), // Current valid time
    knownAt, // What we knew at this point
  );
}

/**
 * Query 2: "Show me who was the CEO of Acme Corp on June 15, 2023"
 *
 * This demonstrates querying the valid time dimension.
 */
export async function queryOrgLeadershipAtTime(
  pool: Pool,
  tenantId: string,
  organizationId: string,
  asOf: Date,
): Promise<any[]> {
  const query = `
    SELECT p.*
    FROM canonical_person p
    INNER JOIN jsonb_array_elements(p.affiliations) aff ON true
    WHERE p.tenant_id = $1
      AND aff->>'organizationId' = $2
      AND (aff->>'role' ILIKE '%CEO%' OR aff->>'role' ILIKE '%Chief Executive%')
      AND p.valid_from <= $3
      AND (p.valid_to IS NULL OR p.valid_to > $3)
      AND (aff->>'from')::timestamptz <= $3
      AND (
        (aff->>'to') IS NULL
        OR (aff->>'to')::timestamptz > $3
      )
      AND p.deleted = false
    ORDER BY p.recorded_at DESC
  `;

  const result = await pool.query(query, [tenantId, organizationId, asOf]);
  return result.rows;
}

/**
 * Query 3: "How has this person's information changed over time?"
 *
 * This shows the complete audit trail of changes.
 */
export async function queryPersonChangeHistory(
  pool: Pool,
  tenantId: string,
  personId: string,
): Promise<
  Array<{
    version: CanonicalPerson;
    changes: string[];
    timeSincePrevious?: { validTimeDays: number; transactionTimeDays: number };
  }>
> {
  const history = await getEntityHistory<CanonicalPerson>(
    pool,
    'Person',
    personId,
    tenantId,
  );

  const result = [];

  for (let i = 0; i < history.length; i++) {
    const current = history[i];
    const previous = i > 0 ? history[i - 1] : null;

    const changes: string[] = [];

    if (previous) {
      // Detect what changed
      for (const key of Object.keys(current)) {
        if (
          key !== 'recordedAt' &&
          key !== 'version' &&
          JSON.stringify((current as any)[key]) !==
            JSON.stringify((previous as any)[key])
        ) {
          changes.push(key);
        }
      }
    }

    result.push({
      version: current,
      changes,
      timeSincePrevious: previous
        ? temporalDistance(previous, current)
        : undefined,
    });
  }

  return result;
}

/**
 * Query 4: "Show me all organizations that existed during 2023"
 *
 * This demonstrates range queries on the valid time dimension.
 */
export async function queryOrganizationsDuringYear(
  pool: Pool,
  tenantId: string,
  year: number,
): Promise<CanonicalOrganization[]> {
  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year + 1, 0, 1);

  return getEntitiesInTimeRange<CanonicalOrganization>(
    pool,
    'Organization',
    tenantId,
    startOfYear,
    endOfYear,
  );
}

/**
 * Query 5: "What did we know about this case on a specific date?"
 *
 * Shows both what the case looked like AND what we knew at that time.
 */
export async function queryCaseAsOfDate(
  pool: Pool,
  tenantId: string,
  caseId: string,
  asOf: Date,
  asKnownAt: Date,
): Promise<{
  case: CanonicalCase | null;
  relatedEntities: any[];
  knowledgeGaps: string[];
}> {
  // Get the case as it was
  const caseSnapshot = await snapshotAtTime<CanonicalCase>(
    pool,
    'Case',
    tenantId,
    asOf,
    asKnownAt,
  );

  const caseEntity = caseSnapshot.find(c => c.id === caseId) || null;

  if (!caseEntity) {
    return {
      case: null,
      relatedEntities: [],
      knowledgeGaps: ['Case did not exist or was not known at this time'],
    };
  }

  // Get related entities as they were known
  const relatedEntityIds = (caseEntity.relatedEntities || [])
    .map(e => e.entityId)
    .filter(Boolean) as string[];

  const relatedEntities = [];
  const knowledgeGaps = [];

  for (const entityId of relatedEntityIds) {
    const entityQuery = `
      SELECT *
      FROM (
        SELECT *, 'Person' as entity_type FROM canonical_person WHERE id = $1
        UNION ALL
        SELECT *, 'Organization' as entity_type FROM canonical_organization WHERE id = $1
      ) entities
      WHERE tenant_id = $2
        AND valid_from <= $3
        AND (valid_to IS NULL OR valid_to > $3)
        AND recorded_at <= $4
        AND deleted = false
      ORDER BY recorded_at DESC
      LIMIT 1
    `;

    const result = await pool.query(entityQuery, [
      entityId,
      tenantId,
      asOf,
      asKnownAt,
    ]);

    if (result.rows.length > 0) {
      relatedEntities.push(result.rows[0]);
    } else {
      knowledgeGaps.push(
        `Entity ${entityId} was referenced but not yet known at ${asKnownAt.toISOString()}`,
      );
    }
  }

  return {
    case: caseEntity,
    relatedEntities,
    knowledgeGaps,
  };
}

/**
 * Query 6: "Find all corrections made to entities"
 *
 * Shows retroactive changes (where recordedAt > validFrom, indicating a late discovery)
 */
export async function queryCorrections(
  pool: Pool,
  tenantId: string,
  entityType: string,
  since?: Date,
): Promise<
  Array<{
    entity: BaseCanonicalEntity;
    correctionLagDays: number;
  }>
> {
  const tableName = `canonical_${entityType.toLowerCase()}`;
  const sinceClause = since ? 'AND recorded_at >= $2' : '';
  const params = since ? [tenantId, since] : [tenantId];

  const query = `
    SELECT *
    FROM ${tableName}
    WHERE tenant_id = $1
      AND recorded_at > valid_from
      ${sinceClause}
      AND deleted = false
    ORDER BY recorded_at DESC
  `;

  const result = await pool.query(query, params);

  return result.rows.map((row: any) => {
    const lagMs = row.recorded_at.getTime() - row.valid_from.getTime();
    const lagDays = lagMs / (1000 * 60 * 60 * 24);

    return {
      entity: row,
      correctionLagDays: lagDays,
    };
  });
}

/**
 * Query 7: "Show entity state evolution over time"
 *
 * Visualize how an entity's state changed across both time dimensions
 */
export async function queryEntityEvolution(
  pool: Pool,
  tenantId: string,
  entityType: string,
  entityId: string,
): Promise<{
  timeline: Array<{
    validFrom: Date;
    validTo: Date | null;
    recordedAt: Date;
    version: number;
    changes: string[];
  }>;
  totalVersions: number;
  totalLifespanDays: number;
  averageVersionDurationDays: number;
}> {
  const history = await getEntityHistory<BaseCanonicalEntity>(
    pool,
    entityType,
    entityId,
    tenantId,
  );

  const timeline = [];

  for (let i = 0; i < history.length; i++) {
    const current = history[i];
    const previous = i > 0 ? history[i - 1] : null;

    const changes: string[] = [];

    if (previous) {
      for (const key of Object.keys(current)) {
        if (
          key !== 'recordedAt' &&
          key !== 'version' &&
          key !== 'modifiedBy' &&
          JSON.stringify((current as any)[key]) !==
            JSON.stringify((previous as any)[key])
        ) {
          changes.push(key);
        }
      }
    }

    timeline.push({
      validFrom: current.validFrom,
      validTo: current.validTo,
      recordedAt: current.recordedAt,
      version: current.version,
      changes,
    });
  }

  const firstVersion = history[0];
  const lastVersion = history[history.length - 1];

  const totalLifespanMs =
    (lastVersion.validTo?.getTime() || Date.now()) -
    firstVersion.validFrom.getTime();
  const totalLifespanDays = totalLifespanMs / (1000 * 60 * 60 * 24);

  const averageVersionDurationDays = totalLifespanDays / history.length;

  return {
    timeline,
    totalVersions: history.length,
    totalLifespanDays,
    averageVersionDurationDays,
  };
}

/**
 * Query 8: "Compare two snapshots in time"
 *
 * What changed between two points in time?
 */
export async function compareSnapshots(
  pool: Pool,
  tenantId: string,
  entityType: string,
  date1: Date,
  date2: Date,
): Promise<{
  added: BaseCanonicalEntity[];
  removed: BaseCanonicalEntity[];
  modified: Array<{
    entity: BaseCanonicalEntity;
    changes: string[];
  }>;
}> {
  const snapshot1 = await snapshotAtTime<BaseCanonicalEntity>(
    pool,
    entityType,
    tenantId,
    date1,
  );

  const snapshot2 = await snapshotAtTime<BaseCanonicalEntity>(
    pool,
    entityType,
    tenantId,
    date2,
  );

  const map1 = new Map(snapshot1.map(e => [e.id, e]));
  const map2 = new Map(snapshot2.map(e => [e.id, e]));

  const added = snapshot2.filter(e => !map1.has(e.id));
  const removed = snapshot1.filter(e => !map2.has(e.id));

  const modified = [];

  for (const entity2 of snapshot2) {
    const entity1 = map1.get(entity2.id);

    if (entity1) {
      const changes: string[] = [];

      for (const key of Object.keys(entity2)) {
        if (
          key !== 'recordedAt' &&
          key !== 'version' &&
          key !== 'modifiedBy' &&
          JSON.stringify((entity2 as any)[key]) !==
            JSON.stringify((entity1 as any)[key])
        ) {
          changes.push(key);
        }
      }

      if (changes.length > 0) {
        modified.push({
          entity: entity2,
          changes,
        });
      }
    }
  }

  return {
    added,
    removed,
    modified,
  };
}

/**
 * Example usage demonstrating all queries
 */
export async function demonstrateTimeTravelQueries(
  pool: Pool,
  tenantId: string,
): Promise<void> {
  console.log('=== Canonical Entities Time-Travel Query Pack ===\n');

  // Query 1: Snapshot as known at a specific date
  console.log('Query 1: People as known on 2024-01-01');
  const knownDate = new Date('2024-01-01');
  const peopleSnapshot = await queryPeopleAsKnownAt(pool, tenantId, knownDate);
  console.log(`Found ${peopleSnapshot.length} people\n`);

  // Query 2: Leadership at a specific point in time
  console.log('Query 2: CEO of organization at specific date');
  const orgId = 'example-org-id';
  const asOfDate = new Date('2023-06-15');
  const leadership = await queryOrgLeadershipAtTime(
    pool,
    tenantId,
    orgId,
    asOfDate,
  );
  console.log(`Found ${leadership.length} matching executives\n`);

  // Query 3: Change history
  console.log('Query 3: Person change history');
  const personId = 'example-person-id';
  const changeHistory = await queryPersonChangeHistory(pool, tenantId, personId);
  console.log(`Found ${changeHistory.length} versions\n`);

  // Query 4: Entities during a time range
  console.log('Query 4: Organizations active during 2023');
  const orgs2023 = await queryOrganizationsDuringYear(pool, tenantId, 2023);
  console.log(`Found ${orgs2023.length} organizations\n`);

  // Query 5: Case snapshot with related entities
  console.log('Query 5: Case as of date with related entities');
  const caseId = 'example-case-id';
  const caseSnapshot = await queryCaseAsOfDate(
    pool,
    tenantId,
    caseId,
    asOfDate,
    knownDate,
  );
  console.log(`Found case with ${caseSnapshot.relatedEntities.length} related entities`);
  console.log(`Knowledge gaps: ${caseSnapshot.knowledgeGaps.length}\n`);

  // Query 6: Find corrections
  console.log('Query 6: Corrections made to Person entities');
  const corrections = await queryCorrections(pool, tenantId, 'Person');
  console.log(`Found ${corrections.length} corrections\n`);

  // Query 7: Entity evolution
  console.log('Query 7: Entity evolution over time');
  const evolution = await queryEntityEvolution(
    pool,
    tenantId,
    'Person',
    personId,
  );
  console.log(`Total versions: ${evolution.totalVersions}`);
  console.log(`Total lifespan: ${evolution.totalLifespanDays.toFixed(2)} days`);
  console.log(
    `Average version duration: ${evolution.averageVersionDurationDays.toFixed(2)} days\n`,
  );

  // Query 8: Compare two snapshots
  console.log('Query 8: Compare snapshots');
  const date1 = new Date('2023-01-01');
  const date2 = new Date('2024-01-01');
  const comparison = await compareSnapshots(pool, tenantId, 'Person', date1, date2);
  console.log(`Added: ${comparison.added.length}`);
  console.log(`Removed: ${comparison.removed.length}`);
  console.log(`Modified: ${comparison.modified.length}\n`);

  console.log('=== Query Pack Complete ===');
}
