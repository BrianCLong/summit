import { EventEmitter } from 'node:events';
import type { Pool } from 'pg';
import { createHash, generateKeyPairSync } from 'node:crypto';
import express, { Router, type RequestHandler } from 'express';
import { graphqlHTTP } from 'express-graphql';
import { buildSchema, GraphQLError } from 'graphql';
import type { EvidenceBundle, LedgerEntry, LedgerFactInput } from 'common-types';
import { createExportManifest, TransparencyLog } from './manifest.js';
import {
  AccessTokenService,
  QuantumSafeLedger,
  type HybridSignature,
  type QuantumLedgerEntry,
  type SchnorrProof,
} from './quantum-safe-ledger.js';

export interface ClaimMessage {
  caseId: string;
  fact: LedgerFactInput;
}

export interface EvidenceMessage {
  caseId: string;
  evidence: EvidenceBundle;
}

export type LedgerMessage = ClaimMessage | EvidenceMessage;

export class InMemoryClaimTopic extends EventEmitter {
  emitClaim(message: LedgerMessage): void {
    this.emit('message', message);
  }

  subscribe(handler: (message: LedgerMessage) => void): void {
    this.on('message', handler);
  }
}

export interface ManifestRecord {
  caseId: string;
  manifest: ReturnType<typeof createExportManifest>;
  createdAt: string;
}

export interface ManifestStore {
  save(manifest: ManifestRecord): Promise<void>;
  latest(caseId: string): Promise<ManifestRecord | null>;
}

export class InMemoryManifestStore implements ManifestStore {
  private readonly manifests = new Map<string, ManifestRecord>();

  async save(manifest: ManifestRecord): Promise<void> {
    this.manifests.set(manifest.caseId, manifest);
  }

  async latest(caseId: string): Promise<ManifestRecord | null> {
    return this.manifests.get(caseId) ?? null;
  }
}

export class PostgresManifestStore implements ManifestStore {
  constructor(private readonly pool: Pool) {}

  async save(record: ManifestRecord): Promise<void> {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS prov_manifests (
        case_id TEXT PRIMARY KEY,
        manifest JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      )`,
    );
    await this.pool.query(
      `INSERT INTO prov_manifests(case_id, manifest, created_at)
       VALUES($1, $2, $3)
       ON CONFLICT (case_id) DO UPDATE SET manifest = excluded.manifest, created_at = excluded.created_at`,
      [record.caseId, record.manifest, record.createdAt],
    );
  }

  async latest(caseId: string): Promise<ManifestRecord | null> {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS prov_manifests (
        case_id TEXT PRIMARY KEY,
        manifest JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL
      )`,
    );
    const result = await this.pool.query(
      'SELECT case_id, manifest, created_at FROM prov_manifests WHERE case_id = $1 LIMIT 1',
      [caseId],
    );
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return { caseId: row.case_id, manifest: row.manifest, createdAt: row.created_at };
  }
}

export interface LedgerServiceOptions {
  manifestStore?: ManifestStore;
  claimTopic?: InMemoryClaimTopic;
  tokenSecret?: string;
  identityPublicKey?: bigint;
  now?: () => Date;
  issuerPrivateKey?: string;
  issuerPublicKey?: string;
  issuerKeyId?: string;
  issuer?: string;
  transparencyLog?: TransparencyLog;
}

export class LedgerService {
  private readonly ledgers = new Map<string, QuantumSafeLedger>();
  private readonly manifestStore: ManifestStore;
  private readonly topic: InMemoryClaimTopic;
  private readonly tokenService: AccessTokenService;
  private readonly now: () => Date;
  private readonly identityPublicKey?: bigint;
  private readonly manifestSigner: {
    issuer: string;
    keyId: string;
    privateKey: string;
    publicKey: string;
  };
  private readonly transparencyLog: TransparencyLog;

  constructor(options: LedgerServiceOptions = {}) {
    this.manifestStore = options.manifestStore ?? new InMemoryManifestStore();
    this.topic = options.claimTopic ?? new InMemoryClaimTopic();
    this.now = options.now ?? (() => new Date());
    this.tokenService = new AccessTokenService(options.tokenSecret ?? 'prov-ledger-secret', {
      ttlMs: 5 * 60 * 1000,
      now: this.now,
    });
    this.identityPublicKey = options.identityPublicKey;
    const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const defaultPrivateKey = keyPair.privateKey
      .export({ format: 'pem', type: 'pkcs1' })
      .toString();
    const defaultPublicKey = keyPair.publicKey
      .export({ format: 'pem', type: 'pkcs1' })
      .toString();
    this.manifestSigner = {
      issuer: options.issuer ?? 'prov-ledger',
      keyId: options.issuerKeyId ?? 'issuer-key',
      privateKey: options.issuerPrivateKey ?? defaultPrivateKey,
      publicKey: options.issuerPublicKey ?? defaultPublicKey,
    };
    this.transparencyLog = options.transparencyLog ?? new TransparencyLog(this.now);
  }

  issueAccess(actor: string, scope: string): string {
    return this.tokenService.issue(actor, scope).token;
  }

  private ledger(caseId: string): QuantumSafeLedger {
    const existing = this.ledgers.get(caseId);
    if (existing) return existing;
    const ledger = new QuantumSafeLedger(this.tokenService, {
      now: this.now,
      identityPublicKey: this.identityPublicKey,
    });
    this.ledgers.set(caseId, ledger);
    return ledger;
  }

  appendClaim(
    caseId: string,
    fact: LedgerFactInput,
    signature: HybridSignature,
    accessToken: string,
    zkProof?: SchnorrProof,
  ): QuantumLedgerEntry {
    const ledger = this.ledger(caseId);
    const entry = ledger.append(fact, signature, accessToken, zkProof);
    this.topic.emitClaim({ caseId, fact });
    return entry;
  }

  registerEvidence(caseId: string, evidence: EvidenceBundle): EvidenceBundle {
    const hash = createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
    const stamped: EvidenceBundle = { ...evidence, headHash: evidence.headHash ?? hash };
    return stamped;
  }

  exportManifest(caseId: string): ManifestRecord {
    const ledger = this.ledger(caseId);
    const manifest = createExportManifest({
      caseId,
      ledger: ledger.list(500),
      issuer: this.manifestSigner.issuer,
      keyId: this.manifestSigner.keyId,
      privateKey: this.manifestSigner.privateKey,
      publicKey: this.manifestSigner.publicKey,
      transparencyLog: this.transparencyLog,
      now: this.now,
    });
    const record: ManifestRecord = {
      caseId,
      manifest,
      createdAt: this.now().toISOString(),
    };
    void this.manifestStore.save(record);
    return record;
  }

  async latestManifest(caseId: string): Promise<ManifestRecord | null> {
    return this.manifestStore.latest(caseId);
  }

  listEntries(caseId: string, limit = 200): QuantumLedgerEntry[] {
    const ledger = this.ledger(caseId);
    return ledger.list(limit);
  }
}

export function buildLedgerRouter(service: LedgerService): Router {
  const router = Router();

  const jsonHandler: RequestHandler = express.json();
  router.use(jsonHandler);

  router.post('/ledger/claim', ((req, res) => {
    const { caseId, fact, signature, accessToken, zkProof } = req.body ?? {};
    if (!caseId || !fact || !signature || !accessToken) {
      return res.status(400).json({ error: 'caseId, fact, signature, and accessToken are required' });
    }
    try {
      const entry = service.appendClaim(caseId, fact, signature, accessToken, zkProof);
      return res.status(201).json({ entry });
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }
  }) as RequestHandler);

  router.post('/ledger/evidence', ((req, res) => {
    const { caseId, evidence } = req.body ?? {};
    if (!caseId || !evidence) {
      return res.status(400).json({ error: 'caseId and evidence are required' });
    }
    const bundle = service.registerEvidence(caseId, evidence);
    return res.status(201).json({ bundle });
  }) as RequestHandler);

  router.get('/ledger/export/:caseId', ((req, res) => {
    const caseId = req.params.caseId;
    const record = service.exportManifest(caseId);
    return res.json(record);
  }) as RequestHandler);

  const schema = buildSchema(`
    type ProvEntry {
      id: String!
      category: String!
      actor: String!
      action: String!
      resource: String!
      payload: String!
      timestamp: String!
      previousHash: String
      hash: String!
    }

    type ProvManifest {
      caseId: String!
      generatedAt: String!
      version: String!
      ledgerHead: String!
      merkleRoot: String!
      transforms: [ProvTransform!]!
    }

    type ProvTransform {
      id: String!
      category: String!
      actor: String!
      action: String!
      resource: String!
      payloadHash: String!
      timestamp: String!
      previousHash: String
    }

    type Query {
      prov_entries(caseId: String!, limit: Int): [ProvEntry!]!
      prov_manifest(caseId: String!): ProvManifest
    }
  `);

  const root = {
    prov_entries: ({ caseId, limit }: { caseId: string; limit?: number }) => {
      const entries = service.listEntries(caseId, limit ?? 200);
      return entries.map((entry: LedgerEntry) => ({
        ...entry,
        payload: JSON.stringify(entry.payload),
      }));
    },
    prov_manifest: async ({ caseId }: { caseId: string }) => {
      const latest = await service.latestManifest(caseId);
      if (latest) return latest.manifest;
      const record = service.exportManifest(caseId);
      return record.manifest;
    },
  };

  router.use(
    '/graphql',
    graphqlHTTP({
      schema,
      rootValue: root,
      graphiql: false,
      customFormatErrorFn: (err) => new GraphQLError(err.message),
    }),
  );

  return router;
}
