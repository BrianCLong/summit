"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
exports.listTemplates = listTemplates;
exports.renderReport = renderReport;
// @ts-nocheck
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const express_1 = __importDefault(require("express"));
const authz_1 = require("../../lib/authz");
const templatesDir = path_1.default.join(process.cwd(), 'templates', 'reports');
function listTemplates() {
    return fs_1.default
        .readdirSync(templatesDir)
        .filter((f) => f.endsWith('.json'))
        .map((file) => {
        const manifest = JSON.parse(fs_1.default.readFileSync(path_1.default.join(templatesDir, file), 'utf-8'));
        return { id: manifest.id, version: manifest.version };
    });
}
function renderReport(templateId, format, data) {
    const manifestFile = fs_1.default
        .readdirSync(templatesDir)
        .find((f) => f.startsWith(templateId) && f.endsWith('.json'));
    if (!manifestFile) {
        throw new Error('Template not found');
    }
    const manifestPath = path_1.default.join(templatesDir, manifestFile);
    const manifest = JSON.parse(fs_1.default.readFileSync(manifestPath, 'utf-8'));
    const content = JSON.stringify({ manifest, data });
    const sha256 = crypto_1.default.createHash('sha256').update(content).digest('hex');
    const outputPath = path_1.default.join(process.cwd(), 'uploads');
    if (!fs_1.default.existsSync(outputPath)) {
        fs_1.default.mkdirSync(outputPath, { recursive: true });
    }
    const fileName = `${sha256}.${format}`;
    fs_1.default.writeFileSync(path_1.default.join(outputPath, fileName), content);
    const manifestHash = crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(manifest))
        .digest('hex');
    return {
        url: `/downloads/${fileName}`,
        sha256,
        provenanceBlock: {
            manifestHash,
            generatedAt: new Date().toISOString(),
        },
    };
}
exports.router = express_1.default.Router();
exports.router.use(async (req, res, next) => {
    const action = req.method === 'GET' ? 'graph:query' : 'report:export';
    const decision = await (0, authz_1.checkAuthz)({
        subject: {
            id: req.header('x-subject-id') || 'anonymous',
            roles: (req.header('x-roles') || '').split(',').filter(Boolean),
            tenant: req.header('x-tenant') || 'unknown',
            clearance: req.header('x-clearance') || 'internal',
            mfa: req.header('x-mfa') || 'unknown',
        },
        resource: {
            type: 'report',
            id: req.header('x-resource-id') || 'report',
            tenant: req.header('x-tenant') || 'unknown',
            classification: req.header('x-resource-classification') || 'internal',
        },
        action,
        context: {
            env: req.header('x-env') || 'dev',
            request_ip: req.ip,
            time: new Date().toISOString(),
            risk: req.header('x-risk') || 'elevated',
            reason: req.header('x-reason') || 'report access',
            warrant_id: req.header('x-warrant-id') || undefined,
        },
    });
    if (!decision.allow) {
        return res.status(403).json({ error: 'forbidden', reasons: decision.deny });
    }
    return next();
});
exports.router.get('/reports/templates', (_req, res) => {
    res.json(listTemplates());
});
exports.router.post('/reports/render', (req, res) => {
    const { templateId, format, data } = req.body;
    const result = renderReport(templateId, format, data);
    res.json(result);
});
