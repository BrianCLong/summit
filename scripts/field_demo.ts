#!/usr/bin/env node

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID, createHash, createSign, createVerify, generateKeyPairSync } from 'node:crypto';
import { EventEmitter } from 'node:events';

// -----------------------------------------------------------------------------
// Constants & Types
// -----------------------------------------------------------------------------

const VERSION = '1.0.0';
const RUN_ID = `field-demo-${Date.now()}`;
const OUTPUT_DIR = join(process.cwd(), 'dist', 'field-evidence', RUN_ID);

// Logger
const logger = {
  info: (msg: string, ...args: any[]) => console.error(`[INFO] ${msg}`, ...args),
  warn: (msg: string, ...args: any[]) => console.error(`[WARN] ${msg}`, ...args),
  error: (msg: string, ...args: any[]) => console.error(`[ERROR] ${msg}`, ...args),
  json: (obj: any) => console.log(JSON.stringify(obj, null, 2))
};

// Types based on CaseRepo and SyncManager
interface Case {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: 'open' | 'active' | 'closed' | 'archived';
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface JournalEntry {
  id: string;
  op: 'create' | 'update' | 'delete';
  entityType: 'case';
  entityId: string;
  payload: any;
  timestamp: string;
  deviceId: string;
  actorId: string;
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

/**
 * Mock Local Store
 * Simulates an encrypted local store on a device.
 */
class LocalStore {
  public deviceId: string;
  public tenantId: string;
  public actorId: string;
  private cases: Map<string, Case> = new Map();
  private deletedCases: Map<string, Case> = new Map(); // Tombstones for resurrection
  private journal: JournalEntry[] = [];
  private conflictLog: any[] = [];
  private isEncrypted: boolean = true; // Simulation flag

  constructor(deviceId: string, tenantId: string, actorId: string) {
    this.deviceId = deviceId;
    this.tenantId = tenantId;
    this.actorId = actorId;
  }

  ingestPack(pack: any) {
    logger.info(`[${this.deviceId}] Ingesting pack...`);
    // Verify signature (simulated)
    if (!pack.signature) throw new Error("Pack not signed");

    // Ingest objects
    for (const obj of pack.objects) {
      this.cases.set(obj.id, obj);
    }
    logger.info(`[${this.deviceId}] Ingested ${pack.objects.length} objects.`);
  }

  get(id: string): Case | undefined {
    return this.cases.get(id);
  }

  // Simulate offline edit
  update(id: string, updates: Partial<Case>) {
    const existing = this.cases.get(id);
    if (!existing) throw new Error(`Case ${id} not found`);

    const timestamp = new Date().toISOString();
    // Include timestamp in payload so it propagates!
    const fullUpdates = { ...updates, updatedAt: timestamp };
    const updated = { ...existing, ...fullUpdates };
    this.cases.set(id, updated);

    const entry: JournalEntry = {
      id: randomUUID(),
      op: 'update',
      entityType: 'case',
      entityId: id,
      payload: fullUpdates,
      timestamp: timestamp,
      deviceId: this.deviceId,
      actorId: this.actorId
    };
    this.journal.push(entry);
    logger.info(`[${this.deviceId}] Updated case ${id}`);
    return updated;
  }

  // Simulate create
  create(data: Case) {
    this.cases.set(data.id, data);
    const entry: JournalEntry = {
      id: randomUUID(),
      op: 'create',
      entityType: 'case',
      entityId: data.id,
      payload: data,
      timestamp: new Date().toISOString(),
      deviceId: this.deviceId,
      actorId: this.actorId
    };
    this.journal.push(entry);
    logger.info(`[${this.deviceId}] Created case ${data.id}`);
    return data;
  }

  // Simulate delete
  delete(id: string) {
      const obj = this.cases.get(id);
      if (obj) {
          this.deletedCases.set(id, obj);
          this.cases.delete(id);
          const entry: JournalEntry = {
            id: randomUUID(),
            op: 'delete',
            entityType: 'case',
            entityId: id,
            payload: {},
            timestamp: new Date().toISOString(),
            deviceId: this.deviceId,
            actorId: this.actorId
          };
          this.journal.push(entry);
          logger.info(`[${this.deviceId}] Deleted case ${id}`);
      }
  }

  // Merge journal from another device
  merge(entries: JournalEntry[]) {
    logger.info(`[${this.deviceId}] Merging ${entries.length} entries...`);
    let conflicts = 0;

    for (const entry of entries) {
      // Deterministic conflict resolution: Last Write Wins (LWW) based on timestamp
      // In a real CRDT, we'd use vector clocks or similar.
      // Here we simulate checking if we have a conflicting local edit.

      const localEdits = this.journal.filter(j => j.entityId === entry.entityId);
      // Find the latest local edit for this entity
      const localEdit = localEdits.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];

      let isConflict = false;
      let localWins = false;

      if (localEdit) {
          // Conflict if both modified (simplified definition)
          // Resolution: LWW (Last Write Wins) with Actor ID tie-breaker
          if (localEdit.timestamp > entry.timestamp) {
              isConflict = true;
              localWins = true;
          } else if (localEdit.timestamp < entry.timestamp) {
              isConflict = true;
              localWins = false;
          } else {
              // Timestamps equal: Tie breaker
              if (localEdit.actorId > entry.actorId) {
                  isConflict = true;
                  localWins = true;
              } else {
                  isConflict = true;
                  localWins = false;
              }
          }
      }

      if (isConflict && localWins) {
        conflicts++;
        this.conflictLog.push({
          type: 'update_conflict',
          entityId: entry.entityId,
          incoming: entry,
          resolution: 'local_wins' // We keep our version
        });
        logger.info(`[${this.deviceId}] Conflict detected for ${entry.entityId}. Resolution: Local Wins (LWW/TieBreaker).`);
      } else {
        // Apply remote change
        if (entry.op === 'update') {
            const current = this.cases.get(entry.entityId);
            if (current) {
                this.cases.set(entry.entityId, { ...current, ...entry.payload });
            } else {
                // Resurrection check
                const tombstone = this.deletedCases.get(entry.entityId);
                if (tombstone) {
                    this.cases.set(entry.entityId, { ...tombstone, ...entry.payload });
                    this.deletedCases.delete(entry.entityId);
                    logger.info(`[${this.deviceId}] Resurrected case ${entry.entityId} from tombstone.`);
                } else {
                     logger.warn(`[${this.deviceId}] Received update for unknown entity ${entry.entityId}, and no tombstone found. Skipping.`);
                }
            }
        } else if (entry.op === 'create') {
            this.cases.set(entry.entityId, entry.payload);
        } else if (entry.op === 'delete') {
            this.cases.delete(entry.entityId);
        }
      }
    }
    logger.info(`[${this.deviceId}] Merge complete. ${conflicts} conflicts resolved.`);
  }

  getJournal() {
    return this.journal;
  }

  verify() {
    return {
      status: 'PASS',
      encrypted: this.isEncrypted,
      objects: this.cases.size,
      journalEntries: this.journal.length
    };
  }

  dump() {
      return {
          deviceId: this.deviceId,
          objects: Array.from(this.cases.values()),
          journal: this.journal,
          conflictLog: this.conflictLog
      };
  }
}

/**
 * Mock Server / Sync Hub
 */
class SyncHub {
  private store: Map<string, Case> = new Map();
  private journal: JournalEntry[] = [];

  constructor() {
      // Initialize with empty store
  }

  push(deviceId: string, entries: JournalEntry[]) {
      logger.info(`[Server] Received ${entries.length} entries from ${deviceId}`);
      this.journal.push(...entries);
      // Apply to server state
      for (const entry of entries) {
          if (entry.op === 'create') {
              this.store.set(entry.entityId, entry.payload);
          } else if (entry.op === 'update') {
              const current = this.store.get(entry.entityId);
              if (current) {
                  this.store.set(entry.entityId, { ...current, ...entry.payload });
              }
          } else if (entry.op === 'delete') {
              this.store.delete(entry.entityId);
          }
      }
  }

  pull(deviceId: string, since?: string): JournalEntry[] {
      // Return all entries not from this device (simple echo prevention)
      return this.journal.filter(j => j.deviceId !== deviceId);
  }
}

// -----------------------------------------------------------------------------
// Workflow Steps
// -----------------------------------------------------------------------------

async function main() {
  logger.info("Initializing Field Demo...");

  // Setup artifacts dir
  if (existsSync(OUTPUT_DIR)) {
      // We rely on unique RUN_ID, but ensure parents exist
  }

  // Recursive mkdir is safer
  mkdirSync(join(OUTPUT_DIR, 'inputs'), { recursive: true });
  mkdirSync(join(OUTPUT_DIR, 'casepack'), { recursive: true });
  mkdirSync(join(OUTPUT_DIR, 'localstore', 'deviceA'), { recursive: true });
  mkdirSync(join(OUTPUT_DIR, 'localstore', 'deviceB'), { recursive: true });
  mkdirSync(join(OUTPUT_DIR, 'sync', 'session-summaries'), { recursive: true });
  mkdirSync(join(OUTPUT_DIR, 'readiness'), { recursive: true });
  mkdirSync(join(OUTPUT_DIR, 'hashes'), { recursive: true });
  mkdirSync(join(OUTPUT_DIR, 'bundle'), { recursive: true });

  // ---------------------------------------------------------------------------
  // 1. Generate Synthetic Case Data (Deterministic)
  // ---------------------------------------------------------------------------
  logger.info("Step A: Generating synthetic case dataset...");
  const tenantId = 'tenant-1';
  const seedCases: Case[] = Array.from({ length: 5 }).map((_, i) => ({
    id: `case-${i + 1}`,
    tenantId,
    title: `Operation ${['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'][i]}`,
    description: `Field op ${i + 1} description`,
    status: 'open',
    metadata: { priority: 'high', sector: 'sector-7' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  writeFileSync(join(OUTPUT_DIR, 'inputs', 'seed-data.json'), JSON.stringify(seedCases, null, 2));

  // ---------------------------------------------------------------------------
  // 2. Build Case Pack
  // ---------------------------------------------------------------------------
  logger.info("Step B: Building Case Pack...");

  // Sign the pack
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });

  const manifest = {
      version: VERSION,
      created: new Date().toISOString(),
      scope: { tenantId, validUntil: '2026-01-01' },
      objectCount: seedCases.length
  };

  const packContent = JSON.stringify({ manifest, objects: seedCases });
  const signer = createSign('SHA256');
  signer.update(packContent);
  const signature = signer.sign(privateKey, 'hex');

  const casePack = {
      manifest,
      objects: seedCases,
      signature
  };

  writeFileSync(join(OUTPUT_DIR, 'casepack', 'pack.json'), JSON.stringify(casePack, null, 2));

  // ---------------------------------------------------------------------------
  // 3. Verify Pack Offline
  // ---------------------------------------------------------------------------
  logger.info("Step C: Verifying Pack Offline...");
  const verifier = createVerify('SHA256');
  verifier.update(packContent);
  const isVerified = verifier.verify(publicKey, signature, 'hex');

  if (!isVerified) throw new Error("Pack verification failed!");
  logger.info("Pack verified successfully.");

  // ---------------------------------------------------------------------------
  // 4. Init Local Stores & Ingest
  // ---------------------------------------------------------------------------
  logger.info("Step D & E: Init Local Stores & Ingest...");
  const deviceA = new LocalStore('deviceA', tenantId, 'actor-A');
  const deviceB = new LocalStore('deviceB', tenantId, 'actor-B');

  deviceA.ingestPack(casePack);
  deviceB.ingestPack(casePack);

  // ---------------------------------------------------------------------------
  // 5. Offline Edits (Disjoint & Conflicting)
  // ---------------------------------------------------------------------------
  logger.info("Step F: Scripted Offline Edits...");

  // Disjoint edits
  deviceA.update('case-1', { status: 'active', description: 'Started by A' });
  deviceB.update('case-2', { status: 'closed', description: 'Closed by B' });

  // Conflicting edit on Case 3
  // Device A updates title
  deviceA.update('case-3', { title: 'Operation Gamma - Modified by A' });

  // Device B updates title (different value) a bit later (simulated by sequence)
  // In a real scenario time might overlap.
  deviceB.update('case-3', { title: 'Operation Gamma - Modified by B' });

  // Delete vs Update on Case 4
  deviceA.delete('case-4');
  deviceB.update('case-4', { description: 'Updated by B while A deleted it' });

  // ---------------------------------------------------------------------------
  // 6. Sync & Conflict Resolution
  // ---------------------------------------------------------------------------
  logger.info("Step G & H: Sync & Conflict Resolution...");
  const hub = new SyncHub();

  // A pushes to Hub
  hub.push(deviceA.deviceId, deviceA.getJournal());

  // B pushes to Hub
  hub.push(deviceB.deviceId, deviceB.getJournal());

  // A pulls from Hub
  const updatesForA = hub.pull(deviceA.deviceId);
  deviceA.merge(updatesForA);

  // B pulls from Hub
  const updatesForB = hub.pull(deviceB.deviceId);
  deviceB.merge(updatesForB);

  // ---------------------------------------------------------------------------
  // 7. Verification Suite
  // ---------------------------------------------------------------------------
  logger.info("Step I: Verification Suite...");

  const reportA = deviceA.verify();
  const reportB = deviceB.verify();

  writeFileSync(join(OUTPUT_DIR, 'localstore', 'deviceA', 'verify-report.json'), JSON.stringify(reportA, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'localstore', 'deviceB', 'verify-report.json'), JSON.stringify(reportB, null, 2));

  writeFileSync(join(OUTPUT_DIR, 'localstore', 'deviceA', 'journal.json'), JSON.stringify(deviceA.getJournal(), null, 2));
  writeFileSync(join(OUTPUT_DIR, 'localstore', 'deviceB', 'journal.json'), JSON.stringify(deviceB.getJournal(), null, 2));

  writeFileSync(join(OUTPUT_DIR, 'localstore', 'deviceA', 'conflicts.json'), JSON.stringify(deviceA.dump().conflictLog, null, 2));
  writeFileSync(join(OUTPUT_DIR, 'localstore', 'deviceB', 'conflicts.json'), JSON.stringify(deviceB.dump().conflictLog, null, 2));

  // Convergence Check
  const stateA = JSON.stringify(Array.from(deviceA.dump().objects).sort((a: any, b: any) => a.id.localeCompare(b.id)));
  const stateB = JSON.stringify(Array.from(deviceB.dump().objects).sort((a: any, b: any) => a.id.localeCompare(b.id)));

  // Note: Simple LWW might not result in perfect convergence without vector clocks in this simple script,
  // but let's check.
  // Actually, since we simulate "check if we touched it", deviceA will reject B's change to case-3 if A touched it later?
  // Wait, in my merge logic:
  // "return local.timestamp > entry.timestamp; // We are newer"
  // If A updated at T1, B updated at T2 (T2 > T1).
  // A receives B's update (T2). A checks: local T1 > incoming T2? False. A accepts B.
  // B receives A's update (T1). B checks: local T2 > incoming T1? True. B rejects A.
  // Result: Both have B's version. Convergence!

  const converged = stateA === stateB;
  logger.info(`Convergence Check: ${converged ? 'PASS' : 'FAIL'}`);

  if (!converged) {
      logger.warn("States did not converge!");
      logger.warn("State A Hash: " + createHash('sha256').update(stateA).digest('hex'));
      logger.warn("State B Hash: " + createHash('sha256').update(stateB).digest('hex'));
      logger.warn("A: " + stateA);
      logger.warn("B: " + stateB);
  }

  // ---------------------------------------------------------------------------
  // 8. Bundle Generation
  // ---------------------------------------------------------------------------
  logger.info("Step J: Creating Field Evidence Bundle...");

  const readiness = {
      runId: RUN_ID,
      timestamp: new Date().toISOString(),
      packVerified: isVerified,
      storeVerified: reportA.status === 'PASS' && reportB.status === 'PASS',
      converged,
      conflictsRecorded: deviceA.dump().conflictLog.length > 0 || deviceB.dump().conflictLog.length > 0,
      status: (isVerified && converged) ? 'READY' : 'NOT_READY'
  };

  writeFileSync(join(OUTPUT_DIR, 'readiness', 'field-readiness.json'), JSON.stringify(readiness, null, 2));

  // Checksums
  const checksums: Record<string, string> = {};
  // Simple recursive walk would be better, but let's just hash key files
  const filesToHash = [
      join(OUTPUT_DIR, 'readiness', 'field-readiness.json'),
      join(OUTPUT_DIR, 'casepack', 'pack.json'),
      join(OUTPUT_DIR, 'inputs', 'seed-data.json')
  ];

  for(const f of filesToHash) {
      if(existsSync(f)) {
          const content = readFileSync(f);
          const hash = createHash('sha256').update(content).digest('hex');
          checksums[f.replace(OUTPUT_DIR + '/', '')] = hash;
      }
  }
  writeFileSync(join(OUTPUT_DIR, 'hashes', 'checksums.sha256'), JSON.stringify(checksums, null, 2));

  // Tarball
  try {
      const { execSync } = await import('node:child_process');
      // Using relative path to make tarball cleaner
      const cmd = `tar -czf ${join(OUTPUT_DIR, 'bundle', `field-evidence_${RUN_ID}.tar.gz`)} -C ${join(OUTPUT_DIR, '..')} ${RUN_ID}`;
      execSync(cmd);
      logger.info(`Bundle created at ${join(OUTPUT_DIR, 'bundle', `field-evidence_${RUN_ID}.tar.gz`)}`);
  } catch (e) {
      logger.error("Failed to create tarball", e);
  }

  // Output JSON report to stdout
  console.log(JSON.stringify(readiness, null, 2));
}

main().catch(err => {
  logger.error(err.message);
  process.exit(1);
});
