"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const node_path_1 = require("node:path");
const node_url_1 = require("node:url");
const loadPolicy_1 = require("../../policy/loadPolicy");
const loader_1 = require("../../loader");
const validate_1 = require("../validate");
const baseDir = (0, node_path_1.dirname)((0, node_url_1.fileURLToPath)(import.meta.url));
const policyPath = (0, node_path_1.resolve)(baseDir, '..', '..', '..', 'policy', 'default.policy.yaml');
const fixturesDir = (0, node_path_1.resolve)(baseDir, '..', '__fixtures__');
const examplesDir = (0, node_path_1.resolve)(baseDir, '..', '..', '..', '..', 'procedures', 'examples');
(0, node_test_1.default)('valid procedure passes policy checks', async () => {
    const policy = await (0, loadPolicy_1.loadPolicyFromFile)(policyPath);
    const procedure = await (0, loader_1.loadProcedureFromFile)((0, node_path_1.resolve)(examplesDir, 'basic-investigation.yaml'));
    strict_1.default.doesNotThrow(() => (0, validate_1.validateProcedure)(procedure, policy));
});
(0, node_test_1.default)('rejects export to non-allowlisted destination', async () => {
    const policy = await (0, loadPolicy_1.loadPolicyFromFile)(policyPath);
    const procedure = await (0, loader_1.loadProcedureFromFile)((0, node_path_1.resolve)(fixturesDir, 'abuse-egress.yaml'));
    strict_1.default.throws(() => (0, validate_1.validateProcedure)(procedure, policy), (error) => error instanceof validate_1.ProcedureValidationError &&
        error.code === 'POLICY_EXPORT_DESTINATION_DENIED');
});
(0, node_test_1.default)('rejects smart-chaining adjacency', async () => {
    const policy = await (0, loadPolicy_1.loadPolicyFromFile)(policyPath);
    const procedure = await (0, loader_1.loadProcedureFromFile)((0, node_path_1.resolve)(fixturesDir, 'abuse-smart-chain.yaml'));
    strict_1.default.throws(() => (0, validate_1.validateProcedure)(procedure, policy), (error) => error instanceof validate_1.ProcedureValidationError &&
        error.code === 'POLICY_FORBIDDEN_ADJACENCY');
});
(0, node_test_1.default)('rejects schema injection payloads', async () => {
    const policy = await (0, loadPolicy_1.loadPolicyFromFile)(policyPath);
    const procedure = await (0, loader_1.loadProcedureFromFile)((0, node_path_1.resolve)(fixturesDir, 'abuse-injection.yaml'));
    strict_1.default.throws(() => (0, validate_1.validateProcedure)(procedure, policy), (error) => error instanceof validate_1.ProcedureValidationError &&
        error.code === 'SCHEMA_INVALID');
});
