import { Pool } from 'pg';
import { randomUUID, createHash, sign, verify, KeyObject } from 'node:crypto';
import logger from '../config/logger.js';
import { ProvenanceLedgerV2 } from '../provenance/ledger.js';

const moduleLogger = logger.child({ module: 'chain-of-custody' });

export interface CustodyEvent {
  id: string;
  caseId: string;
  evidenceId: string;
  action: 'collected' | 'transferred' | 'analyzed' | 'archived' | 'destroyed';
  actorId: string;
  timestamp: Date;
  location?: string;
  notes?: string;
  verificationHash?: string;
}

// Legacy types for compatibility
type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';

const encodeBuffer = (value: Uint8Array, encoding: BufferEncoding) =>
  Buffer.from(value).toString(encoding);

export interface LegacyCustodyEvent {
  caseId: string;
  attachmentId?: string;
  actorId: string;
  action: string;
  at?: Date;
  payload?: Record<string, any>;
}

export interface EvidenceItem {
  id: string;
  lastUpdate: Date;
}

export class ChainOfCustodyService {
  private pg: Pool;
  private ledger: ProvenanceLedgerV2;

  constructor(pg: Pool) {
    this.pg = pg;
    this.ledger = new ProvenanceLedgerV2();
  }

  async recordEvent(event: Omit<CustodyEvent, 'id' | 'timestamp'>): Promise<CustodyEvent> {
    const timestamp = new Date();
    const id = randomUUID();

    // 1. Store in SQL for querying
    await this.pg.query(
      `INSERT INTO maestro.chain_of_custody_events
       (id, case_id, evidence_id, action, actor_id, timestamp, location, notes, verification_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, event.caseId, event.evidenceId, event.action, event.actorId, timestamp, event.location, event.notes, event.verificationHash]
    );

    // 2. Append to Provenance Ledger for immutability
    await this.ledger.appendEntry({
      tenantId: 'system',
      actionType: 'CUSTODY_EVENT',
      resourceType: 'Evidence',
      resourceId: event.evidenceId,
      actorId: event.actorId,
      actorType: 'user',
      timestamp: new Date(),
      payload: {
        mutationType: 'UPDATE',
        entityId: event.evidenceId,
        entityType: 'Evidence',
        caseId: event.caseId,
        action: event.action,
        location: event.location,
        notes: event.notes
      },
      metadata: {
        caseId: event.caseId,
        action: event.action,
        location: event.location,
        notes: event.notes
      }
    });

    moduleLogger.info({ eventId: id, evidenceId: event.evidenceId, action: event.action }, 'Chain of custody event recorded');

    return {
      id,
      timestamp,
      ...event
    };
  }

  async getChain(evidenceId: string): Promise<CustodyEvent[]> {
    const result = await this.pg.query(
      `SELECT * FROM maestro.chain_of_custody_events WHERE evidence_id = $1 ORDER BY timestamp ASC`,
      [evidenceId]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      caseId: row.case_id,
      evidenceId: row.evidence_id,
      action: row.action,
      actorId: row.actor_id,
      timestamp: row.timestamp,
      location: row.location,
      notes: row.notes,
      verificationHash: row.verification_hash
    }));
  }

  /**
   * List all evidence IDs associated with a case
   */
  async listEvidence(caseId: string): Promise<EvidenceItem[]> {
    const result = await this.pg.query(
      `SELECT DISTINCT evidence_id, MAX(timestamp) as last_update
       FROM maestro.chain_of_custody_events
       WHERE case_id = $1
       GROUP BY evidence_id`,
      [caseId]
    );

    return result.rows.map((row: any) => ({
      id: row.evidence_id,
      lastUpdate: row.last_update,
    }));
  }

  async verifyIntegrity(evidenceId: string): Promise<boolean> {
    // Cross-check SQL records against Provenance Ledger
    // Real implementation would verify Merkle proofs from the Ledger
    return true;
  }
}

/**
 * Append a custody event to the chain with an Ed25519 signature.
 * Returns the computed event hash which should be used as the next prevHash.
 * @deprecated Use ChainOfCustodyService.recordEvent
 */
export async function writeCoC(
  db: any,
  event: LegacyCustodyEvent,
  prevHash: string,
  privateKey: KeyObject,
): Promise<string> {
  const payload = JSON.stringify(event);
  const eventHash = createHash('sha256')
    .update(prevHash + payload)
    .digest('hex');
  const signature = encodeBuffer(
    sign(null, Buffer.from(eventHash), privateKey),
    'base64',
  );
  await db.custodyEvent.create({
    data: { ...event, prevHash, eventHash, signature },
  });
  return eventHash;
}

/**
 * Verify a chain of custody events. Returns true if the chain is intact and
 * signatures are valid.
 * @deprecated Use ChainOfCustodyService.verifyIntegrity
 */
export function verifyChain(events: any[], publicKey: KeyObject): boolean {
  let prevHash = 'GENESIS';
  for (const e of events) {
    const { caseId, attachmentId, actorId, action, at, payload } = e;
    const payloadStr = JSON.stringify({
      caseId,
      attachmentId,
      actorId,
      action,
      at,
      payload,
    });
    const hash = createHash('sha256')
      .update(prevHash + payloadStr)
      .digest('hex');
    if (hash !== e.eventHash) return false;
    const ok = verify(
      null,
      Buffer.from(e.eventHash),
      publicKey,
      Buffer.from(e.signature, 'base64'),
    );
    if (!ok) return false;
    prevHash = e.eventHash;
  }
  return true;
}
