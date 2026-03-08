"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const policy_engine_1 = require("../src/policy-engine");
it('allows read under S2', () => {
    const p = (0, policy_engine_1.loadPolicy)(path_1.default.join(__dirname, '..', 'policies', 'examples', 'allow-read-low.json'));
    const decision = (0, policy_engine_1.evaluate)(p, { action: 'graph:read', resource: 'node:abc', attributes: { sensitivity: 'S1' } });
    expect(decision.allowed).toBe(true);
});
it('denies export without purpose match', () => {
    const p = (0, policy_engine_1.loadPolicy)(path_1.default.join(__dirname, '..', 'policies', 'examples', 'deny-export-no-purpose.json'));
    const decision = (0, policy_engine_1.evaluate)(p, { action: 'export:bundle', resource: 'case:1', attributes: { purpose: 'internal' } });
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toMatch(/requires declared audience/);
});
