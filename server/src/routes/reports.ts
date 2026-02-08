import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { AccessControlService } from '../reporting/access-control.js';
import { createReportingService } from '../reporting/service.js';
import { ReportRequest } from '../reporting/types.js';
import { getReportTemplate, ReportType } from '../reporting/templates.js';
import { ReportStore } from '../reporting/report-store.js';

const router = express.Router();

const defaultRules = [
  { resource: 'report', action: 'view', roles: ['user', 'admin'] },
  { resource: 'report', action: 'create', roles: ['editor', 'admin'] },
  { resource: 'report', action: 'update', roles: ['editor', 'admin'] },
  { resource: 'report', action: 'deliver', roles: ['admin'] },
];

const reportingService = createReportingService(new AccessControlService(defaultRules));
const reportStore = new ReportStore();

const generateReportSchema = z.object({
  reportType: z.enum([
    'approval-risk',
    'incident-evidence-manifest',
    'policy-coverage',
  ]),
  format: z.enum(['json', 'pdf']).default('json'),
  tenantId: z.string().optional(),
  tenantName: z.string().optional(),
  window: z
    .object({
      start: z.string().optional(),
      end: z.string().optional(),
    })
    .optional(),
  data: z.record(z.unknown()).optional(),
});

router.use((req, res, next) => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  (req as any).accessContext = {
    userId: user.sub || user.id,
    roles: user.roles || [user.role] || ['user'],
    tenantId: user.tenantId,
  };
  next();
});

router.post('/reports:generate', async (req, res) => {
  try {
    const input = generateReportSchema.parse(req.body);
    const reportId = crypto.randomUUID();

    const access = (req as any).accessContext;
    // SECURITY: Always use authenticated tenant context - never allow user input to override
    // This prevents IDOR attacks where a user could generate reports for other tenants
    const tenantId = access.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required for report generation' });
      return;
    }
    const payload = {
      reportId,
      reportType: input.reportType,
      tenantId,
      tenantName: input.tenantName,
      generatedAt: new Date().toISOString(),
      window: input.window || {},
      data: input.data || {},
    };

    const template = getReportTemplate(
      input.reportType as ReportType,
      input.format,
    );

    const request: ReportRequest = {
      template,
      context: {
        payload: JSON.stringify(payload, null, 2),
        report: payload,
      },
    };

    const artifact = await reportingService.generate(request, access);

    const record = await reportStore.record({
      reportId,
      reportType: input.reportType,
      templateId: template.id,
      tenantId,
      artifact,
    });

    res.status(201).json({
      reportId: record.id,
      downloadUrl: `/api/reports/${record.id}/download`,
      manifest: record.manifest,
      signature: record.signature,
      receipt: record.receipt,
    });
  } catch (error: any) {
    res.status(400).json({ error: (error as Error).message });
  }
});

router.get('/reports/:id', (req, res) => {
  const access = (req as any).accessContext;
  if (!access?.tenantId) {
    res.status(400).json({ error: 'tenantId is required' });
    return;
  }
  const record = reportStore.get(req.params.id, access.tenantId);
  if (!record) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  res.json({
    reportId: record.id,
    reportType: record.reportType,
    templateId: record.templateId,
    createdAt: record.createdAt,
    format: record.format,
    manifest: record.manifest,
    signature: record.signature,
    receipt: record.receipt,
  });
});

router.get('/reports/:id/download', (req, res) => {
  const access = (req as any).accessContext;
  if (!access?.tenantId) {
    res.status(400).json({ error: 'tenantId is required' });
    return;
  }
  const record = reportStore.get(req.params.id, access.tenantId);
  if (!record) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  res.setHeader('Content-Type', record.artifact.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${record.artifact.fileName}"`,
  );
  res.setHeader('X-Report-Id', record.id);
  res.send(record.artifact.buffer);
});

export default router;
