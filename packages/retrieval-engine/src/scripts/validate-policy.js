"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const validator_js_1 = require("../policy/validator.js");
const path_1 = __importDefault(require("path"));
const policyPath = process.argv[2] || path_1.default.join(process.cwd(), '../../policies/retrieval.gates.yaml');
try {
    console.log(`Validating policy at: ${policyPath}`);
    const policy = (0, validator_js_1.validatePolicyFile)(policyPath);
    console.log('Policy is valid.');
    console.log(JSON.stringify(policy, null, 2));
    process.exit(0);
}
catch (error) {
    console.error('Policy validation failed:', error);
    process.exit(1);
}
