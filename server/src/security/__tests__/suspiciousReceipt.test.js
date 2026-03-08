"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const suspiciousReceipt_js_1 = require("../suspiciousReceipt.js");
(0, globals_1.describe)('Suspicious Payload Detection', () => {
    const normalPayload = {
        receiptId: '123',
        amount: 100,
        currency: 'USD',
        items: ['item1', 'item2'],
        description: 'Normal receipt'
    };
    (0, globals_1.it)('should not trigger on normal payload', () => {
        const result = (0, suspiciousReceipt_js_1.detectSuspiciousPayload)(normalPayload);
        (0, globals_1.expect)(result).toBeNull();
    });
    (0, globals_1.it)('should detect extreme amounts', () => {
        const suspiciousPayload = {
            ...normalPayload,
            amount: suspiciousReceipt_js_1.HEURISTIC_CONFIG.MAX_AMOUNT + 1
        };
        const result = (0, suspiciousReceipt_js_1.detectSuspiciousPayload)(suspiciousPayload);
        (0, globals_1.expect)(result).toEqual({
            isSuspicious: true,
            reason: "Extreme amount detected in field 'amount'",
            details: { key: 'amount', value: suspiciousReceipt_js_1.HEURISTIC_CONFIG.MAX_AMOUNT + 1, threshold: suspiciousReceipt_js_1.HEURISTIC_CONFIG.MAX_AMOUNT }
        });
    });
    (0, globals_1.it)('should detect extreme amounts in nested objects', () => {
        const suspiciousPayload = {
            ...normalPayload,
            meta: {
                pricing: {
                    total: suspiciousReceipt_js_1.HEURISTIC_CONFIG.MAX_AMOUNT + 100
                }
            }
        };
        const result = (0, suspiciousReceipt_js_1.detectSuspiciousPayload)(suspiciousPayload);
        (0, globals_1.expect)(result).toEqual({
            isSuspicious: true,
            reason: "Extreme amount detected in field 'total'",
            details: { key: 'total', value: suspiciousReceipt_js_1.HEURISTIC_CONFIG.MAX_AMOUNT + 100, threshold: suspiciousReceipt_js_1.HEURISTIC_CONFIG.MAX_AMOUNT }
        });
    });
    (0, globals_1.it)('should detect unusual currency codes', () => {
        const suspiciousPayload = {
            ...normalPayload,
            currency: 'XXX'
        };
        const result = (0, suspiciousReceipt_js_1.detectSuspiciousPayload)(suspiciousPayload);
        (0, globals_1.expect)(result).toEqual({
            isSuspicious: true,
            reason: "Unusual currency code detected in field 'currency'",
            details: { key: 'currency', value: 'XXX' }
        });
    });
    (0, globals_1.it)('should detect huge line items', () => {
        const hugeArray = new Array(suspiciousReceipt_js_1.HEURISTIC_CONFIG.MAX_LINE_ITEMS + 1).fill('item');
        const suspiciousPayload = {
            ...normalPayload,
            items: hugeArray
        };
        const result = (0, suspiciousReceipt_js_1.detectSuspiciousPayload)(suspiciousPayload);
        (0, globals_1.expect)(result).toEqual({
            isSuspicious: true,
            reason: 'Huge line items array detected',
            details: { length: suspiciousReceipt_js_1.HEURISTIC_CONFIG.MAX_LINE_ITEMS + 1, threshold: suspiciousReceipt_js_1.HEURISTIC_CONFIG.MAX_LINE_ITEMS }
        });
    });
    (0, globals_1.it)('should detect weird encodings (high non-ASCII ratio)', () => {
        // Construct a string with many non-ASCII characters
        const length = suspiciousReceipt_js_1.HEURISTIC_CONFIG.MAX_STRING_LENGTH + 100;
        // Create a string longer than threshold
        let badString = '';
        for (let i = 0; i < length; i++) {
            // Use a high-byte char
            badString += String.fromCharCode(0xFF);
        }
        const suspiciousPayload = {
            ...normalPayload,
            data: badString
        };
        const result = (0, suspiciousReceipt_js_1.detectSuspiciousPayload)(suspiciousPayload);
        (0, globals_1.expect)(result).toEqual({
            isSuspicious: true,
            reason: 'Suspicious encoding detected (high non-ASCII ratio)',
            details: {
                ratio: 1,
                threshold: suspiciousReceipt_js_1.HEURISTIC_CONFIG.NON_ASCII_THRESHOLD,
                length: length
            }
        });
    });
    (0, globals_1.it)('should not detect weird encodings for short strings', () => {
        // Short string with non-ascii should pass
        const badString = String.fromCharCode(0xFF).repeat(10);
        const result = (0, suspiciousReceipt_js_1.detectSuspiciousPayload)({ data: badString });
        (0, globals_1.expect)(result).toBeNull();
    });
    (0, globals_1.it)('should not trigger on large numbers in unrelated fields (e.g. timestamps)', () => {
        const payload = {
            ...normalPayload,
            created_at: 1700000000, // > 1 billion, but valid timestamp
            someId: 9999999999
        };
        const result = (0, suspiciousReceipt_js_1.detectSuspiciousPayload)(payload);
        (0, globals_1.expect)(result).toBeNull();
    });
});
