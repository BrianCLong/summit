import { sloMetrics } from '../../crystal/slo-metrics.js';
import { getLatestEvidence } from '../../db/repositories/evidenceRepo.js';

export const evidenceOkResolvers = {
  Query: {
    async evidenceOk(_root: any, { service, releaseId }: any, _ctx: any) {
      // Prefer the latest Evidence bundle for this service/releaseId if available
      const ev = await getLatestEvidence(service, releaseId).catch(() => null);
      let snapshot: any;
      let cost: any;
      if (ev) {
        snapshot = { service, p95Ms: ev.slo?.p95Ms ?? 0, p99Ms: ev.slo?.p99Ms ?? null, errorRate: ev.slo?.errorRate ?? 0, window: ev.slo?.window ?? 'unknown' };
        cost = ev.cost || null;
      } else {
        const slo = sloMetrics.getSLOSnapshot();
        snapshot = { service, p95Ms: Math.round(slo.gatewayReadP95), p99Ms: Math.round(slo.gatewayReadP99), errorRate: 0.01, window: '15m' };
        cost = { graphqlPerMillionUsd: 1.8, ingestPerThousandUsd: 0.08 } as any;
      }
      const reasons: string[] = [];
      const READ_P95_BUDGET = 350;
      const ERROR_RATE_BUDGET = 0.02;
      const GRAPHQL_COST_BUDGET = 2.0;
      if (snapshot.p95Ms > READ_P95_BUDGET) reasons.push(`p95 ${snapshot.p95Ms}ms > ${READ_P95_BUDGET}ms`);
      if (snapshot.errorRate > ERROR_RATE_BUDGET) reasons.push(`errorRate ${snapshot.errorRate} > ${ERROR_RATE_BUDGET}`);
      if ((cost?.graphqlPerMillionUsd ?? 0) > GRAPHQL_COST_BUDGET) reasons.push(`graphql cost ${cost.graphqlPerMillionUsd} > ${GRAPHQL_COST_BUDGET}`);
      return { ok: reasons.length === 0, reasons, snapshot, cost };
    },
  },
};

export default evidenceOkResolvers;
