"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const pg_mem_1 = require("pg-mem");
const node_crypto_1 = __importDefault(require("node:crypto"));
const revocation_daemon_1 = require("../src/provenance/revocation-daemon");
(0, vitest_1.describe)('RevocationDaemon', () => {
    let db;
    let pool;
    let daemon;
    let provenanceManager;
    let trustedKeys;
    let issuerKeyPair;
    (0, vitest_1.beforeEach)(async () => {
        // Setup pg-mem
        db = (0, pg_mem_1.newDb)();
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
        const kp = node_crypto_1.default.generateKeyPairSync('ed25519');
        issuerKeyPair = {
            publicKey: kp.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
            privateKey: kp.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
        };
        trustedKeys = new Map([['security-team', issuerKeyPair.publicKey]]);
        // Mock ProvenanceManager
        provenanceManager = {};
        // Init daemon
        const pgPool = new pool();
        daemon = new revocation_daemon_1.RevocationDaemon(provenanceManager, pgPool, trustedKeys);
    });
    (0, vitest_1.it)('should verify signature and issue revocation', async () => {
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
        const signature = node_crypto_1.default.sign(null, Buffer.from(payload), node_crypto_1.default.createPrivateKey(issuerKeyPair.privateKey)).toString('base64');
        const cert = {
            revokedNodeHash: revokedHash,
            reason,
            revocationTime,
            issuer,
            signature
        };
        await daemon.issueRevocation(cert);
        // Verify DB
        const rows = db.public.many(`SELECT * FROM revocation_ledger WHERE revoked_hash = '${revokedHash}'`);
        (0, vitest_1.expect)(rows.length).toBe(1);
        (0, vitest_1.expect)(rows[0].issuer).toBe(issuer);
    });
    (0, vitest_1.it)('should fail with invalid signature', async () => {
        const cert = {
            revokedNodeHash: 'hash-bad',
            reason: 'data_breach',
            revocationTime: new Date(),
            issuer: 'security-team',
            signature: Buffer.from('fake').toString('base64')
        };
        await (0, vitest_1.expect)(daemon.issueRevocation(cert)).rejects.toThrow('Invalid signature');
    });
    (0, vitest_1.it)('should fail with unknown issuer', async () => {
        const cert = {
            revokedNodeHash: 'hash-bad',
            reason: 'data_breach',
            revocationTime: new Date(),
            issuer: 'unknown-guy',
            signature: Buffer.from('fake').toString('base64')
        };
        await (0, vitest_1.expect)(daemon.issueRevocation(cert)).rejects.toThrow('Unknown issuer');
    });
    (0, vitest_1.it)('should propagate taint to descendants', async () => {
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
        const signature = node_crypto_1.default.sign(null, Buffer.from(payload), node_crypto_1.default.createPrivateKey(issuerKeyPair.privateKey)).toString('base64');
        await daemon.issueRevocation({
            revokedNodeHash: root,
            reason: 'model_poisoning',
            revocationTime,
            issuer: 'security-team',
            signature
        });
        const nodes = db.public.many(`SELECT node_hash, tainted FROM provenance_merkle_tree`);
        const lookup = new Map(nodes.map((n) => [n.node_hash, n.tainted]));
        (0, vitest_1.expect)(lookup.get(child1)).toBe(true);
        (0, vitest_1.expect)(lookup.get(child2)).toBe(true);
        (0, vitest_1.expect)(lookup.get(grandchild)).toBe(true);
        // Root itself is NOT marked tainted by propagation (it only marks children).
        // This is consistent with implementation.
        (0, vitest_1.expect)(lookup.get(root)).toBe(false);
    });
});
