import crypto from 'node:crypto';
import express, { type Request, type Response } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import bodyParser from 'body-parser';
import { Flags } from '../../../../libs/ops/src/flags';
import { metricsMiddleware } from '../../../../libs/ops/src/observe';

export interface Evidence {
  id: string;
  sha256: string;
  contentType: string;
  createdAt: string;
}

export interface Claim {
  id: string;
  evidenceIds: string[];
  transformChain: string[];
  hashRoot: string;
}

export interface LedgerManifest {
  caseId: string;
  evidence: Evidence[];
  claims: Claim[];
  createdAt: string;
}

export class InMemoryLedger {
  private evidence = new Map<string, Evidence>();

  private claims = new Map<string, Claim>();

  addEvidence(input: { sha256: string; contentType: string }): Evidence {
    const sha256 = input.sha256.trim();
    const contentType = input.contentType.trim();
    if (!sha256 || !contentType) {
      throw new Error('sha256 and contentType are required');
    }
    if (!/^[a-fA-F0-9]{64}$/.test(sha256)) {
      throw new Error('sha256 must be a 64 character hex string');
    }
    const id = crypto.randomUUID();
    const evidence: Evidence = { id, sha256, contentType, createdAt: new Date().toISOString() };
    this.evidence.set(id, evidence);
    return evidence;
  }

  addClaim(input: { evidenceIds: string[]; transformChain: string[] }): Claim {
    const evidenceIds = [...new Set(input.evidenceIds)].filter((id) => id && id.trim());
    const transformChain = input.transformChain.map((step) => step.trim()).filter(Boolean);
    if (!evidenceIds.length) {
      throw new Error('At least one evidenceId is required');
    }
    if (transformChain.length === 0) {
      throw new Error('transformChain is required');
    }
    const missing = evidenceIds.filter((id) => !this.evidence.has(id));
    if (missing.length) {
      throw new Error(`Unknown evidence ids: ${missing.join(',')}`);
    }
    const hashRoot = crypto
      .createHash('sha256')
      .update(JSON.stringify({ evidenceIds, transformChain }))
      .digest('hex');
    const claim: Claim = {
      id: crypto.randomUUID(),
      evidenceIds,
      transformChain,
      hashRoot,
    };
    this.claims.set(claim.id, claim);
    return claim;
  }

  manifest(caseId: string): LedgerManifest {
    const id = caseId.trim();
    if (!id) {
      throw new Error('caseId is required');
    }
    return {
      caseId: id,
      evidence: [...this.evidence.values()],
      claims: [...this.claims.values()],
      createdAt: new Date().toISOString(),
    };
  }
}

export interface ProvLedgerApp {
  app: express.Express;
  ledger: InMemoryLedger;
  apollo: ApolloServer;
}

const typeDefs = /* GraphQL */ `
  type ProvEvidence {
    id: ID!
    sha256: String!
    contentType: String!
    createdAt: String!
  }
  type ProvClaim {
    id: ID!
    evidenceIds: [ID!]!
    transformChain: [String!]!
    hashRoot: String!
  }
  type Query {
    prov_manifest(caseId: ID!): String!
  }
  type Mutation {
    prov_addEvidence(sha256: String!, contentType: String!): ProvEvidence!
    prov_addClaim(evidenceIds: [ID!]!, transformChain: [String!]!): ProvClaim!
  }
`;

interface GraphQLContext {
  ledger: InMemoryLedger;
}

const createResolvers = () => ({
  Query: {
    prov_manifest: (_: unknown, args: { caseId: string }, ctx: GraphQLContext) => {
      const manifest = ctx.ledger.manifest(args.caseId);
      return Buffer.from(JSON.stringify(manifest)).toString('base64');
    },
  },
  Mutation: {
    prov_addEvidence: (_: unknown, args: { sha256: string; contentType: string }, ctx: GraphQLContext) =>
      ctx.ledger.addEvidence(args),
    prov_addClaim: (_: unknown, args: { evidenceIds: string[]; transformChain: string[] }, ctx: GraphQLContext) =>
      ctx.ledger.addClaim(args),
  },
});

const toErrorResponse = (error: unknown) =>
  error instanceof Error ? error.message : 'Unexpected error';

export async function buildProvLedgerApp({
  ledger = new InMemoryLedger(),
  serviceName = 'prov-ledger',
}: {
  ledger?: InMemoryLedger;
  serviceName?: string;
} = {}): Promise<ProvLedgerApp> {
  const flagEnabled = process.env.FLAG_PROV_LEDGER === '1' || Flags.provLedger;
  if (!flagEnabled) {
    throw new Error('prov-ledger disabled by feature flag');
  }
  const app = express();
  app.use(bodyParser.json());
  app.use(metricsMiddleware(serviceName));

  app.post('/ledger/evidence', (req: Request, res: Response) => {
    try {
      const evidence = ledger.addEvidence({ sha256: req.body?.sha256 ?? '', contentType: req.body?.contentType ?? '' });
      res.status(201).json(evidence);
    } catch (error) {
      res.status(400).json({ error: toErrorResponse(error) });
    }
  });

  app.get('/ledger/export/:caseId', (req: Request, res: Response) => {
    try {
      const manifest = ledger.manifest(req.params.caseId);
      res.json({ manifest: Buffer.from(JSON.stringify(manifest)).toString('base64'), caseId: manifest.caseId });
    } catch (error) {
      res.status(400).json({ error: toErrorResponse(error) });
    }
  });

  const apollo = new ApolloServer({ typeDefs, resolvers: createResolvers() });
  await apollo.start();
  app.use('/graphql', expressMiddleware(apollo, { context: async () => ({ ledger }) }));

  return { app, ledger, apollo };
}
