"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const harness_js_1 = require("../../src/lib/chaos/harness.js");
const ChaosHttpClient_js_1 = require("../../src/lib/chaos/ChaosHttpClient.js");
const evidenceRecords = [];
const evidencePath = process.env.CHAOS_EVIDENCE_OUTPUT;
const resolveEvidencePath = (outputPath) => {
    if (path_1.default.isAbsolute(outputPath)) {
        return outputPath;
    }
    if (outputPath.startsWith('evidence/') &&
        process.cwd().endsWith(`${path_1.default.sep}server`)) {
        return path_1.default.resolve(process.cwd(), '..', outputPath);
    }
    return path_1.default.resolve(process.cwd(), outputPath);
};
const plainAxiosAdapter = (config) => {
    return Promise.resolve({
        data: { success: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: config,
        request: {},
    });
};
const runbookSteps = {
    opaOutage: [
        'runbook/opa-outage/notify-security',
        'runbook/opa-outage/disable-privileged-ops',
        'runbook/opa-outage/escalate-to-governance',
    ],
    signerOutage: [
        'runbook/signer-outage/notify-security',
        'runbook/signer-outage/hold-privileged-ops',
        'runbook/signer-outage/queue-retry',
    ],
};
const executeRunbookSteps = (steps, log) => {
    steps.forEach((step) => log.push(step));
};
const createPrivilegedOperation = () => {
    const opaClient = new ChaosHttpClient_js_1.ChaosHttpClient(axios_1.default.create({ adapter: plainAxiosAdapter }), 'opa-policy');
    const signerClient = new ChaosHttpClient_js_1.ChaosHttpClient(axios_1.default.create({ adapter: plainAxiosAdapter }), 'signer-service');
    return async () => {
        const runbookLog = [];
        try {
            await opaClient.getClient().post('/v1/data/intelgraph/allow', {
                input: { action: 'privileged.execute', user: { id: 'root' } },
            });
        }
        catch (error) {
            executeRunbookSteps(runbookSteps.opaOutage, runbookLog);
            return { allowed: false, failureMode: 'opa-outage', runbookSteps: runbookLog };
        }
        try {
            await signerClient.getClient().post('/v1/sign', {
                payload: 'privileged-op',
            });
        }
        catch (error) {
            executeRunbookSteps(runbookSteps.signerOutage, runbookLog);
            return { allowed: false, failureMode: 'signer-outage', runbookSteps: runbookLog };
        }
        return { allowed: true, runbookSteps: runbookLog };
    };
};
(0, globals_1.describe)('Chaos Scenario: signer + OPA outages for privileged operations', () => {
    (0, globals_1.beforeEach)(() => {
        harness_js_1.ChaosHarness.getInstance().reset();
    });
    (0, globals_1.afterAll)(() => {
        if (!evidencePath) {
            return;
        }
        const output = {
            runId: `chaos-privileged-ops-${Date.now()}`,
            recordedAt: new Date().toISOString(),
            scenarios: evidenceRecords,
        };
        const resolvedPath = resolveEvidencePath(evidencePath);
        fs_1.default.mkdirSync(path_1.default.dirname(resolvedPath), { recursive: true });
        fs_1.default.writeFileSync(resolvedPath, JSON.stringify(output, null, 2));
    });
    (0, globals_1.it)('fails closed when OPA is unavailable and executes the OPA outage runbook', async () => {
        harness_js_1.ChaosHarness.getInstance().setConfig('opa-policy', {
            mode: 'error',
            errorRate: 1.0,
            errorType: '503',
        });
        const operation = createPrivilegedOperation();
        const result = await operation();
        (0, globals_1.expect)(result.allowed).toBe(false);
        (0, globals_1.expect)(result.failureMode).toBe('opa-outage');
        (0, globals_1.expect)(result.runbookSteps).toEqual(runbookSteps.opaOutage);
        evidenceRecords.push({
            scenario: 'opa-outage',
            allowed: result.allowed,
            failureMode: result.failureMode,
            runbookSteps: result.runbookSteps,
            recordedAt: new Date().toISOString(),
        });
    });
    (0, globals_1.it)('fails closed when the signer is unavailable and executes the signer outage runbook', async () => {
        harness_js_1.ChaosHarness.getInstance().setConfig('signer-service', {
            mode: 'error',
            errorRate: 1.0,
            errorType: '503',
        });
        const operation = createPrivilegedOperation();
        const result = await operation();
        (0, globals_1.expect)(result.allowed).toBe(false);
        (0, globals_1.expect)(result.failureMode).toBe('signer-outage');
        (0, globals_1.expect)(result.runbookSteps).toEqual(runbookSteps.signerOutage);
        evidenceRecords.push({
            scenario: 'signer-outage',
            allowed: result.allowed,
            failureMode: result.failureMode,
            runbookSteps: result.runbookSteps,
            recordedAt: new Date().toISOString(),
        });
    });
});
