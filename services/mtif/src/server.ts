import express from 'express';
import type { Request, Response } from 'express';
import { loadConfig, type MtifConfig } from './config.js';
import { FeedRepository, COLLECTION_DEFAULT_ID } from './services/FeedRepository.js';
import { TaxiiService } from './services/TaxiiService.js';
import { ingestLrtRun } from './adapters/lrt.js';
import { buildBundle } from './services/BundleFactory.js';
import { SigningService } from './utils/signing.js';
import { exportToPpc } from './adapters/ppc.js';
import { exportToRsr } from './adapters/rsr.js';
import type { LrtRun, ObjectQueryOptions, StixBundle, StixObject } from './types.js';

const parseMatchFilters = (query: Request['query']): Record<string, string> | undefined => {
  const match: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    const matchExpr = key.match(/^match\[(.+)]$/);
    if (matchExpr && typeof value === 'string') {
      match[matchExpr[1]] = value;
    }
  }
  return Object.keys(match).length > 0 ? match : undefined;
};

const toQueryOptions = (req: Request): ObjectQueryOptions => {
  const limit = req.query.limit ? Number.parseInt(String(req.query.limit), 10) : undefined;
  const next = req.query.next ? String(req.query.next) : undefined;
  const added_after = req.query.added_after ? String(req.query.added_after) : undefined;
  const match = parseMatchFilters(req.query);
  return { limit, next, added_after, match };
};

const bootstrapRepository = (): FeedRepository =>
  new FeedRepository([
    {
      id: COLLECTION_DEFAULT_ID,
      alias: 'mtif-llm-threats',
      title: 'Model Threat Intelligence Feed',
      description: 'Canonical repository of LLM attack prompts, jailbreaks, and tool abuse signatures.',
      can_read: true,
      can_write: true
    }
  ]);

export const createApp = (configOverride?: Partial<MtifConfig>) => {
  const config = { ...loadConfig(), ...configOverride } satisfies MtifConfig;
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const repository = bootstrapRepository();
  const taxiiService = new TaxiiService(repository, { apiRoot: config.apiRoot });
  const signing = new SigningService(config.signingSecret);

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/taxii2/', (_req, res) => {
    res.json(taxiiService.discoveryDocument());
  });

  app.get('/taxii2/api-root/', (_req, res) => {
    res.json(taxiiService.apiRootInformation());
  });

  app.get('/taxii2/api-root/collections', (_req, res) => {
    res.json({ collections: taxiiService.listCollections() });
  });

  app.get('/taxii2/api-root/collections/:id/objects', (req, res) => {
    try {
      const result = taxiiService.queryObjects(req.params.id, toQueryOptions(req));
      res.json({ ...result });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post('/taxii2/api-root/collections/:id/objects', (req, res) => {
    try {
      const bundle = req.body as StixBundle;
      repository.ingestBundle(req.params.id, bundle);
      res.status(202).json({ status: 'accepted' });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post('/feeds/lrt', (req: Request<unknown, unknown, LrtRun>, res: Response) => {
    try {
      const threats = ingestLrtRun(req.body);
      const bundle = buildBundle(threats, { producerName: 'LLM Red Team Telemetry' });
      repository.ingestBundle(COLLECTION_DEFAULT_ID, bundle);
      res.status(201).json({ bundle_id: bundle.id, object_count: bundle.objects.length });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  const collectAllObjects = () => {
    const aggregated: StixObject[] = [];
    let next: string | undefined;
    do {
      const page = repository.getObjects(COLLECTION_DEFAULT_ID, { limit: 200, next });
      aggregated.push(...page.objects);
      next = page.next;
      if (!page.more) {
        break;
      }
    } while (next);
    return aggregated;
  };

  app.get('/guards/ppc', (_req, res) => {
    const objects = collectAllObjects();
    const update = exportToPpc(objects, signing);
    res.json(update);
  });

  app.get('/guards/rsr', (_req, res) => {
    const objects = collectAllObjects();
    const update = exportToRsr(objects, signing);
    res.json(update);
  });

  return { app, repository, signing, taxiiService };
};

if (process.env.NODE_ENV !== 'test') {
  const config = loadConfig();
  const { app } = createApp(config);
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`MTIF service listening on port ${config.port}`);
  });
}
