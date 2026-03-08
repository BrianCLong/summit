"use strict";
/**
 * MDM Service
 * RESTful API service for Master Data Management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mdm_core_1 = require("@intelgraph/mdm-core");
const reference_data_1 = require("@intelgraph/reference-data");
const hierarchy_management_1 = require("@intelgraph/hierarchy-management");
const mdm_sync_1 = require("@intelgraph/mdm-sync");
const mdm_stewardship_1 = require("@intelgraph/mdm-stewardship");
const mdm_governance_1 = require("@intelgraph/mdm-governance");
const mdm_analytics_1 = require("@intelgraph/mdm-analytics");
const app = (0, express_1.default)();
const PORT = process.env.MDM_SERVICE_PORT || 3100;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Initialize engines
const mdmEngine = new mdm_core_1.MDMEngine();
const matchingEngine = new mdm_core_1.MatchingEngine();
const qualityEngine = new mdm_core_1.QualityEngine();
const refDataManager = new reference_data_1.ReferenceDataManager();
const hierarchyBuilder = new hierarchy_management_1.HierarchyBuilder();
const syncEngine = new mdm_sync_1.SyncEngine();
const stewardshipManager = new mdm_stewardship_1.StewardshipWorkflowManager();
const governanceEngine = new mdm_governance_1.GovernanceEngine();
const analyticsEngine = new mdm_analytics_1.AnalyticsEngine();
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'mdm-service', timestamp: new Date() });
});
// Master Records API
app.post('/api/v1/master-records', async (req, res) => {
    try {
        const { domain, sourceRecords, survivorshipRules } = req.body;
        const masterRecord = await mdmEngine.createGoldenRecord(domain, sourceRecords, survivorshipRules);
        res.json(masterRecord);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/master-records/:id', async (req, res) => {
    try {
        const record = await mdmEngine.getMasterRecord(req.params.id);
        if (record) {
            res.json(record);
        }
        else {
            res.status(404).json({ error: 'Master record not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/master-records/:id/certify', async (req, res) => {
    try {
        const { status, certifiedBy } = req.body;
        const record = await mdmEngine.certifyRecord(req.params.id, status, certifiedBy);
        res.json(record);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Matching API
app.post('/api/v1/matching/match', async (req, res) => {
    try {
        const { record1, record2, config } = req.body;
        const result = await matchingEngine.matchRecords(record1, record2, config);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/matching/batch', async (req, res) => {
    try {
        const { records, config } = req.body;
        const results = await matchingEngine.findMatches(records, config);
        res.json({ matches: results });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Quality API
app.post('/api/v1/quality/assess', async (req, res) => {
    try {
        const { recordId, domain, data, rules } = req.body;
        const profile = await qualityEngine.assessQuality(recordId, domain, data, rules);
        res.json(profile);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Reference Data API
app.post('/api/v1/reference-data/code-lists', async (req, res) => {
    try {
        const { name, description, domain, codes, owner } = req.body;
        const codeList = await refDataManager.createCodeList(name, description, domain, codes, owner);
        res.json(codeList);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/reference-data/code-lists/:id', async (req, res) => {
    try {
        const codeList = await refDataManager.getCodeList(req.params.id);
        if (codeList) {
            res.json(codeList);
        }
        else {
            res.status(404).json({ error: 'Code list not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/reference-data/lookup/:tableName', async (req, res) => {
    try {
        const result = await refDataManager.lookup(req.params.tableName, req.query);
        if (result) {
            res.json(result);
        }
        else {
            res.status(404).json({ error: 'No match found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Hierarchy API
app.post('/api/v1/hierarchies', async (req, res) => {
    try {
        const { name, description, domain, hierarchyType } = req.body;
        const hierarchy = await hierarchyBuilder.createHierarchy(name, description, domain, hierarchyType);
        res.json(hierarchy);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/hierarchies/:id', async (req, res) => {
    try {
        const hierarchy = await hierarchyBuilder.getHierarchy(req.params.id);
        if (hierarchy) {
            res.json(hierarchy);
        }
        else {
            res.status(404).json({ error: 'Hierarchy not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Sync API
app.post('/api/v1/sync/configurations', async (req, res) => {
    try {
        await syncEngine.registerConfiguration(req.body);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/sync/:configId/start', async (req, res) => {
    try {
        const job = await syncEngine.startSync(req.params.configId);
        res.json(job);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/sync/jobs/:jobId', async (req, res) => {
    try {
        const job = await syncEngine.getJob(req.params.jobId);
        if (job) {
            res.json(job);
        }
        else {
            res.status(404).json({ error: 'Job not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Stewardship API
app.post('/api/v1/stewardship/workflows', async (req, res) => {
    try {
        const { name, workflowType, domain, assignedTo, createdBy } = req.body;
        const workflow = await stewardshipManager.createWorkflow(name, workflowType, domain, assignedTo, createdBy);
        res.json(workflow);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/stewardship/workflows/user/:userId', async (req, res) => {
    try {
        const workflows = await stewardshipManager.getWorkflowsForUser(req.params.userId);
        res.json({ workflows });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Governance API
app.post('/api/v1/governance/audit', async (req, res) => {
    try {
        const { user, action, resourceType, resourceId, changes } = req.body;
        const log = await governanceEngine.logAudit(user, action, resourceType, resourceId, changes);
        res.json(log);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/v1/governance/compliance/:domain/report', async (req, res) => {
    try {
        const { period = 'monthly' } = req.query;
        const report = await governanceEngine.generateComplianceReport(req.params.domain, String(period));
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Analytics API
app.post('/api/v1/analytics/dashboards', async (req, res) => {
    try {
        const { name, domain, widgets } = req.body;
        const dashboard = await analyticsEngine.createDashboard(name, domain, widgets);
        res.json(dashboard);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/v1/analytics/reports', async (req, res) => {
    try {
        const { name, reportType, domain, period } = req.body;
        const report = await analyticsEngine.generateReport(name, reportType, domain, period);
        res.json(report);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`MDM Service running on port ${PORT}`);
});
exports.default = app;
