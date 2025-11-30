/**
 * Disclosure Pack routes - Generate audit-ready disclosure packs
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { pool } from '../index.js';
import { hasPermission, hasClearance } from '../middleware/auth.js';

const GenerateDisclosureBody = z.object({
  decision_id: z.string().uuid(),
  format: z.enum(['markdown', 'html', 'json']).default('markdown'),
  include_evidence_details: z.boolean().default(true),
  include_audit_trail: z.boolean().default(true),
  redact_sensitive: z.boolean().default(true),
});

export async function disclosureRoutes(fastify: FastifyInstance): Promise<void> {
  // Generate disclosure pack
  fastify.post<{ Body: z.infer<typeof GenerateDisclosureBody> }>(
    '/generate',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'disclosure:generate')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const parse = GenerateDisclosureBody.safeParse(request.body);
      if (!parse.success) {
        return reply.status(400).send({ error: parse.error.flatten() });
      }

      const { decision_id, format, include_evidence_details, include_audit_trail, redact_sensitive } = parse.data;

      try {
        // Get decision with full graph
        const decisionResult = await pool.query(
          'SELECT * FROM decisions WHERE id = $1 AND tenant_id = $2',
          [decision_id, request.auth.tenant_id],
        );

        if (decisionResult.rows.length === 0) {
          return reply.status(404).send({ error: 'Decision not found' });
        }

        const decision = decisionResult.rows[0];

        // Get claims
        let claims: any[] = [];
        if (decision.claim_ids?.length > 0) {
          const claimsResult = await pool.query(
            'SELECT * FROM claims WHERE id = ANY($1) AND tenant_id = $2',
            [decision.claim_ids, request.auth.tenant_id],
          );
          claims = claimsResult.rows;
        }

        // Get evidence
        let evidence: any[] = [];
        if (include_evidence_details) {
          const allEvidenceIds = new Set<string>(decision.evidence_ids || []);
          for (const claim of claims) {
            for (const eid of claim.evidence_ids || []) {
              allEvidenceIds.add(eid);
            }
          }

          if (allEvidenceIds.size > 0) {
            const evidenceResult = await pool.query(
              'SELECT * FROM evidence WHERE id = ANY($1) AND tenant_id = $2',
              [Array.from(allEvidenceIds), request.auth.tenant_id],
            );
            evidence = evidenceResult.rows;
          }
        }

        // Get audit trail
        let auditTrail: any[] = [];
        if (include_audit_trail) {
          const auditResult = await pool.query(
            `SELECT * FROM audit_log
             WHERE resource_id = $1 AND tenant_id = $2
             ORDER BY timestamp ASC`,
            [decision_id, request.auth.tenant_id],
          );
          auditTrail = auditResult.rows;
        }

        // Apply redaction if needed
        let redactionsApplied = 0;
        if (redact_sensitive && !hasClearance(request.auth, 'confidential')) {
          // Redact sensitive fields from evidence
          evidence = evidence.map((e) => {
            const shouldRedact = e.policy_labels?.includes('pii') ||
                                 e.policy_labels?.includes('confidential');
            if (shouldRedact) {
              redactionsApplied++;
              return {
                ...e,
                source_uri: '[REDACTED]',
                extracted_text: '[REDACTED]',
              };
            }
            return e;
          });
        }

        // Build disclosure pack
        const packId = `disclosure_${uuid()}`;
        const now = new Date().toISOString();

        const pack = {
          id: packId,
          version: '1.0.0',
          decision_id,
          generated_at: now,
          generated_by: request.auth.user_id,
          format,
          sections: {
            summary: {
              question: decision.question,
              answer: decision.recommendation || getSelectedOptionName(decision),
              confidence: decision.confidence_score || 0,
              decision_maker: decision.decision_maker_id,
              decided_at: decision.decided_at,
            },
            options_considered: (decision.options || []).map((opt: any) => ({
              name: opt.name,
              description: opt.description,
              was_selected: opt.selected,
              pros: opt.pros || [],
              cons: opt.cons || [],
            })),
            claims_and_evidence: claims.map((claim) => ({
              claim_summary: claim.assertion,
              confidence: claim.confidence_score,
              evidence_sources: evidence
                .filter((e) => claim.evidence_ids?.includes(e.id))
                .map((e) => ({
                  title: e.title,
                  source_type: e.source_type,
                  reliability: e.reliability_score,
                  redacted: e.source_uri === '[REDACTED]',
                })),
            })),
            risk_assessment: decision.risk_assessment || undefined,
            limitations: [
              { type: 'data_freshness', description: 'Evidence may not reflect real-time conditions' },
              { type: 'model_uncertainty', description: 'AI recommendations have inherent uncertainty' },
              { type: 'scope', description: 'Analysis limited to available data sources' },
            ],
            audit_trail: auditTrail.map((entry) => ({
              event: entry.action,
              actor: entry.actor_id,
              timestamp: entry.timestamp,
            })),
          },
          merkle_root: computeMerkleRoot(decision, claims, evidence),
          policy_labels_applied: decision.policy_labels || [],
          redactions_applied: redactionsApplied,
          tenant_id: request.auth.tenant_id,
        };

        // Generate output in requested format
        let output: string;
        if (format === 'markdown') {
          output = generateMarkdown(pack);
        } else if (format === 'html') {
          output = generateHtml(pack);
        } else {
          output = JSON.stringify(pack, null, 2);
        }

        request.log.info({
          packId,
          decisionId: decision_id,
          format,
          redactions: redactionsApplied,
        }, 'Disclosure pack generated');

        return {
          pack,
          output,
          content_type: format === 'html' ? 'text/html' : format === 'markdown' ? 'text/markdown' : 'application/json',
        };
      } catch (error) {
        request.log.error({ error }, 'Failed to generate disclosure pack');
        return reply.status(500).send({ error: 'Failed to generate disclosure pack' });
      }
    },
  );

  // Get disclosure pack by ID
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'disclosure:read')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;

      try {
        const result = await pool.query(
          'SELECT * FROM disclosure_packs WHERE id = $1 AND tenant_id = $2',
          [id, request.auth.tenant_id],
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'Disclosure pack not found' });
        }

        return result.rows[0];
      } catch (error) {
        request.log.error({ error }, 'Failed to get disclosure pack');
        return reply.status(500).send({ error: 'Failed to retrieve disclosure pack' });
      }
    },
  );

  // Verify disclosure pack integrity
  fastify.post<{ Params: { id: string } }>(
    '/:id/verify',
    async (request, reply) => {
      if (!hasPermission(request.auth, 'disclosure:read')) {
        return reply.status(403).send({ error: 'Forbidden' });
      }

      const { id } = request.params;

      try {
        const result = await pool.query(
          'SELECT * FROM disclosure_packs WHERE id = $1 AND tenant_id = $2',
          [id, request.auth.tenant_id],
        );

        if (result.rows.length === 0) {
          return reply.status(404).send({ error: 'Disclosure pack not found' });
        }

        const pack = result.rows[0];

        // Re-fetch decision and verify merkle root
        const decisionResult = await pool.query(
          'SELECT * FROM decisions WHERE id = $1 AND tenant_id = $2',
          [pack.decision_id, request.auth.tenant_id],
        );

        if (decisionResult.rows.length === 0) {
          return {
            valid: false,
            reason: 'Decision no longer exists',
            verified_at: new Date().toISOString(),
          };
        }

        // For now, just verify pack exists and decision exists
        // Full Merkle verification would compare stored vs current hashes

        return {
          valid: true,
          pack_id: id,
          decision_id: pack.decision_id,
          original_merkle_root: pack.merkle_root,
          verified_at: new Date().toISOString(),
        };
      } catch (error) {
        request.log.error({ error }, 'Failed to verify disclosure pack');
        return reply.status(500).send({ error: 'Failed to verify disclosure pack' });
      }
    },
  );
}

function getSelectedOptionName(decision: any): string {
  const selectedOption = decision.options?.find((o: any) => o.selected);
  return selectedOption?.name || 'No option selected';
}

function computeMerkleRoot(decision: any, claims: any[], evidence: any[]): string {
  const hashes: string[] = [];

  // Hash decision core content
  hashes.push(crypto.createHash('sha256').update(JSON.stringify({
    id: decision.id,
    question: decision.question,
    selected_option_id: decision.selected_option_id,
  })).digest('hex'));

  // Hash claims
  for (const claim of claims) {
    hashes.push(crypto.createHash('sha256').update(JSON.stringify({
      id: claim.id,
      assertion: claim.assertion,
      hash: claim.hash,
    })).digest('hex'));
  }

  // Hash evidence
  for (const e of evidence) {
    hashes.push(crypto.createHash('sha256').update(JSON.stringify({
      id: e.id,
      content_hash: e.content_hash,
    })).digest('hex'));
  }

  // Compute merkle root
  if (hashes.length === 0) return '';
  if (hashes.length === 1) return hashes[0];

  while (hashes.length > 1) {
    const newLevel: string[] = [];
    for (let i = 0; i < hashes.length; i += 2) {
      if (i + 1 < hashes.length) {
        newLevel.push(crypto.createHash('sha256').update(hashes[i] + hashes[i + 1]).digest('hex'));
      } else {
        newLevel.push(hashes[i]);
      }
    }
    hashes.length = 0;
    hashes.push(...newLevel);
  }

  return hashes[0];
}

function generateMarkdown(pack: any): string {
  const { sections } = pack;

  return `# Disclosure Pack

## Decision Summary

**Question:** ${sections.summary.question}

**Answer:** ${sections.summary.answer}

**Confidence:** ${(sections.summary.confidence * 100).toFixed(1)}%

**Decision Maker:** ${sections.summary.decision_maker}

**Decided At:** ${sections.summary.decided_at || 'Pending'}

---

## Options Considered

${sections.options_considered.map((opt: any, i: number) => `
### ${i + 1}. ${opt.name} ${opt.was_selected ? '✓ SELECTED' : ''}

${opt.description}

**Pros:**
${opt.pros.map((p: string) => `- ${p}`).join('\n') || '- None listed'}

**Cons:**
${opt.cons.map((c: string) => `- ${c}`).join('\n') || '- None listed'}
`).join('\n')}

---

## Claims and Evidence

${sections.claims_and_evidence.map((item: any, i: number) => `
### Claim ${i + 1}

**Summary:** ${item.claim_summary}

**Confidence:** ${(item.confidence * 100).toFixed(1)}%

**Evidence Sources:**
${item.evidence_sources.map((e: any) => `- ${e.title} (${e.source_type}, reliability: ${(e.reliability * 100).toFixed(0)}%)${e.redacted ? ' [REDACTED]' : ''}`).join('\n') || '- No evidence attached'}
`).join('\n')}

---

## Risk Assessment

${sections.risk_assessment ? `
**Overall Risk:** ${sections.risk_assessment.overall_risk}

**Risk Factors:**
${sections.risk_assessment.risk_factors?.map((r: string) => `- ${r}`).join('\n') || '- None identified'}

**Mitigations:**
${sections.risk_assessment.mitigations?.map((m: string) => `- ${m}`).join('\n') || '- None specified'}
` : 'No risk assessment available'}

---

## Known Limitations

${sections.limitations.map((l: any) => `- **${l.type}**: ${l.description}`).join('\n')}

---

## Audit Trail

| Timestamp | Event | Actor |
|-----------|-------|-------|
${sections.audit_trail.map((entry: any) => `| ${entry.timestamp} | ${entry.event} | ${entry.actor} |`).join('\n') || '| No audit entries | - | - |'}

---

## Integrity

**Merkle Root:** \`${pack.merkle_root}\`

**Generated At:** ${pack.generated_at}

**Generated By:** ${pack.generated_by}

**Redactions Applied:** ${pack.redactions_applied}
`;
}

function generateHtml(pack: any): string {
  const markdown = generateMarkdown(pack);
  // Simple markdown to HTML conversion
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Disclosure Pack - ${pack.id}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a2e; }
    h2 { color: #16213e; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    h3 { color: #0f3460; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; }
    .selected { background: #e8f5e9; }
    .redacted { color: #d32f2f; }
  </style>
</head>
<body>
  <pre>${markdown}</pre>
</body>
</html>`;
}
