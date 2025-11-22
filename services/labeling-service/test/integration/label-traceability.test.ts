/**
 * Integration test proving label traceability to source evidence
 * Tests the complete workflow: label creation → review → adjudication → audit trail → decision ledger
 */

import { Pool } from 'pg';
import {
  generateKeyPair,
  signData,
  verifySignature,
} from '../../src/utils/crypto.js';

const DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/labeling_test';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
});

describe('Label Traceability Integration Test', () => {
  let servicePrivateKey: string;
  let servicePublicKey: string;

  beforeAll(async () => {
    // Generate service keys for testing
    const keyPair = await generateKeyPair();
    servicePrivateKey = keyPair.privateKey;
    servicePublicKey = keyPair.publicKey;

    // Run migrations (simplified for test)
    try {
      await pool.query('DROP TABLE IF EXISTS decision_ledger CASCADE');
      await pool.query('DROP TABLE IF EXISTS inter_rater_agreements CASCADE');
      await pool.query('DROP TABLE IF EXISTS audit_events CASCADE');
      await pool.query('DROP TABLE IF EXISTS adjudications CASCADE');
      await pool.query('DROP TABLE IF EXISTS reviews CASCADE');
      await pool.query('DROP TABLE IF EXISTS labels CASCADE');
      await pool.query('DROP TABLE IF EXISTS queues CASCADE');
      await pool.query('DROP TABLE IF EXISTS user_roles CASCADE');
      await pool.query('DROP TABLE IF EXISTS service_keys CASCADE');

      // Create tables (simplified schema)
      await pool.query(`
        CREATE TABLE labels (
          id TEXT PRIMARY KEY,
          entity_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          label_type TEXT NOT NULL,
          label_value JSONB NOT NULL,
          confidence NUMERIC(3, 2),
          status TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          source_evidence TEXT[] DEFAULT ARRAY[]::TEXT[],
          reasoning TEXT,
          created_by TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          reviewed_by TEXT,
          reviewed_at TIMESTAMPTZ,
          queue_id TEXT
        );
      `);

      await pool.query(`
        CREATE TABLE reviews (
          id TEXT PRIMARY KEY,
          label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
          reviewer_id TEXT NOT NULL,
          approved BOOLEAN NOT NULL,
          feedback TEXT,
          suggested_value JSONB,
          reasoning TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          signature TEXT,
          public_key TEXT
        );
      `);

      await pool.query(`
        CREATE TABLE adjudications (
          id TEXT PRIMARY KEY,
          label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
          conflicting_reviews TEXT[] NOT NULL,
          reason TEXT NOT NULL,
          assigned_to TEXT,
          resolution JSONB,
          resolution_reasoning TEXT,
          resolved_by TEXT,
          resolved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          signature TEXT,
          public_key TEXT
        );
      `);

      await pool.query(`
        CREATE TABLE audit_events (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          user_id TEXT NOT NULL,
          entity_id TEXT,
          label_id TEXT,
          review_id TEXT,
          adjudication_id TEXT,
          queue_id TEXT,
          before_state JSONB,
          after_state JSONB,
          reasoning TEXT,
          metadata JSONB DEFAULT '{}',
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          signature TEXT NOT NULL,
          signature_algorithm TEXT NOT NULL DEFAULT 'ed25519',
          public_key TEXT
        );
      `);

      await pool.query(`
        CREATE TABLE decision_ledger (
          id TEXT PRIMARY KEY,
          label_id TEXT NOT NULL REFERENCES labels(id),
          entity_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          final_label JSONB NOT NULL,
          created_by TEXT NOT NULL,
          reviewed_by TEXT[] DEFAULT ARRAY[]::TEXT[],
          adjudicated_by TEXT,
          source_evidence TEXT[] DEFAULT ARRAY[]::TEXT[],
          reasoning TEXT,
          audit_trail TEXT[] NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          signature TEXT NOT NULL
        );
      `);
    } catch (error) {
      console.error('Failed to setup test database:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should maintain complete traceability from label creation to decision ledger', async () => {
    const testUserId = 'test-user-1';
    const testEntityId = 'entity-123';
    const testEvidence = ['evidence-1', 'evidence-2', 'evidence-3'];

    // Step 1: Create a label
    const labelId = 'label-test-001';
    const labelData = {
      id: labelId,
      entityId: testEntityId,
      entityType: 'entity',
      labelType: 'sentiment',
      labelValue: { sentiment: 'positive', score: 0.85 },
      confidence: 0.9,
      status: 'pending',
      sourceEvidence: testEvidence,
      reasoning: 'Based on positive language indicators',
      createdBy: testUserId,
      createdAt: new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO labels (
        id, entity_id, entity_type, label_type, label_value,
        confidence, status, source_evidence, reasoning, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        labelData.id,
        labelData.entityId,
        labelData.entityType,
        labelData.labelType,
        JSON.stringify(labelData.labelValue),
        labelData.confidence,
        labelData.status,
        labelData.sourceEvidence,
        labelData.reasoning,
        labelData.createdBy,
        labelData.createdAt,
      ],
    );

    // Create audit event for label creation
    const auditEvent1 = {
      id: 'audit-001',
      eventType: 'label_created',
      userId: testUserId,
      entityId: testEntityId,
      labelId: labelData.id,
      afterState: labelData,
      reasoning: labelData.reasoning,
      timestamp: new Date().toISOString(),
    };
    const audit1Signature = await signData(auditEvent1, servicePrivateKey);

    await pool.query(
      `INSERT INTO audit_events (
        id, event_type, user_id, entity_id, label_id,
        after_state, reasoning, timestamp, signature, signature_algorithm, public_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        auditEvent1.id,
        auditEvent1.eventType,
        auditEvent1.userId,
        auditEvent1.entityId,
        auditEvent1.labelId,
        JSON.stringify(auditEvent1.afterState),
        auditEvent1.reasoning,
        auditEvent1.timestamp,
        audit1Signature,
        'ed25519',
        servicePublicKey,
      ],
    );

    // Step 2: Create reviews (2 approvals, 1 rejection = conflict)
    const reviewers = ['reviewer-1', 'reviewer-2', 'reviewer-3'];
    const reviewApprovals = [true, false, true];
    const reviewIds: string[] = [];

    for (let i = 0; i < reviewers.length; i++) {
      const reviewId = `review-00${i + 1}`;
      reviewIds.push(reviewId);

      const reviewData = {
        id: reviewId,
        labelId: labelData.id,
        reviewerId: reviewers[i],
        approved: reviewApprovals[i],
        reasoning: `Review reasoning ${i + 1}`,
        createdAt: new Date().toISOString(),
      };

      const reviewSignature = await signData(reviewData, servicePrivateKey);

      await pool.query(
        `INSERT INTO reviews (
          id, label_id, reviewer_id, approved, reasoning,
          created_at, signature, public_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          reviewData.id,
          reviewData.labelId,
          reviewData.reviewerId,
          reviewData.approved,
          reviewData.reasoning,
          reviewData.createdAt,
          reviewSignature,
          servicePublicKey,
        ],
      );

      // Create audit event for review
      const auditEvent = {
        id: `audit-review-${i + 1}`,
        eventType: reviewApprovals[i]
          ? 'label_approved'
          : 'label_rejected',
        userId: reviewers[i],
        labelId: labelData.id,
        reviewId: reviewData.id,
        reasoning: reviewData.reasoning,
        timestamp: new Date().toISOString(),
      };
      const auditSignature = await signData(auditEvent, servicePrivateKey);

      await pool.query(
        `INSERT INTO audit_events (
          id, event_type, user_id, label_id, review_id,
          reasoning, timestamp, signature, signature_algorithm, public_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          auditEvent.id,
          auditEvent.eventType,
          auditEvent.userId,
          auditEvent.labelId,
          auditEvent.reviewId,
          auditEvent.reasoning,
          auditEvent.timestamp,
          auditSignature,
          'ed25519',
          servicePublicKey,
        ],
      );
    }

    // Step 3: Create adjudication due to conflicting reviews
    const adjudicationId = 'adj-001';
    const adjudicationData = {
      id: adjudicationId,
      labelId: labelData.id,
      conflictingReviews: reviewIds,
      reason: 'Conflicting reviews detected',
      resolution: { sentiment: 'positive', score: 0.8 },
      resolutionReasoning: 'Majority vote: 2 approvals vs 1 rejection',
      resolvedBy: 'adjudicator-1',
      resolvedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const adjSignature = await signData(adjudicationData, servicePrivateKey);

    await pool.query(
      `INSERT INTO adjudications (
        id, label_id, conflicting_reviews, reason,
        resolution, resolution_reasoning, resolved_by, resolved_at, created_at,
        signature, public_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        adjudicationData.id,
        adjudicationData.labelId,
        adjudicationData.conflictingReviews,
        adjudicationData.reason,
        JSON.stringify(adjudicationData.resolution),
        adjudicationData.resolutionReasoning,
        adjudicationData.resolvedBy,
        adjudicationData.resolvedAt,
        adjudicationData.createdAt,
        adjSignature,
        servicePublicKey,
      ],
    );

    // Update label status
    await pool.query(
      'UPDATE labels SET status = $1, reviewed_by = $2, reviewed_at = $3 WHERE id = $4',
      [
        'adjudicated',
        adjudicationData.resolvedBy,
        adjudicationData.resolvedAt,
        labelData.id,
      ],
    );

    // Create audit event for adjudication
    const auditEventAdj = {
      id: 'audit-adj-001',
      eventType: 'adjudication_completed',
      userId: adjudicationData.resolvedBy,
      labelId: labelData.id,
      adjudicationId: adjudicationData.id,
      afterState: { resolution: adjudicationData.resolution },
      reasoning: adjudicationData.resolutionReasoning,
      timestamp: new Date().toISOString(),
    };
    const auditAdjSignature = await signData(auditEventAdj, servicePrivateKey);

    await pool.query(
      `INSERT INTO audit_events (
        id, event_type, user_id, label_id, adjudication_id,
        after_state, reasoning, timestamp, signature, signature_algorithm, public_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        auditEventAdj.id,
        auditEventAdj.eventType,
        auditEventAdj.userId,
        auditEventAdj.labelId,
        auditEventAdj.adjudicationId,
        JSON.stringify(auditEventAdj.afterState),
        auditEventAdj.reasoning,
        auditEventAdj.timestamp,
        auditAdjSignature,
        'ed25519',
        servicePublicKey,
      ],
    );

    // Step 4: Verify complete audit trail
    const auditTrailResult = await pool.query(
      'SELECT * FROM audit_events WHERE label_id = $1 ORDER BY timestamp ASC',
      [labelData.id],
    );

    expect(auditTrailResult.rows.length).toBeGreaterThanOrEqual(5);

    // Verify each audit event signature
    for (const auditRow of auditTrailResult.rows) {
      const eventData = {
        id: auditRow.id,
        eventType: auditRow.event_type,
        userId: auditRow.user_id,
        entityId: auditRow.entity_id,
        labelId: auditRow.label_id,
        reviewId: auditRow.review_id,
        adjudicationId: auditRow.adjudication_id,
        queueId: auditRow.queue_id,
        beforeState: auditRow.before_state,
        afterState: auditRow.after_state,
        reasoning: auditRow.reasoning,
        metadata: auditRow.metadata,
        timestamp: auditRow.timestamp,
      };

      const isValid = await verifySignature(
        eventData,
        auditRow.signature,
        auditRow.public_key,
      );

      expect(isValid).toBe(true);
    }

    // Step 5: Create decision ledger entry
    const auditTrailIds = auditTrailResult.rows.map((row) => row.id);

    const ledgerEntry = {
      id: labelData.id,
      labelId: labelData.id,
      entityId: labelData.entityId,
      entityType: labelData.entityType,
      finalLabel: adjudicationData.resolution,
      createdBy: labelData.createdBy,
      reviewedBy: reviewers,
      adjudicatedBy: adjudicationData.resolvedBy,
      sourceEvidence: labelData.sourceEvidence,
      reasoning: adjudicationData.resolutionReasoning,
      auditTrail: auditTrailIds,
      timestamp: new Date().toISOString(),
    };

    const ledgerSignature = await signData(ledgerEntry, servicePrivateKey);
    ledgerEntry.signature = ledgerSignature;

    await pool.query(
      `INSERT INTO decision_ledger (
        id, label_id, entity_id, entity_type, final_label,
        created_by, reviewed_by, adjudicated_by, source_evidence,
        reasoning, audit_trail, timestamp, signature
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        ledgerEntry.id,
        ledgerEntry.labelId,
        ledgerEntry.entityId,
        ledgerEntry.entityType,
        JSON.stringify(ledgerEntry.finalLabel),
        ledgerEntry.createdBy,
        ledgerEntry.reviewedBy,
        ledgerEntry.adjudicatedBy,
        ledgerEntry.sourceEvidence,
        ledgerEntry.reasoning,
        ledgerEntry.auditTrail,
        ledgerEntry.timestamp,
        ledgerEntry.signature,
      ],
    );

    // Step 6: Verify traceability
    const ledgerResult = await pool.query(
      'SELECT * FROM decision_ledger WHERE id = $1',
      [labelData.id],
    );

    expect(ledgerResult.rows.length).toBe(1);

    const ledger = ledgerResult.rows[0];

    // Verify source evidence is preserved
    expect(ledger.source_evidence).toEqual(testEvidence);

    // Verify audit trail references
    expect(ledger.audit_trail.length).toBeGreaterThanOrEqual(5);

    // Verify signature
    const ledgerData = {
      id: ledger.id,
      labelId: ledger.label_id,
      entityId: ledger.entity_id,
      entityType: ledger.entity_type,
      finalLabel: ledger.final_label,
      createdBy: ledger.created_by,
      reviewedBy: ledger.reviewed_by,
      adjudicatedBy: ledger.adjudicated_by,
      sourceEvidence: ledger.source_evidence,
      reasoning: ledger.reasoning,
      auditTrail: ledger.audit_trail,
      timestamp: ledger.timestamp,
    };

    const ledgerValid = await verifySignature(
      ledgerData,
      ledger.signature,
      servicePublicKey,
    );

    expect(ledgerValid).toBe(true);

    // Verify complete chain: evidence → label → reviews → adjudication → ledger
    expect(ledger.source_evidence).toEqual(testEvidence);
    expect(ledger.created_by).toBe(testUserId);
    expect(ledger.reviewed_by).toEqual(reviewers);
    expect(ledger.adjudicated_by).toBe('adjudicator-1');
    expect(ledger.final_label).toEqual(adjudicationData.resolution);

    // All audit events should be traceable
    for (const auditId of ledger.audit_trail) {
      const auditResult = await pool.query(
        'SELECT * FROM audit_events WHERE id = $1',
        [auditId],
      );
      expect(auditResult.rows.length).toBe(1);
    }

    console.log('✅ Complete traceability verified:');
    console.log(`   - Label ID: ${labelData.id}`);
    console.log(`   - Source Evidence: ${testEvidence.join(', ')}`);
    console.log(`   - Reviews: ${reviewers.length}`);
    console.log(`   - Adjudication: ${adjudicationId}`);
    console.log(`   - Audit Trail: ${auditTrailIds.length} events`);
    console.log(`   - All signatures verified ✓`);
  });
});
