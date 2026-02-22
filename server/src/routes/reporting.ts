import express from 'express';
import { createReportingService } from '../reporting/service.js';
import { AccessControlService } from '../reporting/access-control.js';
import { AccessRule, AccessContext, ReportRequest, ReportTemplate } from '../reporting/types.js';
import BatchJobService from '../services/BatchJobService.js';
import fs from 'fs/promises';
import { existsSync, mkdirSync, writeFileSync } from 'fs'; // synchronous for init only
import path from 'path';

// Template Persistence: Simple file-based store for MVP
const TEMPLATE_STORE_PATH = path.join(process.cwd(), 'server', 'data', 'report-templates.json');

// Ensure directory exists (sync init)
if (!existsSync(path.dirname(TEMPLATE_STORE_PATH))) {
    mkdirSync(path.dirname(TEMPLATE_STORE_PATH), { recursive: true });
}

// Initial seed if file doesn't exist (sync init)
if (!existsSync(TEMPLATE_STORE_PATH)) {
    const seedTemplates = [
        {
          id: 'template-1',
          name: 'Weekly Security Summary',
          description: 'Overview of security events',
          content: '{"events": {{events}}}',
          format: 'json',
        },
        {
            id: 'template-2',
            name: 'Incident Report',
            description: 'Detailed incident report',
            content: '<h1>Incident Report</h1><p>{{details}}</p>',
            format: 'pdf'
        },
        {
            id: 'template-3',
            name: 'System Health',
            description: 'System health check',
            content: '<health><status>{{status}}</status></health>',
            format: 'xml'
        }
    ];
    writeFileSync(TEMPLATE_STORE_PATH, JSON.stringify(seedTemplates, null, 2));
}

async function getTemplates(): Promise<ReportTemplate[]> {
    try {
        const data = await fs.readFile(TEMPLATE_STORE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveTemplates(templates: ReportTemplate[]) {
    await fs.writeFile(TEMPLATE_STORE_PATH, JSON.stringify(templates, null, 2));
}

// Mock access rules - in production this would come from DB/Policy
const defaultRules: AccessRule[] = [
  { resource: 'report', action: 'view', roles: ['user', 'admin'] },
  { resource: 'report', action: 'create', roles: ['editor', 'admin'] },
  { resource: 'report', action: 'update', roles: ['editor', 'admin'] },
  { resource: 'report', action: 'deliver', roles: ['admin'] },
];

const reportingService = createReportingService(new AccessControlService(defaultRules));

const router = express.Router();

// Middleware to construct AccessContext from request
router.use((req, res, next) => {
  // Use actual authenticated user from upstream auth middleware
  const user = (req as any).user;

  if (user) {
      (req as any).accessContext = {
        userId: user.sub || user.id,
        roles: user.roles || [user.role] || ['user'],
      } as AccessContext;
      next();
  } else {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }
});

router.get('/templates', async (req, res) => {
  res.json(await getTemplates());
});

router.post('/templates', async (req, res) => {
    try {
        // Basic validation could be improved
        const newTemplate: ReportTemplate = {
            id: `template-${Date.now()}`,
            ...req.body
        };
        const templates = await getTemplates();
        templates.push(newTemplate);
        await saveTemplates(templates);
        res.status(201).json(newTemplate);
    } catch (error: any) {
        res.status(500).json({ error: (error as Error).message });
    }
});

router.put('/templates/:id', async (req, res) => {
    try {
        const templates = await getTemplates();
        const index = templates.findIndex(t => t.id === req.params.id);
        if (index === -1) return res.status(404).json({ error: 'Template not found' });

        templates[index] = { ...templates[index], ...req.body };
        await saveTemplates(templates);
        res.json(templates[index]);
    } catch (error: any) {
         res.status(500).json({ error: (error as Error).message });
    }
});

router.post('/generate', async (req, res) => {
  try {
    const request: ReportRequest = req.body;
    // In a real app, we might hydrate the template from ID here
    if (typeof request.template === 'string') {
         const templates = await getTemplates();
         const tpl = templates.find(t => t.id === request.template as unknown as string);
         if (!tpl) return res.status(404).json({ error: 'Template not found' });
         request.template = tpl;
    }

    const access = (req as any).accessContext;
    const artifact = await reportingService.generate(request, access);

    res.setHeader('Content-Type', artifact.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);

    // Add custom headers for metadata
    if (artifact.metadata) {
        res.setHeader('X-Report-Version', artifact.metadata.versionId as string);
    }

    res.send(artifact.buffer);
  } catch (error: any) {
    res.status(500).json({ error: (error as Error).message });
  }
});

router.post('/schedule', async (req, res) => {
    try {
        const { name, cron, request } = req.body;
        if (!name || !cron || !request) {
            return res.status(400).json({ error: 'Missing required fields: name, cron, request' });
        }

        const reportRequest: ReportRequest = { ...request };

        // Hydrate template if it is an ID string
        // This ensures the worker receives a full template object (snapshot)
        if (typeof reportRequest.template === 'string') {
             const templates = await getTemplates();
             const tpl = templates.find(t => t.id === reportRequest.template as unknown as string);
             if (!tpl) return res.status(404).json({ error: 'Template not found' });
             reportRequest.template = tpl;
        }

        // Use BatchJobService to schedule the report using the correct method signature
        await BatchJobService.scheduleReport(name, cron, { request: reportRequest, userId: (req as any).accessContext.userId });

        res.status(201).json({ message: 'Report scheduled', reportName: name });
    } catch (error: any) {
        res.status(500).json({ error: (error as Error).message });
    }
});

router.get('/history/:templateId', (req, res) => {
    const history = reportingService.history(req.params.templateId);
    res.json(history);
});

export default router;
