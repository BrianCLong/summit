import { Router } from 'express';
import { z } from 'zod';
import logger from '../config/logger';
import { buildDisclosureBundle } from '../disclosure/packager.js';
import { isDisclosurePackagerEnabled } from '../config/features-config.js';

const router = Router();

const attachmentSchema = z
  .object({
    path: z.string().optional(),
    uri: z.string().url().optional(),
    name: z.string().optional(),
    license: z.string().optional(),
    description: z.string().optional(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/i, 'sha256 must be a 64 character hex string')
      .optional(),
    mimeType: z.string().optional(),
    maxSizeBytes: z.number().int().positive().optional(),
  })
  .refine((value) => value.path || value.uri, {
    message: 'path or uri must be provided',
    path: ['path'],
  });

const disclosureRequestSchema = z.object({
  caseId: z.string(),
  claimIds: z.array(z.string()).optional(),
  attachments: z.array(attachmentSchema).default([]),
  generationTimestamp: z.string().optional(),
});

router.post('/disclosures', async (req, res) => {
  if (!isDisclosurePackagerEnabled()) {
    return res.status(404).json({ error: 'disclosure packager disabled' });
  }

  const parsed = disclosureRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_request', details: parsed.error.flatten() });
  }

  const payload = parsed.data;

  try {
    const bundle = await buildDisclosureBundle({
      caseId: payload.caseId,
      claimIds: payload.claimIds,
      attachments: payload.attachments,
      generationTimestamp: payload.generationTimestamp,
      requestContext: {
        requestedBy: (req as any)?.context?.userId,
        tenantId: (req as any)?.context?.tenantId,
        purpose: 'disclosure',
      },
    });

    return res.status(201).json({
      bundle: {
        path: bundle.bundlePath,
        sha256: bundle.bundleSha256,
      },
      manifest: {
        path: bundle.manifestPath,
        sha256: bundle.manifestSha256,
        data: bundle.manifest,
      },
      report: {
        pdf: { path: bundle.pdfPath, sha256: bundle.pdfSha256 },
        html: { path: bundle.htmlPath, sha256: bundle.htmlSha256 },
      },
      checksums: { path: bundle.checksumsPath },
      exhibits: bundle.manifest.manifest?.exhibits ?? [],
    });
  } catch (error) {
    logger.error({ error, caseId: payload.caseId }, 'Failed to build disclosure bundle');
    return res.status(500).json({ error: 'bundle_generation_failed' });
  }
});

export default router;
