"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const service_js_1 = require("../reporting/service.js");
const access_control_js_1 = require("../reporting/access-control.js");
const BatchJobService_js_1 = __importDefault(require("../services/BatchJobService.js"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = require("fs"); // synchronous for init only
const path_1 = __importDefault(require("path"));
// Template Persistence: Simple file-based store for MVP
const TEMPLATE_STORE_PATH = path_1.default.join(process.cwd(), 'server', 'data', 'report-templates.json');
// Ensure directory exists (sync init)
if (!(0, fs_1.existsSync)(path_1.default.dirname(TEMPLATE_STORE_PATH))) {
    (0, fs_1.mkdirSync)(path_1.default.dirname(TEMPLATE_STORE_PATH), { recursive: true });
}
// Initial seed if file doesn't exist (sync init)
if (!(0, fs_1.existsSync)(TEMPLATE_STORE_PATH)) {
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
    (0, fs_1.writeFileSync)(TEMPLATE_STORE_PATH, JSON.stringify(seedTemplates, null, 2));
}
async function getTemplates() {
    try {
        const data = await promises_1.default.readFile(TEMPLATE_STORE_PATH, 'utf-8');
        return JSON.parse(data);
    }
    catch {
        return [];
    }
}
async function saveTemplates(templates) {
    await promises_1.default.writeFile(TEMPLATE_STORE_PATH, JSON.stringify(templates, null, 2));
}
// Mock access rules - in production this would come from DB/Policy
const defaultRules = [
    { resource: 'report', action: 'view', roles: ['user', 'admin'] },
    { resource: 'report', action: 'create', roles: ['editor', 'admin'] },
    { resource: 'report', action: 'update', roles: ['editor', 'admin'] },
    { resource: 'report', action: 'deliver', roles: ['admin'] },
];
const reportingService = (0, service_js_1.createReportingService)(new access_control_js_1.AccessControlService(defaultRules));
const router = express_1.default.Router();
// Middleware to construct AccessContext from request
router.use((req, res, next) => {
    // Use actual authenticated user from upstream auth middleware
    const user = req.user;
    if (user) {
        req.accessContext = {
            userId: user.sub || user.id,
            roles: user.roles || [user.role] || ['user'],
        };
        next();
    }
    else {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }
});
router.get('/templates', async (req, res) => {
    res.json(await getTemplates());
});
router.post('/templates', async (req, res) => {
    try {
        // Basic validation could be improved
        const newTemplate = {
            id: `template-${Date.now()}`,
            ...req.body
        };
        const templates = await getTemplates();
        templates.push(newTemplate);
        await saveTemplates(templates);
        res.status(201).json(newTemplate);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.put('/templates/:id', async (req, res) => {
    try {
        const templates = await getTemplates();
        const index = templates.findIndex(t => t.id === req.params.id);
        if (index === -1)
            return res.status(404).json({ error: 'Template not found' });
        templates[index] = { ...templates[index], ...req.body };
        await saveTemplates(templates);
        res.json(templates[index]);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/generate', async (req, res) => {
    try {
        const request = req.body;
        // In a real app, we might hydrate the template from ID here
        if (typeof request.template === 'string') {
            const templates = await getTemplates();
            const tpl = templates.find(t => t.id === request.template);
            if (!tpl)
                return res.status(404).json({ error: 'Template not found' });
            request.template = tpl;
        }
        const access = req.accessContext;
        const artifact = await reportingService.generate(request, access);
        res.setHeader('Content-Type', artifact.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${artifact.fileName}"`);
        // Add custom headers for metadata
        if (artifact.metadata) {
            res.setHeader('X-Report-Version', artifact.metadata.versionId);
        }
        res.send(artifact.buffer);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/schedule', async (req, res) => {
    try {
        const { name, cron, request } = req.body;
        if (!name || !cron || !request) {
            return res.status(400).json({ error: 'Missing required fields: name, cron, request' });
        }
        const reportRequest = { ...request };
        // Hydrate template if it is an ID string
        // This ensures the worker receives a full template object (snapshot)
        if (typeof reportRequest.template === 'string') {
            const templates = await getTemplates();
            const tpl = templates.find(t => t.id === reportRequest.template);
            if (!tpl)
                return res.status(404).json({ error: 'Template not found' });
            reportRequest.template = tpl;
        }
        // Use BatchJobService to schedule the report using the correct method signature
        await BatchJobService_js_1.default.scheduleReport(name, cron, { request: reportRequest, userId: req.accessContext.userId });
        res.status(201).json({ message: 'Report scheduled', reportName: name });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/history/:templateId', (req, res) => {
    const history = reportingService.history(req.params.templateId);
    res.json(history);
});
exports.default = router;
