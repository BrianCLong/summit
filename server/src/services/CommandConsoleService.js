"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandConsoleService = void 0;
// @ts-nocheck
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const GAReleaseService_js_1 = require("./GAReleaseService.js");
class CommandConsoleService {
    gaService = new GAReleaseService_js_1.GAReleaseService();
    async getSnapshot() {
        const [gaGate, ci, dependencyRisk, evidence, tenants, slo, llm,] = await Promise.all([
            this.getGAGateStatus(),
            this.getCIStatus(),
            this.getDependencyRiskSummary(),
            this.getEvidenceStatus(),
            this.getTenantSnapshot(),
            this.getSLOStatus(),
            this.getLLMUsage(),
        ]);
        const incidents = this.buildIncidents(gaGate, tenants);
        return {
            generatedAt: new Date().toISOString(),
            gaGate,
            ci,
            slo,
            llm,
            dependencyRisk,
            evidence,
            tenants,
            incidents,
        };
    }
    async getGAGateStatus() {
        try {
            const [releaseInfo, deployment] = await Promise.all([
                this.gaService.getReleaseInfo(),
                this.gaService.validateDeployment(),
            ]);
            const missing = this.getMissingDependencies();
            const lastRun = this.getArtifactTimestamp([
                'final_validation.json',
                'final_validation_phase3.py',
            ]);
            const details = deployment.validations?.map((v) => ({
                component: v.component,
                status: v.status,
                message: v.message,
            })) ?? [];
            if (missing.length > 0) {
                details.push(...missing.map((item) => ({
                    component: item,
                    status: 'fail',
                    message: `${item} not detected`,
                })));
            }
            return {
                overall: deployment.ready && missing.length === 0 ? 'pass' : 'fail',
                lastRun: lastRun ?? releaseInfo.buildDate,
                missing,
                details,
            };
        }
        catch (error) {
            return {
                overall: 'unknown',
                lastRun: new Date().toISOString(),
                details: [
                    {
                        component: 'ga-release-service',
                        status: 'fail',
                        message: error instanceof Error ? error.message : 'Unknown GA gate error',
                    },
                ],
            };
        }
    }
    getMissingDependencies() {
        const missing = [];
        const appPath = path_1.default.join(process.cwd(), 'apps', 'command-console');
        if (!fs_1.default.existsSync(appPath)) {
            missing.push('command-console-app');
        }
        const routeCandidates = [
            path_1.default.join(process.cwd(), 'server', 'src', 'routes', 'internal', 'command-console.js'),
            path_1.default.join(process.cwd(), 'server', 'dist', 'routes', 'internal', 'command-console.js'),
        ];
        if (!routeCandidates.some((candidate) => fs_1.default.existsSync(candidate))) {
            missing.push('command-console-endpoints');
        }
        return missing;
    }
    async getCIStatus() {
        const ciStatusFile = this.readJsonIfExists([
            path_1.default.join(process.cwd(), 'status', 'ci.json'),
            path_1.default.join(process.cwd(), 'reports', 'ci-status.json'),
        ]);
        let commit = 'unknown';
        try {
            commit = (0, child_process_1.execSync)('git rev-parse --short HEAD', {
                encoding: 'utf8',
            }).trim();
        }
        catch {
            commit = 'unknown';
        }
        return {
            branch: ciStatusFile?.branch ?? 'main',
            status: ciStatusFile?.status ?? 'warning',
            commit,
            url: ciStatusFile?.url,
            updatedAt: ciStatusFile?.updatedAt ?? new Date().toISOString(),
        };
    }
    getSLOStatus() {
        const compliance = Number(process.env.SLO_COMPLIANCE ?? '0.987');
        const burnRate = Number(process.env.SLO_BURN_RATE ?? '0.65');
        const budget = Math.max(0, 1 - burnRate / 100);
        return {
            compliance,
            window: process.env.SLO_WINDOW ?? '30d',
            errorBudgetRemaining: budget,
            burnRate,
        };
    }
    getLLMUsage() {
        const tenants = [
            {
                tenantId: 'acme',
                tokens: Number(process.env.LLM_ACME_TOKENS ?? '120000'),
                cost: Number(process.env.LLM_ACME_COST ?? '42.5'),
                rateLimitStatus: 'normal',
            },
            {
                tenantId: 'globex',
                tokens: Number(process.env.LLM_GLOBEX_TOKENS ?? '76000'),
                cost: Number(process.env.LLM_GLOBEX_COST ?? '24.1'),
                rateLimitStatus: 'constrained',
            },
        ];
        const aggregateTokens = tenants.reduce((sum, t) => sum + t.tokens, 0);
        const aggregateCost = tenants.reduce((sum, t) => sum + t.cost, 0);
        return {
            aggregate: {
                tokens: aggregateTokens,
                cost: aggregateCost,
                window: '7d',
            },
            tenants,
        };
    }
    async getDependencyRiskSummary() {
        const dependencyReport = this.readJsonIfExists([
            path_1.default.join(process.cwd(), 'DEPENDENCY_HEALTH_CHECK.json'),
            path_1.default.join(process.cwd(), 'DEPENDENCY_HEALTH_CHECK_SUMMARY.json'),
        ]);
        return {
            level: dependencyReport?.level ?? 'warning',
            issues: dependencyReport?.issues ?? 3,
            lastScan: dependencyReport?.lastScan ?? new Date().toISOString(),
            topRisks: dependencyReport?.topRisks ?? [
                'outdated-core-library',
                'missing-sbom-scan',
                'pinned-dev-dependency',
            ],
        };
    }
    async getEvidenceStatus() {
        const manifestPath = path_1.default.join(process.cwd(), 'EVIDENCE_BUNDLE.manifest.json');
        if (fs_1.default.existsSync(manifestPath)) {
            try {
                const content = await fs_1.default.promises.readFile(manifestPath, 'utf8');
                const manifest = JSON.parse(content);
                return {
                    latestBundle: manifest.bundleId ?? 'latest',
                    status: 'pass',
                    artifacts: Array.isArray(manifest.artifacts)
                        ? manifest.artifacts.length
                        : 0,
                    lastGeneratedAt: manifest.generatedAt ?? this.getFileTimestamp(manifestPath),
                };
            }
            catch {
                // fall through to default
            }
        }
        return {
            latestBundle: 'not-found',
            status: 'warning',
            artifacts: 0,
            lastGeneratedAt: new Date().toISOString(),
        };
    }
    async getTenantSnapshot() {
        const killSwitchActive = (process.env.SAFETY_KILL_SWITCH ?? 'false').toLowerCase() === 'true';
        return [
            {
                tenantId: 'acme',
                active: true,
                rateLimit: '8r/s',
                ingestionCap: '5k records/hr',
                killSwitch: killSwitchActive,
            },
            {
                tenantId: 'globex',
                active: true,
                rateLimit: '5r/s',
                ingestionCap: '2k records/hr',
                killSwitch: false,
            },
            {
                tenantId: 'summit-internal',
                active: true,
                rateLimit: 'unbounded',
                ingestionCap: 'observability-only',
                killSwitch: false,
            },
        ];
    }
    buildIncidents(gaGate, tenants) {
        const gaFailures = gaGate.details
            ?.filter((d) => d.status === 'fail')
            .map((d, index) => ({
            id: `ga-${index}`,
            message: `${d.component}: ${d.message}`,
            occurredAt: gaGate.lastRun,
        })) ?? [];
        const policyDenials = [
            {
                id: 'policy-llm-0',
                scope: 'llm-safety',
                occurredAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            },
        ];
        const killSwitchActivations = tenants
            .filter((t) => t.killSwitch)
            .map((tenant) => ({
            id: `kill-${tenant.tenantId}`,
            tenantId: tenant.tenantId,
            occurredAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        }));
        return { gaGateFailures: gaFailures, policyDenials, killSwitchActivations };
    }
    readJsonIfExists(pathsToTry) {
        for (const p of pathsToTry) {
            if (fs_1.default.existsSync(p)) {
                try {
                    return JSON.parse(fs_1.default.readFileSync(p, 'utf8'));
                }
                catch {
                    return null;
                }
            }
        }
        return null;
    }
    getArtifactTimestamp(pathsToTry) {
        for (const candidate of pathsToTry) {
            const full = path_1.default.join(process.cwd(), candidate);
            if (fs_1.default.existsSync(full)) {
                return this.getFileTimestamp(full);
            }
        }
        return null;
    }
    getFileTimestamp(filePath) {
        const stats = fs_1.default.statSync(filePath);
        return stats.mtime.toISOString();
    }
}
exports.CommandConsoleService = CommandConsoleService;
