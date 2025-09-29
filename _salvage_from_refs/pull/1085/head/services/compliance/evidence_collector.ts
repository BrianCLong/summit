import { Pool } from 'pg';

const pg = new Pool({ connectionString: process.env.DATABASE_URL });

interface Evidence {
  tenant: string;
  action: string;
  subject: string;
  details: Record<string, any>;
}

// This function would write to your immutable audit_log table
// and ensure the event is anchored in the next Merkle root.
export async function createEvidence(evidence: Evidence): Promise<void> {
  console.log('Creating audit evidence:', evidence);
  await pg.query(
    "INSERT INTO audit_log (tenant, action, subject, details) VALUES ($1, $2, $3, $4)",
    [evidence.tenant, evidence.action, evidence.subject, evidence.details]
  );
  console.log('Audit evidence created.');
}
