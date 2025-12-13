/**
 * Database migration script for labeling service
 * Creates all necessary tables for labels, reviews, queues, adjudications, and audit trails
 */

import { Pool } from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgres://postgres:postgres@localhost:5432/labeling';

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 5,
});

const migrations = [
  // Labels table
  `
  CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('entity', 'relation', 'document', 'image', 'other')),
    label_type TEXT NOT NULL,
    label_value JSONB NOT NULL,
    confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'needs_adjudication', 'adjudicated')),
    metadata JSONB DEFAULT '{}',
    source_evidence TEXT[] DEFAULT ARRAY[]::TEXT[],
    reasoning TEXT,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    queue_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_labels_entity_id ON labels(entity_id);
  CREATE INDEX IF NOT EXISTS idx_labels_status ON labels(status);
  CREATE INDEX IF NOT EXISTS idx_labels_queue_id ON labels(queue_id);
  CREATE INDEX IF NOT EXISTS idx_labels_created_by ON labels(created_by);
  CREATE INDEX IF NOT EXISTS idx_labels_label_type ON labels(label_type);
  CREATE INDEX IF NOT EXISTS idx_labels_created_at ON labels(created_at DESC);
  `,

  // Reviews table
  `
  CREATE TABLE IF NOT EXISTS reviews (
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
  CREATE INDEX IF NOT EXISTS idx_reviews_label_id ON reviews(label_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
  CREATE INDEX IF NOT EXISTS idx_reviews_approved ON reviews(approved);
  CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
  `,

  // Queues table
  `
  CREATE TABLE IF NOT EXISTS queues (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    entity_type TEXT CHECK (entity_type IN ('entity', 'relation', 'document', 'image', 'other')),
    label_type TEXT,
    assigned_to TEXT[] DEFAULT ARRAY[]::TEXT[],
    required_reviews INTEGER NOT NULL DEFAULT 2 CHECK (required_reviews >= 1),
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'completed')) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status);
  CREATE INDEX IF NOT EXISTS idx_queues_created_by ON queues(created_by);
  CREATE INDEX IF NOT EXISTS idx_queues_label_type ON queues(label_type);
  `,

  // Adjudications table
  `
  CREATE TABLE IF NOT EXISTS adjudications (
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
  CREATE INDEX IF NOT EXISTS idx_adjudications_label_id ON adjudications(label_id);
  CREATE INDEX IF NOT EXISTS idx_adjudications_assigned_to ON adjudications(assigned_to);
  CREATE INDEX IF NOT EXISTS idx_adjudications_resolved_by ON adjudications(resolved_by);
  CREATE INDEX IF NOT EXISTS idx_adjudications_resolved_at ON adjudications(resolved_at);
  `,

  // Audit events table
  `
  CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL CHECK (event_type IN (
      'label_created', 'label_reviewed', 'label_approved', 'label_rejected',
      'adjudication_requested', 'adjudication_completed',
      'queue_created', 'queue_assigned', 'policy_check'
    )),
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
  CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_events_label_id ON audit_events(label_id);
  CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC);
  `,

  // Inter-rater agreement cache table
  `
  CREATE TABLE IF NOT EXISTS inter_rater_agreements (
    id SERIAL PRIMARY KEY,
    label_type TEXT NOT NULL,
    entity_type TEXT CHECK (entity_type IN ('entity', 'relation', 'document', 'image', 'other')),
    raters TEXT[] NOT NULL,
    sample_size INTEGER NOT NULL,
    cohens_kappa NUMERIC(5, 4),
    fleiss_kappa NUMERIC(5, 4),
    percent_agreement NUMERIC(5, 4) NOT NULL,
    confusion_matrix JSONB,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
  );
  CREATE INDEX IF NOT EXISTS idx_inter_rater_label_type ON inter_rater_agreements(label_type);
  CREATE INDEX IF NOT EXISTS idx_inter_rater_calculated_at ON inter_rater_agreements(calculated_at DESC);
  `,

  // Decision ledger table (for exports)
  `
  CREATE TABLE IF NOT EXISTS decision_ledger (
    id TEXT PRIMARY KEY,
    label_id TEXT NOT NULL REFERENCES labels(id),
    entity_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('entity', 'relation', 'document', 'image', 'other')),
    final_label JSONB NOT NULL,
    created_by TEXT NOT NULL,
    reviewed_by TEXT[] DEFAULT ARRAY[]::TEXT[],
    adjudicated_by TEXT,
    source_evidence TEXT[] DEFAULT ARRAY[]::TEXT[],
    reasoning TEXT,
    audit_trail TEXT[] NOT NULL, -- Array of audit event IDs
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signature TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_decision_ledger_label_id ON decision_ledger(label_id);
  CREATE INDEX IF NOT EXISTS idx_decision_ledger_entity_id ON decision_ledger(entity_id);
  CREATE INDEX IF NOT EXISTS idx_decision_ledger_timestamp ON decision_ledger(timestamp DESC);
  `,

  // Service keys table (for storing signing keys)
  `
  CREATE TABLE IF NOT EXISTS service_keys (
    id SERIAL PRIMARY KEY,
    key_type TEXT NOT NULL DEFAULT 'ed25519',
    public_key TEXT NOT NULL UNIQUE,
    private_key TEXT NOT NULL, -- Should be encrypted in production
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active BOOLEAN NOT NULL DEFAULT TRUE
  );
  CREATE INDEX IF NOT EXISTS idx_service_keys_active ON service_keys(active);
  `,

  // User roles table (for RBAC)
  `
  CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('labeler', 'reviewer', 'adjudicator', 'admin')),
    granted_by TEXT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role)
  );
  CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
  `,

  // Create updated_at trigger function
  `
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  `,

  // Add trigger to labels table
  `
  DROP TRIGGER IF EXISTS update_labels_updated_at ON labels;
  CREATE TRIGGER update_labels_updated_at
    BEFORE UPDATE ON labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  `,
];

async function runMigrations() {
  console.log('🔧 Starting labeling service migrations...');

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (let i = 0; i < migrations.length; i++) {
      console.log(`  Running migration ${i + 1}/${migrations.length}...`);
      await client.query(migrations[i]);
    }

    await client.query('COMMIT');
    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log('✨ Database ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to run migrations:', error);
      process.exit(1);
    });
}

export { runMigrations };
