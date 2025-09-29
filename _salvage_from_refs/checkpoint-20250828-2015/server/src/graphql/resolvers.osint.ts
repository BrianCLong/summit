import { OsintPgRepo } from '../osint/db/pgRepo';
import { OsintSourcesRepo } from '../osint/db/sourcesRepo';
import { osintQueue } from '../osint/etl/worker';
import { pubsub } from './subscriptions';
import { OsintExporter } from '../osint/export/exporter';
import { assertExportAllowed as assertExportPolicy } from '../osint/policy';
import { OsintHealthRepo } from '../osint/db/health';
import { evaluateOPA } from '../osint/opa';
import caseResolvers from '../cases/resolvers';

const pg = new OsintPgRepo();
const sourcesRepo = new OsintSourcesRepo();
const exporter = new OsintExporter();
const healthRepo = new OsintHealthRepo();

export const osintResolvers = {
  Query: {
    osintSources: async (_:any, args:any, ctx:any) => {
      // ABAC: require read scope
      if (!ctx.user?.scopes?.includes('intelgraph.osint.read')) throw new Error('forbidden');
      // OPA purpose guard
      const decision = await evaluateOPA('osint.query', { user: ctx.user, purpose: ctx.purpose || 'investigation', op: 'osintSources', args });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      return sourcesRepo.list(args || {});
    },
    osintItems: async (_: any, args: any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.osint.read')) throw new Error('forbidden');
      const decision = await evaluateOPA('osint.query', { user: ctx.user, purpose: ctx.purpose || 'investigation', op: 'osintItems', args });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const rows = await pg.searchItems({ ...args, sort: args?.sort || 'DATE' });
      return rows.map((r:any)=>({
        id: r.hash,
        hash: r.hash,
        title: r.title,
        url: r.url,
        summary: r.summary,
        language: r.language,
        publishedAt: r.published_at,
        license: r.license || { id: 'unknown' },
        policy: { tags: ['osint'] },
        provenance: [],
        entities: [],
        claims: [],
      }));
    },
    osintHealth: async (_:any, { sourceId }: any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.osint.read')) throw new Error('forbidden');
      const decision = await evaluateOPA('osint.query', { user: ctx.user, purpose: ctx.purpose || 'investigation', op: 'osintHealth', args: { sourceId } });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      return healthRepo.health(sourceId);
    },
    erSuggestions: async (_:any, { filter, limit = 50 }: any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.osint.read')) throw new Error('forbidden');
      const decision = await evaluateOPA('osint.query', { user: ctx.user, purpose: ctx.purpose || 'investigation', op: 'erSuggestions', args: { filter, limit } });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const { getPostgresPool } = await import('../config/database');
      const pool = getPostgresPool();
      const where: string[] = [];
      const params: any[] = [];
      if (filter?.status) where.push(`status = $${params.push(filter.status)}`);
      if (filter?.minConfidence) where.push(`confidence >= $${params.push(filter.minConfidence)}`);
      const sql = `SELECT id, left_id, right_id, confidence, rationale, status, created_at FROM er_suggestions` + (where.length?` WHERE ${where.join(' AND ')}`:'') + ` ORDER BY created_at DESC LIMIT $${params.push(limit)}`;
      const { rows } = await pool.query(sql, params);
      return rows.map((r:any)=> ({ id: r.id, leftId: r.left_id, rightId: r.right_id, confidence: Number(r.confidence), rationale: r.rationale, status: r.status, createdAt: r.created_at }));
    },
    myWatchlists: async (_:any, _args:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.osint.read')) throw new Error('forbidden');
      const decision = await evaluateOPA('osint.query', { user: ctx.user, purpose: ctx.purpose || 'investigation', op: 'myWatchlists' });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const { getPostgresPool } = await import('../config/database');
      const pool = getPostgresPool();
      const { rows } = await pool.query(`SELECT id, name, owner_id, rules, created_at, updated_at FROM watchlists WHERE owner_id = $1 ORDER BY created_at DESC`, [ctx.user?.id || '']);
      return rows.map((r:any)=> ({ id:r.id, name:r.name, ownerId:r.owner_id, rules:r.rules, createdAt:r.created_at, updatedAt:r.updated_at }));
    },
    alerts: async (_:any, { watchlistId, status, after, limit = 50 }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.osint.read')) throw new Error('forbidden');
      const decision = await evaluateOPA('osint.query', { user: ctx.user, purpose: ctx.purpose || 'investigation', op: 'alerts', args: { watchlistId, status, after, limit } });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const { getPostgresPool } = await import('../config/database');
      const pool = getPostgresPool();
      const where: string[] = [];
      const params: any[] = [];
      if (watchlistId) where.push(`watchlist_id = $${params.push(watchlistId)}`);
      if (status) where.push(`status = $${params.push(status)}`);
      if (after) where.push(`created_at < $${params.push(after)}`);
      const sql = `SELECT id, watchlist_id, entity_hash, doc_hash, rule_id, status, created_at FROM alerts` + (where.length?` WHERE ${where.join(' AND ')}`:'') + ` ORDER BY created_at DESC LIMIT $${params.push(limit)}`;
      const { rows } = await pool.query(sql, params);
      return rows.map((r:any)=> ({ id:r.id, watchlistId:r.watchlist_id, entityHash:r.entity_hash, docHash:r.doc_hash, ruleId:r.rule_id, status:r.status, createdAt:r.created_at }));
    },
    osintRuns: async (_:any, { sourceId, limit = 10 }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.osint.read')) throw new Error('forbidden');
      const { getPostgresPool } = await import('../config/database');
      const pool = getPostgresPool();
      const { rows } = await pool.query(`SELECT started_at, finished_at, status, items_ingested, latency_ms, error FROM osint_runs WHERE source_id=$1 ORDER BY started_at DESC LIMIT $2`, [sourceId, limit]);
      return rows.map((r:any)=> ({ startedAt: r.started_at, finishedAt: r.finished_at, status: r.status, itemsIngested: Number(r.items_ingested||0), latencyMs: Number(r.latency_ms||0), error: r.error || null }));
    },
    mergeLineage: async (_:any, { canonicalId }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.osint.read')) throw new Error('forbidden');
      const { runCypher } = await import('../graph/neo4j');
      const rows = await runCypher(`MATCH (c:Entity {id:$id})-[:MERGED_FROM*]->(m:Entity) RETURN m.id AS id`, { id: canonicalId });
      return rows.map((r:any)=> r.id);
    },
    // case queries
    cases: (p:any,a:any,c:any,i:any)=> (caseResolvers.Query as any).cases(p,a,c,i),
    case: (p:any,a:any,c:any,i:any)=> (caseResolvers.Query as any).case(p,a,c,i),
    caseItems: (p:any,a:any,c:any,i:any)=> (caseResolvers.Query as any).caseItems(p,a,c,i),
    caseTimeline: (p:any,a:any,c:any,i:any)=> (caseResolvers.Query as any).caseTimeline(p,a,c,i),
  },
  Mutation: {
    createOsintSource: async (_: any, { input }: any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.osint.manage')) throw new Error('forbidden');
      const row = await sourcesRepo.create({
        name: input.name,
        kind: input.kind,
        url: input.url,
        licenseId: input.licenseId,
        rateLimitPerMin: input.rateLimitPerMin,
        tags: input.tags,
      });
      pubsub.publish('OSINT_EVT', { kind: 'SOURCE_CREATED', sourceId: row.id, message: row.name });
      return {
        id: row.id,
        name: row.name,
        kind: row.kind,
        url: row.url,
        license: { id: row.license_id },
        rateLimitPerMin: row.rate_limit_per_min,
        enabled: row.enabled,
        lastRunAt: row.last_run_at,
        tags: row.tags || [],
      };
    },
    scheduleFetch: async (_: any, { sourceId }: any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.osint.manage')) throw new Error('forbidden');
      const src = await sourcesRepo.get(sourceId);
      if (!src) throw new Error('source not found');
      const payload = {
        id: src.id,
        kind: src.kind,
        url: src.url,
        licenseRule: { allowIngest: true, allowExport: false },
        rateLimitPerMin: src.rate_limit_per_min,
      };
      await osintQueue.add('fetch', { source: payload });
      const task = { id: 't:' + Date.now(), sourceId: payload.id, status: 'QUEUED', scheduledAt: new Date(), createdBy: 'me' } as any;
      pubsub.publish('OSINT_EVT', { kind: 'TASK_QUEUED', sourceId: payload.id, taskId: task.id, message: 'Fetch queued' });
      return task;
    },
    exportOsintBundle: async (_:any, { ids, format }: any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.osint.export')) throw new Error('forbidden');
      const decision = await evaluateOPA('osint.query', { user: ctx.user, purpose: ctx.purpose || 'investigation', op: 'exportOsintBundle', args: { ids, format } });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const { id, expiresAt } = await exporter.export(ids, String(format));
      // Signed URL
      const ts = Date.now();
      const params = new URLSearchParams({ id, ts: String(ts) });
      const sig = await (await import('../routes/export'));
      const secret = process.env.EXPORT_SIGNING_SECRET || 'dev-secret';
      const crypto = await import('crypto');
      const base = `id=${id}&ts=${ts}`;
      const h = crypto.createHmac('sha256', secret).update(base).digest('hex');
      return { id, url: `/api/export/osint/${encodeURIComponent(id)}?ts=${ts}&sig=${h}`, expiresAt } as any;
    },
    reprocessOsintItem: async () => { throw new Error('Not implemented'); },
    // cases mutations
    createCase: (p:any,a:any,c:any,i:any)=> (caseResolvers.Mutation as any).createCase(p,a,c,i),
    updateCase: (p:any,a:any,c:any,i:any)=> (caseResolvers.Mutation as any).updateCase(p,a,c,i),
    addCaseItem: (p:any,a:any,c:any,i:any)=> (caseResolvers.Mutation as any).addCaseItem(p,a,c,i),
    addCaseNote: (p:any,a:any,c:any,i:any)=> (caseResolvers.Mutation as any).addCaseNote(p,a,c,i),
    closeCase: (p:any,a:any,c:any,i:any)=> (caseResolvers.Mutation as any).closeCase(p,a,c,i),
    exportCaseBundle: (p:any,a:any,c:any,i:any)=> (caseResolvers.Mutation as any).exportCaseBundle(p,a,c,i),
  },
  Subscription: {
    osintIngestEvents: {
      subscribe: () => (pubsub as any).asyncIterator(['OSINT_EVT']),
      resolve: (ev: any) => ev.payload || ev,
    },
    acceptErSuggestion: async (_:any, { id }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.er.manage')) throw new Error('forbidden');
      const decision = await evaluateOPA('osint.query', { user: ctx.user, purpose: ctx.purpose || 'investigation', op: 'acceptErSuggestion', args: { id } });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const { getPostgresPool } = await import('../config/database');
      const pool = getPostgresPool();
      const { rows } = await pool.query(`UPDATE er_suggestions SET status='ACCEPTED' WHERE id=$1 RETURNING left_id, right_id`, [id]);
      const left = rows[0]?.left_id; const right = rows[0]?.right_id;
      if (left && right) {
        const { runCypher } = await import('../graph/neo4j');
        // Merge in Neo4j: prefer left as canonical; rewire edges; add :MERGED_FROM
        const cy = `
          MATCH (l:Entity {id:$left}), (r:Entity {id:$right})
          FOREACH (_ IN CASE WHEN r IS NULL OR l IS NULL THEN [] ELSE [1] END |
            // Rewire incoming/outgoing of r to l
            CALL {
              WITH l,r
              MATCH (a)-[rel]->(r) MERGE (a)-[nr:RELATIONSHIP {type: rel.type}]->(l) SET nr += rel.props
              RETURN 0
            }
            CALL {
              WITH l,r
              MATCH (r)-[rel]->(b) MERGE (l)-[nr:RELATIONSHIP {type: rel.type}]->(b) SET nr += rel.props
              RETURN 0
            }
            MERGE (l)-[:MERGED_FROM]->(r)
          )`;
        await runCypher(cy, { left, right });
        const { ProvLedgerRepo } = await import('../osint/db/ledger');
        const ledger = new ProvLedgerRepo();
        await ledger.append(String(left), 'er.merge', { left, right, suggestionId: id }, ctx.user?.id || null);
      }
      return true;
    },
    rejectErSuggestion: async (_:any, { id }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.er.manage')) throw new Error('forbidden');
      const decision = await evaluateOPA('osint.query', { user: ctx.user, purpose: ctx.purpose || 'investigation', op: 'rejectErSuggestion', args: { id } });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const { getPostgresPool } = await import('../config/database');
      const pool = getPostgresPool();
      await pool.query(`UPDATE er_suggestions SET status='REJECTED' WHERE id=$1`, [id]);
      return true;
    },
    createWatchlist: async (_:any, { name, rules }: any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.watchlists.manage')) throw new Error('forbidden');
      const decision = await evaluateOPA('osint.query', { user: ctx.user, purpose: ctx.purpose || 'investigation', op: 'createWatchlist', args: { name } });
      if (!decision.allow) throw new Error(decision.reason || 'purpose_denied');
      const { getPostgresPool } = await import('../config/database');
      const pool = getPostgresPool();
      const { rows } = await pool.query(`INSERT INTO watchlists(name, owner_id, rules) VALUES($1,$2,$3) RETURNING id, name, owner_id, rules, created_at, updated_at`, [name, ctx.user?.id || null, rules || []]);
      const w = rows[0];
      return { id:w.id, name:w.name, ownerId:w.owner_id, rules:w.rules, createdAt:w.created_at, updatedAt:w.updated_at };
    },
    addWatchlistMember: async (_:any, { watchlistId, userId, role }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.watchlists.manage')) throw new Error('forbidden');
      const { getPostgresPool } = await import('../config/database');
      const pool = getPostgresPool();
      await pool.query(`INSERT INTO watchlist_members(watchlist_id, user_id, role) VALUES($1,$2,$3) ON CONFLICT (watchlist_id,user_id) DO UPDATE SET role=EXCLUDED.role`, [watchlistId, userId, role || 'VIEWER']);
      return true;
    },
    ackAlert: async (_:any, { id }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.alerts.read')) throw new Error('forbidden');
      const { getPostgresPool } = await import('../config/database');
      const pool = getPostgresPool();
      await pool.query(`UPDATE alerts SET status='ACKED' WHERE id=$1`, [id]);
      return true;
    },
  },
};

export default osintResolvers;
    undoMerge: async (_:any, { canonicalId, last = true }:any, ctx:any) => {
      if (!ctx.user?.scopes?.includes('intelgraph.er.manage')) throw new Error('forbidden');
      const { runCypher } = await import('../graph/neo4j');
      if (last) {
        await runCypher(`MATCH (c:Entity {id:$id})- [r:MERGED_FROM] -> (m:Entity) WITH r ORDER BY id(r) DESC LIMIT 1 DELETE r`, { id: canonicalId });
        return true;
      }
      await runCypher(`MATCH (c:Entity {id:$id})- [r:MERGED_FROM] -> () DELETE r`, { id: canonicalId });
      return true;
    },
