"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const index_js_1 = require("../../src/contracts/index.js");
(0, globals_1.describe)('Contracts Serialization', () => {
    (0, globals_1.it)('should serialize ContractError correctly', () => {
        const error = new index_js_1.ContractError('Something went wrong', index_js_1.ErrorCode.VALIDATION_ERROR, { field: 'email' });
        const json = error.toJSON();
        (0, globals_1.expect)(json.name).toBe('ContractError');
        (0, globals_1.expect)(json.message).toBe('Something went wrong');
        (0, globals_1.expect)(json.code).toBe(index_js_1.ErrorCode.VALIDATION_ERROR);
        (0, globals_1.expect)(json.details).toEqual({ field: 'email' });
        (0, globals_1.expect)(json.timestamp).toBeDefined();
    });
    (0, globals_1.it)('should allow valid BaseResponse structure', () => {
        const response = {
            success: true,
            data: 'hello',
            metadata: {
                requestId: '123',
                timestamp: '2023-01-01',
                version: '1.0'
            }
        };
        (0, globals_1.expect)(response.success).toBe(true);
        (0, globals_1.expect)(response.data).toBe('hello');
    });
});
