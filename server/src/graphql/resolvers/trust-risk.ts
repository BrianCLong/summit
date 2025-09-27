import { redactionService } from '../../redaction/redact.js';
import { isAgentEnabled } from '../../config/agent-features.js';
import { recordTrustScore, recordRiskSignal } from '../../observability/trust-risk-metrics.js';
import { getTrustScore, upsertTrustScore, insertRiskSignal } from '../../db/repositories/trustRiskRepo.js';
import { listRiskSignalsPaged, listTrustScores } from '../../db/repositories/trustRiskRepo.js';

function nowIso() { return new Date().toISOString(); }

export const trustRiskResolvers = {
  Query: {
    async trustScore(_: any, { subjectId }: any, ctx: any) {
      if (!isAgentEnabled('ANGLETON')) {
        return { subjectId, score: 0.5, reasons: ['agent_disabled'], updatedAt: nowIso() };
      }
      const tenantId = ctx?.tenantId || 't0';
      const existing = await getTrustScore(tenantId, subjectId);
      const score = existing?.score ?? 0.7;
      const reasons = existing?.reasons ?? ['baseline'];
      const payload = { subjectId, score, reasons, updatedAt: existing?.updated_at ?? nowIso() };
      recordTrustScore(subjectId, score);
      const policy = { rules: { email: 'pii', phone: 'pii' } } as any;
      return await redactionService.redactObject(payload, policy, ctx?.tenantId ?? 't0');
    },
    async riskSignals(_: any, { tenantId, limit, kind, severity }: any) {
      const rows = await (await import('../../db/repositories/trustRiskRepo.js')).listRecentSignals(tenantId, undefined, Math.min(limit ?? 50, 100));
      return rows
        .filter(r => (!kind || r.kind === kind) && (!severity || r.severity === severity))
        .map(r => ({ id: r.id, tenantId: r.tenant_id, kind: r.kind, severity: r.severity, message: r.message, source: r.source, createdAt: r.created_at, context: r.context }));
    },
    async riskSignalsPage(_: any, { tenantId, limit, offset, kind, severity }: any) {
      const page = await listRiskSignalsPaged(tenantId, { kind, severity, limit, offset });
      return {
        items: page.items.map(r => ({ id: r.id, tenantId: r.tenant_id, kind: r.kind, severity: r.severity, message: r.message, source: r.source, createdAt: r.created_at, context: r.context })),
        total: page.total,
        nextOffset: page.nextOffset,
      };
    },
    async trustScoresPage(_: any, { tenantId, limit, offset }: any) {
      const page = await listTrustScores(tenantId, limit, offset);
      return {
        items: page.items.map(ts => ({ subjectId: ts.subject_id, score: Number(ts.score), reasons: ts.reasons || [], updatedAt: ts.updated_at })),
        total: page.total,
        nextOffset: page.nextOffset,
      };
    },
    async incidentBundle(_: any, { id }: any) {
      return {
        id,
        type: 'DATA_INTEGRITY',
        status: 'OPEN',
        createdAt: nowIso(),
        signals: [
          {
            id: 'rs_1', tenantId: 't0', kind: 'anomaly', severity: 'HIGH', message: 'unexpected data path', source: 'angleton', createdAt: nowIso(), context: { path: '/ingest/v2' },
          },
        ],
        actions: ['quarantine-input', 'request-corroboration', 'notify-owner'],
        notes: 'Auto-generated bundle for review',
      };
    },
  },
  Mutation: {
    async raiseRiskSignal(_: any, { input }: any) {
      if (!isAgentEnabled('HAREL') && !isAgentEnabled('ANGLETON')) {
        throw new Error('risk signaling disabled by feature flags');
      }
      const rec = {
        id: `rs_${Date.now()}`,
        tenantId: input.tenantId,
        kind: input.kind,
        severity: input.severity,
        message: input.message,
        source: input.source,
        createdAt: nowIso(),
        context: input.context || null,
      } as any;
      await insertRiskSignal({
        id: rec.id,
        tenant_id: rec.tenantId,
        kind: rec.kind,
        severity: rec.severity,
        message: rec.message,
        source: rec.source,
        context: rec.context,
      });
      recordRiskSignal({ tenantId: rec.tenantId, kind: rec.kind, severity: rec.severity, source: rec.source });
      return rec;
    },
    async createIncidentBundle(_: any, { input }: any) {
      const bundle = {
        id: `ib_${Date.now()}`,
        type: input.type,
        status: 'OPEN',
        createdAt: nowIso(),
        signals: (input.signalIds || []).map((id: string) => ({ id, tenantId: 't0', kind: 'linked', severity: 'LOW', message: 'linked signal', source: 'system', createdAt: nowIso(), context: {} })),
        actions: ['assign-reviewer'],
        notes: input.notes || null,
      };
      // Record metrics for each linked signal
      for (const s of bundle.signals) {
        recordRiskSignal({ tenantId: s.tenantId, kind: s.kind, severity: s.severity, source: s.source });
      }
      return bundle;
    },
  },
};

export default trustRiskResolvers;
