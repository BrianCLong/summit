import { describe, it, expect, beforeEach } from 'vitest';
import { newDb } from 'pg-mem';
import crypto from 'node:crypto';
import { RevocationDaemon, RevocationCertificate } from '../src/provenance/revocation-daemon';
import { AIProvenanceManager } from '../src/provenance/AIProvenanceManager';

describe('RevocationDaemon', () => {
  let db: any;
  let pool: any;
  let daemon: RevocationDaemon;
  let provenanceManager: AIProvenanceManager;
  let trustedKeys: Map<string, string>;
  let issuerKeyPair: { publicKey: string; privateKey: string };

  beforeEach(async () => {
    // Setup pg-mem
    db = newDb();

    // Create tables
    db.public.none(`
      CREATE TABLE revocation_ledger (
        revoked_hash TEXT PRIMARY KEY,
        reason TEXT,
        revocation_time TIMESTAMP,
        issuer TEXT,
        signature TEXT
      );

      CREATE TABLE provenance_merkle_tree (
        node_hash TEXT PRIMARY KEY,
        parent_hash TEXT,
        content_hash TEXT,
        depth INTEGER,
        created_at TIMESTAMP,
        tainted BOOLEAN DEFAULT FALSE,
        revocation_cert_id TEXT
      );
    `);

    pool = db.adapters.createPg().Pool;

    // Setup keys
    const kp = crypto.generateKeyPairSync('ed25519');
    issuerKeyPair = {
      publicKey: kp.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      privateKey: kp.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    };

    trustedKeys = new Map([['security-team', issuerKeyPair.publicKey]]);

    // Mock ProvenanceManager
    provenanceManager = {} as unknown as AIProvenanceManager;

    // Init daemon
    const pgPool = new pool();
    daemon = new RevocationDaemon(provenanceManager, pgPool, trustedKeys);
  });

  it('should verify signature and issue revocation', async () => {
    const revokedHash = 'hash-123';
    const reason = 'model_poisoning';
    const revocationTime = new Date();
    const issuer = 'security-team';

    const payload = JSON.stringify({
      revokedNodeHash: revokedHash,
      reason,
      revocationTime: revocationTime.toISOString(),
      issuer,
    });

    const signature = crypto.sign(
        null,
        Buffer.from(payload),
        crypto.createPrivateKey(issuerKeyPair.privateKey)
    ).toString('base64');

    const cert: RevocationCertificate = {
      revokedNodeHash: revokedHash,
      reason,
      revocationTime,
      issuer,
      signature
    };

    await daemon.issueRevocation(cert);

    // Verify DB
    const rows = db.public.many(`SELECT * FROM revocation_ledger WHERE revoked_hash = '${revokedHash}'`);
    expect(rows.length).toBe(1);
    expect(rows[0].issuer).toBe(issuer);
  });

  it('should fail with invalid signature', async () => {
    const cert: RevocationCertificate = {
      revokedNodeHash: 'hash-bad',
      reason: 'data_breach',
      revocationTime: new Date(),
      issuer: 'security-team',
      signature: Buffer.from('fake').toString('base64')
    };

    await expect(daemon.issueRevocation(cert)).rejects.toThrow('Invalid signature');
  });

  it('should fail with unknown issuer', async () => {
     const cert: RevocationCertificate = {
      revokedNodeHash: 'hash-bad',
      reason: 'data_breach',
      revocationTime: new Date(),
      issuer: 'unknown-guy',
      signature: Buffer.from('fake').toString('base64')
    };

    await expect(daemon.issueRevocation(cert)).rejects.toThrow('Unknown issuer');
  });

  it('should propagate taint to descendants', async () => {
    const root = 'root';
    const child1 = 'child1';
    const child2 = 'child2';
    const grandchild = 'grandchild';

    db.public.none(`
        INSERT INTO provenance_merkle_tree (node_hash, parent_hash, tainted) VALUES ('${root}', NULL, false);
        INSERT INTO provenance_merkle_tree (node_hash, parent_hash, tainted) VALUES ('${child1}', '${root}', false);
        INSERT INTO provenance_merkle_tree (node_hash, parent_hash, tainted) VALUES ('${child2}', '${root}', false);
        INSERT INTO provenance_merkle_tree (node_hash, parent_hash, tainted) VALUES ('${grandchild}', '${child2}', false);
    `);

    const revocationTime = new Date();
    const payload = JSON.stringify({
      revokedNodeHash: root,
      reason: 'model_poisoning',
      revocationTime: revocationTime.toISOString(),
      issuer: 'security-team',
    });
    const signature = crypto.sign(
        null,
        Buffer.from(payload),
        crypto.createPrivateKey(issuerKeyPair.privateKey)
    ).toString('base64');

    await daemon.issueRevocation({
        revokedNodeHash: root,
        reason: 'model_poisoning',
        revocationTime,
        issuer: 'security-team',
        signature
    });

    const nodes = db.public.many(`SELECT node_hash, tainted FROM provenance_merkle_tree`);
    const lookup = new Map(nodes.map((n: any) => [n.node_hash, n.tainted]));

    expect(lookup.get(child1)).toBe(true);
    expect(lookup.get(child2)).toBe(true);
    expect(lookup.get(grandchild)).toBe(true);
    // Root itself is NOT marked tainted by propagation (it only marks children).
    // This is consistent with implementation.
    expect(lookup.get(root)).toBe(false);
  });
});
