"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateSubmission = evaluateSubmission;
const sandbox_js_1 = require("./sandbox.js");
const signer_js_1 = require("./signer.js");
const static_analysis_js_1 = require("./static-analysis.js");
const rating_js_1 = require("./rating.js");
const DEFAULT_SANDBOX_OPTIONS = {
    allowedGlobals: ['Math', 'Date', 'JSON'],
    allowedHosts: [],
    quotas: {
        cpuMs: 100,
        wallClockMs: 200,
        maxOutputSize: 1024,
        maxBufferBytes: 1024 * 64,
    },
};
async function evaluateSubmission(submission, options = {}) {
    const mergedSandboxOptions = {
        ...DEFAULT_SANDBOX_OPTIONS,
        ...options.sandbox,
        quotas: {
            ...DEFAULT_SANDBOX_OPTIONS.quotas,
            ...options.sandbox?.quotas,
        },
        allowedGlobals: options.sandbox?.allowedGlobals ?? DEFAULT_SANDBOX_OPTIONS.allowedGlobals,
        allowedHosts: options.sandbox?.allowedHosts ?? DEFAULT_SANDBOX_OPTIONS.allowedHosts,
    };
    const analysis = (0, static_analysis_js_1.performStaticAnalysis)(submission);
    if (!analysis.passed) {
        return (0, signer_js_1.finalizePipeline)(submission, analysis, {
            status: 'runtime-error',
            error: 'Static analysis rejected the submission',
            logs: [],
            policyVersion: sandbox_js_1.SANDBOX_POLICY_VERSION,
        }, (0, rating_js_1.rateSubmission)(analysis, {
            status: 'runtime-error',
            error: 'Static analysis rejected the submission',
            logs: [],
            policyVersion: sandbox_js_1.SANDBOX_POLICY_VERSION,
        }), { secret: options.signingSecret });
    }
    const sandboxResult = await (0, sandbox_js_1.executeInSandbox)(submission, mergedSandboxOptions);
    const rating = (0, rating_js_1.rateSubmission)(analysis, sandboxResult);
    return (0, signer_js_1.finalizePipeline)(submission, analysis, sandboxResult, rating, { secret: options.signingSecret });
}
