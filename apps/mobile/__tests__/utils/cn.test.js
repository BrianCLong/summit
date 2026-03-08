"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cn_1 = require("../../src/utils/cn");
describe('cn utility', () => {
    it('merges class names correctly', () => {
        const result = (0, cn_1.cn)('class1', 'class2');
        expect(result).toBe('class1 class2');
    });
    it('handles conditional classes', () => {
        const result = (0, cn_1.cn)('always', true && 'conditional', false && 'hidden');
        expect(result).toBe('always conditional');
    });
    it('handles undefined values', () => {
        const result = (0, cn_1.cn)('class1', undefined, 'class2');
        expect(result).toBe('class1 class2');
    });
    it('handles null values', () => {
        const result = (0, cn_1.cn)('class1', null, 'class2');
        expect(result).toBe('class1 class2');
    });
    it('merges tailwind classes correctly', () => {
        const result = (0, cn_1.cn)('px-2 py-1', 'px-4');
        expect(result).toBe('py-1 px-4');
    });
    it('handles arrays of classes', () => {
        const result = (0, cn_1.cn)(['class1', 'class2']);
        expect(result).toBe('class1 class2');
    });
    it('handles objects with boolean values', () => {
        const result = (0, cn_1.cn)({ active: true, disabled: false });
        expect(result).toBe('active');
    });
    it('handles empty input', () => {
        const result = (0, cn_1.cn)();
        expect(result).toBe('');
    });
    it('handles mixed input types', () => {
        const result = (0, cn_1.cn)('base', { active: true }, ['extra'], undefined);
        expect(result).toBe('base active extra');
    });
});
