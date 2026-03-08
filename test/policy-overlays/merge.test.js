"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const merge_js_1 = __importDefault(require("../../server/src/policy/overlays/merge.js"));
describe('mergePolicyOverlay', () => {
    const basePolicy = {
        rules: [
            { id: 'allow-read', effect: 'allow', description: 'Allow read access' },
            { id: 'deny-delete', effect: 'deny', description: 'Deny delete operations' },
        ],
    };
    const baseRef = { id: 'global-default', version: '1.0.0' };
    it('applies override patches while preserving base ordering', () => {
        const overlay = {
            tenantId: 'acme',
            base: baseRef,
            patches: [
                {
                    op: 'override',
                    ruleId: 'deny-delete',
                    rule: { id: 'deny-delete', effect: 'deny', description: 'Scoped delete denial' },
                },
            ],
        };
        const merged = (0, merge_js_1.default)(basePolicy, overlay);
        expect(merged.rules).toEqual([
            { id: 'allow-read', effect: 'allow', description: 'Allow read access' },
            { id: 'deny-delete', effect: 'deny', description: 'Scoped delete denial' },
        ]);
    });
    it('supports removing rules from the base policy', () => {
        const overlay = {
            tenantId: 'acme',
            base: baseRef,
            patches: [
                {
                    op: 'remove',
                    ruleId: 'deny-delete',
                },
            ],
        };
        const merged = (0, merge_js_1.default)(basePolicy, overlay);
        expect(merged.rules).toEqual([{ id: 'allow-read', effect: 'allow', description: 'Allow read access' }]);
    });
    it('is deterministic for identical input', () => {
        const overlay = {
            tenantId: 'acme',
            base: baseRef,
            patches: [
                { op: 'append', ruleId: 'allow-export', rule: { id: 'allow-export', effect: 'allow' } },
                { op: 'override', ruleId: 'allow-read', rule: { id: 'allow-read', effect: 'allow', description: 'Updated read' } },
                { op: 'remove', ruleId: 'deny-delete' },
            ],
        };
        const first = (0, merge_js_1.default)(basePolicy, overlay);
        const second = (0, merge_js_1.default)(basePolicy, overlay);
        expect(first).toEqual(second);
        expect(first.rules).toEqual([
            { id: 'allow-read', effect: 'allow', description: 'Updated read' },
            { id: 'allow-export', effect: 'allow' },
        ]);
    });
});
