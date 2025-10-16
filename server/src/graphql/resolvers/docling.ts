import { z } from 'zod';
import { doclingService } from '../../services/DoclingService.js';
import { doclingRepository } from '../../db/repositories/doclingRepository.js';

const SummarizeBuildFailureZ = z.object({
  requestId: z.string().min(8),
  buildId: z.string().min(1),
  logText: z.string().min(1),
  artifactUri: z.string().url().optional(),
  retention: z.enum(['SHORT', 'STANDARD']),
  purpose: z.string().min(3),
  maxTokens: z.number().int().positive().max(4096).optional(),
});

const ExtractLicensesZ = z.object({
  requestId: z.string().min(8),
  text: z.string().min(1),
  retention: z.enum(['SHORT', 'STANDARD']),
  purpose: z.string().min(3),
  sourceType: z.string().min(2),
  artifactUri: z.string().url().optional(),
});

const ReleaseNotesZ = z.object({
  requestId: z.string().min(8),
  diffText: z.string().min(1),
  retention: z.enum(['SHORT', 'STANDARD']),
  purpose: z.string().min(3),
});

const requireTenant = (ctx: any): string => {
  const tenantId =
    ctx?.user?.tenantId || ctx?.tenantId || ctx?.req?.headers?.['x-tenant-id'];
  if (!tenantId) {
    throw new Error('Missing tenant scope');
  }
  return String(tenantId);
};

const mapRetention = (value: 'SHORT' | 'STANDARD'): 'short' | 'standard' =>
  value === 'SHORT' ? 'short' : 'standard';

export const doclingResolvers = {
  Query: {
    async doclingSummary(
      _parent: unknown,
      args: { requestId: string },
      ctx: any,
    ) {
      const tenantId = requireTenant(ctx);
      const record = await doclingRepository.findSummaryByRequestId(
        tenantId,
        args.requestId,
      );
      if (!record) return null;
      return {
        id: record.id,
        text: record.text,
        focus: record.focus,
        highlights: record.highlights || [],
        qualitySignals: record.qualitySignals || {},
      };
    },
  },
  Mutation: {
    async summarizeBuildFailure(
      _parent: unknown,
      args: { input: any },
      ctx: any,
    ) {
      const tenantId = requireTenant(ctx);
      const parsed = SummarizeBuildFailureZ.safeParse(args.input || {});
      if (!parsed.success) {
        throw new Error(`Invalid input: ${parsed.error.message}`);
      }
      const payload = parsed.data;
      const result = await doclingService.summarizeBuildFailure({
        tenantId,
        buildId: payload.buildId,
        requestId: payload.requestId,
        logText: payload.logText,
        artifactUri: payload.artifactUri,
        retention: mapRetention(payload.retention),
        purpose: payload.purpose,
        maxTokens: payload.maxTokens,
      });
      return {
        summary: result.summary,
        fragments: result.fragments.map((fragment) => ({
          id: fragment.id,
          sha256: fragment.sha256,
          text: fragment.text,
          metadata: fragment.metadata,
        })),
        findings: result.findings.map((finding) => ({
          id: finding.id,
          label: finding.label,
          value: finding.value,
          confidence: finding.confidence,
          severity: finding.severity,
          fragmentId: finding.fragmentId,
          qualitySignals: finding.metadata || finding.qualitySignals,
        })),
        policySignals: result.policySignals.map((signal) => ({
          id: signal.id,
          classification: signal.classification,
          value: signal.value,
          purpose: signal.purpose,
          retention: signal.retention === 'short' ? 'SHORT' : 'STANDARD',
          fragmentId: signal.fragmentId,
          qualitySignals:
            signal.metadata?.qualitySignals || signal.qualitySignals,
        })),
      };
    },

    async extractLicenses(_parent: unknown, args: { input: any }, ctx: any) {
      const tenantId = requireTenant(ctx);
      const parsed = ExtractLicensesZ.safeParse(args.input || {});
      if (!parsed.success) {
        throw new Error(`Invalid input: ${parsed.error.message}`);
      }
      const payload = parsed.data;
      const result = await doclingService.extractLicenses({
        tenantId,
        requestId: payload.requestId,
        text: payload.text,
        retention: mapRetention(payload.retention),
        purpose: payload.purpose,
        sourceType: payload.sourceType as any,
        artifactUri: payload.artifactUri,
      });
      return {
        findings: result.findings.map((finding) => ({
          id: finding.id,
          label: finding.label,
          value: finding.value,
          confidence: finding.confidence,
          severity: finding.severity,
          fragmentId: finding.fragmentId,
          qualitySignals: finding.metadata || finding.qualitySignals,
        })),
        policySignals: result.policySignals.map((signal) => ({
          id: signal.id,
          classification: signal.classification,
          value: signal.value,
          purpose: signal.purpose,
          retention: signal.retention === 'short' ? 'SHORT' : 'STANDARD',
          fragmentId: signal.fragmentId,
          qualitySignals:
            signal.metadata?.qualitySignals || signal.qualitySignals,
        })),
      };
    },

    async generateReleaseNotes(
      _parent: unknown,
      args: { input: any },
      ctx: any,
    ) {
      const tenantId = requireTenant(ctx);
      const parsed = ReleaseNotesZ.safeParse(args.input || {});
      if (!parsed.success) {
        throw new Error(`Invalid input: ${parsed.error.message}`);
      }
      const payload = parsed.data;
      const result = await doclingService.generateReleaseNotes({
        tenantId,
        requestId: payload.requestId,
        diffText: payload.diffText,
        retention: mapRetention(payload.retention),
        purpose: payload.purpose,
      });
      return {
        summary: result.summary,
      };
    },
  },
};
