"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const samples_js_1 = require("../../../test/fixtures/golden/samples.js");
const index_js_1 = require("../src/index.js");
const fixturePath = path_1.default.resolve(__dirname, '../../../test/fixtures/golden/policy_decision_v0_1.json');
describe('policy decision serialization', () => {
    it('emits a stable, canonical JSON representation', () => {
        const decision = (0, samples_js_1.buildSamplePolicyDecision)();
        const serialized = (0, index_js_1.serializePolicyDecision)(decision);
        const fixture = (0, fs_1.readFileSync)(fixturePath, 'utf-8').trim();
        expect(serialized).toBe(fixture);
    });
    it('fails loudly when decision surface changes', () => {
        const decision = (0, samples_js_1.buildSamplePolicyDecision)();
        decision.reasons.push({
            clause: {
                id: 'license-3-clause-1',
                type: 'RETENTION',
                description: 'Retention requires audit trail',
                enforcementLevel: 'SOFT',
                constraints: { retentionDays: 30 },
            },
            licenseId: 'license-3',
            impact: 'INFO',
            explanation: 'New retention requirement',
            suggestedAction: 'capture-audit-log',
        });
        const serialized = (0, index_js_1.serializePolicyDecision)(decision);
        const fixture = (0, fs_1.readFileSync)(fixturePath, 'utf-8').trim();
        expect(serialized).not.toBe(fixture);
    });
});
