"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const expect = (actual) => ({ toBe: (expected) => assert.strictEqual(actual, expected), toContain: (expected) => assert.ok(actual.includes(expected)) });
const claim_state_machine_1 = require("../claim_state_machine");
(0, node_test_1.describe)('updateClaimState', () => {
    (0, node_test_1.it)('updates state to contested if contradicted', () => {
        const claim = {
            claim_id: 'CLAIM:1',
            state: 'new',
            corroboration_count: 0,
            contradiction_count: 1,
            disinfo_risk: 'low',
            last_checked_utc: '2023-01-01',
        };
        const updated = (0, claim_state_machine_1.updateClaimState)(claim);
        expect(updated.state).toBe('contested');
    });
});
