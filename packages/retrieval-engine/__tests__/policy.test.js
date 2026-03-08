"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const validator_js_1 = require("../src/policy/validator.js");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('Policy Validator', () => {
    const tempPolicyPath = path_1.default.join(process.cwd(), 'temp_test_policy.yaml');
    (0, globals_1.afterAll)(() => {
        if (fs_1.default.existsSync(tempPolicyPath)) {
            fs_1.default.unlinkSync(tempPolicyPath);
        }
    });
    (0, globals_1.it)('should validate a correct policy file', () => {
        const validYaml = `
version: 1
gates:
  ingest:
    require:
      - valid: true
  execution:
    require: []
  evidence:
    require: []
`;
        fs_1.default.writeFileSync(tempPolicyPath, validYaml);
        const policy = (0, validator_js_1.validatePolicyFile)(tempPolicyPath);
        (0, globals_1.expect)(policy.version).toBe(1);
        (0, globals_1.expect)(policy.gates.ingest.require).toBeDefined();
    });
    (0, globals_1.it)('should throw on invalid schema', () => {
        const invalidYaml = `
version: 1
gates:
  ingest: "not an object"
`;
        fs_1.default.writeFileSync(tempPolicyPath, invalidYaml);
        (0, globals_1.expect)(() => (0, validator_js_1.validatePolicyFile)(tempPolicyPath)).toThrow();
    });
});
