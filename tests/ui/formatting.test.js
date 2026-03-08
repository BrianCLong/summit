"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const formatting_js_1 = require("../../ui/utils/formatting.js");
describe('formatting utilities', () => {
    it('formats absolute times in UTC with optional date and seconds', () => {
        const date = new Date('2024-01-02T03:04:05Z');
        expect((0, formatting_js_1.formatAbsoluteTime)(date)).toBe('2024-01-02 03:04:05 UTC');
        expect((0, formatting_js_1.formatAbsoluteTime)(date, { includeDate: false, includeSeconds: false })).toBe('03:04 UTC');
    });
    it('provides relative time strings', () => {
        const base = new Date('2024-01-02T03:04:35Z');
        expect((0, formatting_js_1.formatRelativeTime)('2024-01-02T03:04:05Z', { base })).toBe('30 seconds ago');
        expect((0, formatting_js_1.formatRelativeTime)('2024-01-02T03:09:35Z', { base })).toBe('in 5 minutes');
    });
    it('formats numeric values consistently', () => {
        expect((0, formatting_js_1.formatNumber)(12345.678)).toBe('12,345.7');
        expect((0, formatting_js_1.formatCurrency)(42)).toBe('$42.00');
        expect((0, formatting_js_1.formatPercent)(3, 12)).toBe('25%');
    });
});
