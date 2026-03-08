"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeResults = exports.runAllChecks = void 0;
const path_1 = __importDefault(require("path"));
const supplyChain_js_1 = require("./checks/supplyChain.js");
const ciCd_js_1 = require("./checks/ciCd.js");
const secrets_js_1 = require("./checks/secrets.js");
const iam_js_1 = require("./checks/iam.js");
const kubernetes_js_1 = require("./checks/kubernetes.js");
const network_js_1 = require("./checks/network.js");
const observability_js_1 = require("./checks/observability.js");
const appSecurity_js_1 = require("./checks/appSecurity.js");
const process_js_1 = require("./checks/process.js");
const runAllChecks = (options = {}) => {
    const root = options.rootDir ? path_1.default.resolve(options.rootDir) : process.cwd();
    const now = options.now ?? new Date();
    return [
        ...(0, supplyChain_js_1.runSupplyChainChecks)(root, options.sbomBaselinePath, options.sbomTargetPath),
        ...(0, ciCd_js_1.runCiCdChecks)(root),
        ...(0, secrets_js_1.runSecretsChecks)(root, now, options.rotationThresholdDays),
        ...(0, iam_js_1.runIamChecks)(root),
        ...(0, kubernetes_js_1.runKubernetesChecks)(root),
        ...(0, network_js_1.runNetworkChecks)(root),
        ...(0, observability_js_1.runObservabilityChecks)(root),
        ...(0, appSecurity_js_1.runAppSecurityChecks)(root),
        ...(0, process_js_1.runProcessChecks)(root),
    ];
};
exports.runAllChecks = runAllChecks;
const summarizeResults = (results) => {
    const failures = results.filter((result) => result.status === 'fail');
    const passes = results.filter((result) => result.status === 'pass');
    return {
        total: results.length,
        failures,
        passes,
        score: Math.round(((results.length - failures.length) / Math.max(results.length, 1)) * 100),
    };
};
exports.summarizeResults = summarizeResults;
