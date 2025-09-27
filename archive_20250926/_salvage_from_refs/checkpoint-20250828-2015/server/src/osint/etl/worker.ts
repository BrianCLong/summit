import { Queue, Worker } from "bullmq";
import fetch from "node-fetch";
import { RssConnector } from "../connectors/RssConnector";
import { mapToCanonical } from "../mapper";
import { assertIngestAllowed } from "../policy";
import { getIO } from "../../realtime/socket";
import { OsintPgRepo } from "../db/pgRepo";
import { upsertOsintDocument } from "../db/graph";
import { TaxiiConnector } from "../connectors/TaxiiConnector";
import { MispConnector } from "../connectors/MispConnector";
import { extractEntities } from "../enrich/ner";
import { extractClaims } from "../enrich/claims";
import { ProvLedgerRepo } from "../db/ledger";
import logger from "../../config/logger";
import otelService from "../../monitoring/opentelemetry";
import { ErPipeline } from "../er/pipeline";
import { WatchlistEvaluator } from "../watchlists/evaluator";

const connection = {
  host: process.env.REDIS_HOST || "localhost",
  port: +(process.env.REDIS_PORT || 6379),
};

export const osintQueue = new Queue("osint.fetch", { connection });

// Minimal worker scaffold; extend with switch for multiple connector kinds
export function startOsintWorker() {
  const pgRepo = new OsintPgRepo();
  const ledger = new ProvLedgerRepo();
  const er = new ErPipeline();
  const watchlists = new WatchlistEvaluator();
  const sourcesSql = {
    insertRun: `INSERT INTO osint_runs(source_id, started_at, finished_at, status, items_ingested, error, latency_ms)
                VALUES($1,$2,$3,$4,$5,$6,$7)`,
    updateHealth: `UPDATE osint_sources SET last_run_at=$2, last_status=$3, items_ingested=COALESCE(items_ingested,0)+$4, next_run_at=NULL, updated_at=now() WHERE id=$1`,
  } as const;
  // Avoid double-start in tests or hot-reload
  // eslint-disable-next-line no-new
  new Worker(
    "osint.fetch",
    async (job) => {
      const span = otelService.startSpan('osint.fetch', { 'source.id': job.data?.source?.id, 'source.kind': job.data?.source?.kind });
      const { source } = job.data as any; // { id, kind, url, licenseRule }
      assertIngestAllowed(source.licenseRule);

      let connector: any;
      switch (source.kind) {
        case "RSS":
          connector = new RssConnector(source.id, source.url);
          break;
        case "TAXII":
          connector = new TaxiiConnector(source.id, source.url, source.url, source.collectionId || "");
          break;
        case "MISP":
          connector = new MispConnector(source.id, source.url, process.env.MISP_API_KEY || "");
          break;
        default:
          connector = new RssConnector(source.id, source.url);
      }
      const jobStarted = Date.now();
      let totalItems = 0;
      let lastError: string | null = null;
      for (const req of connector.buildRequests()) {
        const resp = await fetch(req.url);
        const text = await resp.text();
        const items = connector.parse(text);

        for (const item of items) {
          const canonical: any = mapToCanonical(item);
          // naive enrichment for MVP-2
          const body = (item as any).raw?.description || (item as any).body || canonical.summary || '';
          try { await ledger.append(canonical.hash, 'ingest.fetch', { url: req.url }); } catch (e:any) { try { logger.warn('prov append failed: ingest.fetch'); } catch {} }
          otelService.addSpanEvent('osint.enrich.ner');
          canonical.entities = extractEntities(body);
          otelService.addSpanEvent('osint.enrich.claims');
          canonical.claims = extractClaims(body);
          try { await ledger.append(canonical.hash, 'enrich.ner', { count: canonical.entities.length }); } catch {}
          try { await ledger.append(canonical.hash, 'enrich.claims', { count: canonical.claims.length }); } catch {}
          canonical.license = source.licenseRule || { allowExport: false };
          canonical.policy = { tags: ["osint", source.kind] };
          canonical.provenance = [
            { kind: "fetch", ts: new Date(), note: `source:${source.id}` },
          ];

          otelService.addSpanEvent('osint.persist.pg');
          await pgRepo.upsertDocument(canonical);
          try { await ledger.append(canonical.hash, 'persist.pg', {}); } catch {}
          otelService.addSpanEvent('osint.persist.neo4j');
          await upsertOsintDocument(canonical);
          try { await ledger.append(canonical.hash, 'persist.neo4j', {}); } catch {}

          // ER suggestions for each entity
          for (const ent of canonical.entities || []) {
            try { await er.suggestForEntity({ id: ent.id, kind: ent.kind || 'UNKNOWN', name: ent.name }); } catch {}
          }
          // Watchlists evaluation + ALERT events
          try { await watchlists.evaluate({ hash: canonical.hash, policy: canonical.policy, sourceKind: (source.kind||'').toUpperCase() }, canonical.entities || [], {}); } catch {}

          totalItems++;
          // Emit a socket event for live UI feedback
          const io = getIO();
          io?.emit("OSINT_EVT", {
            kind: "ITEM_PARSED",
            itemId: canonical.hash,
            sourceId: source.id,
            message: canonical.title || canonical.url || "OSINT item",
          });
        }
      }
      const latency = Date.now() - jobStarted;
      try {
        const { getPostgresPool } = await import('../../config/database');
        const pool = getPostgresPool();
        await pool.query(sourcesSql.insertRun, [source.id, new Date(jobStarted), new Date(), 'SUCCEEDED', totalItems, lastError, latency]);
        await pool.query(sourcesSql.updateHealth, [source.id, new Date(), 'SUCCEEDED', totalItems]);
      } catch {}
      span.end();
    },
    { connection }
  );
}
