"use strict";
// @ts-nocheck
/**
 * Summit Policy Validation Engine (PVE)
 *
 * OPA-driven governance and invariant enforcement for Summit.
 *
 * @module @intelgraph/pve
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.getChangedLines = exports.toPRFile = exports.parseDiff = exports.createPRValidator = exports.PRValidator = exports.createOPAAdapter = exports.OPAAdapter = exports.formatResults = exports.aggregateResults = exports.info = exports.warn = exports.fail = exports.pass = exports.PolicyResultBuilder = exports.PolicyViolationError = exports.createPolicyEngine = exports.PolicyEngine = void 0;
exports.validate = validate;
exports.assertValid = assertValid;
// Core exports
__exportStar(require("./types/index.js"), exports);
__exportStar(require("./evaluator/index.js"), exports);
__exportStar(require("./github/index.js"), exports);
__exportStar(require("./utils/index.js"), exports);
// Convenience re-exports
var PolicyEngine_js_1 = require("./evaluator/PolicyEngine.js");
Object.defineProperty(exports, "PolicyEngine", { enumerable: true, get: function () { return PolicyEngine_js_1.PolicyEngine; } });
Object.defineProperty(exports, "createPolicyEngine", { enumerable: true, get: function () { return PolicyEngine_js_1.createPolicyEngine; } });
Object.defineProperty(exports, "PolicyViolationError", { enumerable: true, get: function () { return PolicyEngine_js_1.PolicyViolationError; } });
var PolicyResult_js_1 = require("./evaluator/PolicyResult.js");
Object.defineProperty(exports, "PolicyResultBuilder", { enumerable: true, get: function () { return PolicyResult_js_1.PolicyResultBuilder; } });
Object.defineProperty(exports, "pass", { enumerable: true, get: function () { return PolicyResult_js_1.pass; } });
Object.defineProperty(exports, "fail", { enumerable: true, get: function () { return PolicyResult_js_1.fail; } });
Object.defineProperty(exports, "warn", { enumerable: true, get: function () { return PolicyResult_js_1.warn; } });
Object.defineProperty(exports, "info", { enumerable: true, get: function () { return PolicyResult_js_1.info; } });
Object.defineProperty(exports, "aggregateResults", { enumerable: true, get: function () { return PolicyResult_js_1.aggregateResults; } });
Object.defineProperty(exports, "formatResults", { enumerable: true, get: function () { return PolicyResult_js_1.formatResults; } });
var OPAAdapter_js_1 = require("./evaluator/OPAAdapter.js");
Object.defineProperty(exports, "OPAAdapter", { enumerable: true, get: function () { return OPAAdapter_js_1.OPAAdapter; } });
Object.defineProperty(exports, "createOPAAdapter", { enumerable: true, get: function () { return OPAAdapter_js_1.createOPAAdapter; } });
var pull_request_validator_js_1 = require("./github/pull-request-validator.js");
Object.defineProperty(exports, "PRValidator", { enumerable: true, get: function () { return pull_request_validator_js_1.PRValidator; } });
Object.defineProperty(exports, "createPRValidator", { enumerable: true, get: function () { return pull_request_validator_js_1.createPRValidator; } });
var diff_parser_js_1 = require("./github/diff-parser.js");
Object.defineProperty(exports, "parseDiff", { enumerable: true, get: function () { return diff_parser_js_1.parseDiff; } });
Object.defineProperty(exports, "toPRFile", { enumerable: true, get: function () { return diff_parser_js_1.toPRFile; } });
Object.defineProperty(exports, "getChangedLines", { enumerable: true, get: function () { return diff_parser_js_1.getChangedLines; } });
// Version
exports.VERSION = '0.1.0';
/**
 * Quick validation helper
 */
async function validate(input, options) {
    const engine = createPolicyEngine();
    return engine.evaluate(input, options);
}
/**
 * Quick assertion helper - throws if validation fails
 */
async function assertValid(input, options) {
    const engine = createPolicyEngine();
    return engine.assertAll(input, options);
}
