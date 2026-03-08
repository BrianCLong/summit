"use strict";
/**
 * Tests for validation middleware
 */
Object.defineProperty(exports, "__esModule", { value: true });
const validation_js_1 = require("../validation.js");
const globals_1 = require("@jest/globals");
const request_factory_js_1 = require("../../../tests/mocks/request-factory.js");
(0, globals_1.describe)('Validation Middleware', () => {
    (0, globals_1.describe)('validateRequest', () => {
        (0, globals_1.describe)('required fields', () => {
            (0, globals_1.it)('should pass when required field is present', () => {
                const schema = { name: { required: true } };
                const req = (0, request_factory_js_1.requestFactory)({ body: { name: 'Test' } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(next).toHaveBeenCalled();
                (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject when required field is missing', () => {
                const schema = { name: { required: true } };
                const req = (0, request_factory_js_1.requestFactory)({ body: {} });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
                (0, globals_1.expect)(res.json).toHaveBeenCalledWith({
                    error: 'Missing required field: name',
                });
                (0, globals_1.expect)(next).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject when required field is null', () => {
                const schema = { name: { required: true } };
                const req = (0, request_factory_js_1.requestFactory)({ body: { name: null } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
                (0, globals_1.expect)(next).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject when required field is empty string', () => {
                const schema = { name: { required: true } };
                const req = (0, request_factory_js_1.requestFactory)({ body: { name: '' } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
                (0, globals_1.expect)(next).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('minLength validation', () => {
            (0, globals_1.it)('should pass when string meets minLength', () => {
                const schema = { password: { minLength: 8 } };
                const req = (0, request_factory_js_1.requestFactory)({ body: { password: 'longpassword' } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(next).toHaveBeenCalled();
                (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject when string is too short', () => {
                const schema = { password: { minLength: 8 } };
                const req = (0, request_factory_js_1.requestFactory)({ body: { password: 'short' } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
                (0, globals_1.expect)(res.json).toHaveBeenCalledWith({
                    error: 'password must be at least 8 characters',
                });
                (0, globals_1.expect)(next).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('maxLength validation', () => {
            (0, globals_1.it)('should pass when string is within maxLength', () => {
                const schema = { username: { maxLength: 20 } };
                const req = (0, request_factory_js_1.requestFactory)({ body: { username: 'validuser' } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(next).toHaveBeenCalled();
                (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject when string exceeds maxLength', () => {
                const schema = { username: { maxLength: 10 } };
                const req = (0, request_factory_js_1.requestFactory)({
                    body: { username: 'verylongusernameexceeding' },
                });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
                (0, globals_1.expect)(res.json).toHaveBeenCalledWith({
                    error: 'username must be at most 10 characters',
                });
                (0, globals_1.expect)(next).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('URI format validation', () => {
            (0, globals_1.it)('should pass for valid URI', () => {
                const schema = { website: { format: 'uri' } };
                const req = (0, request_factory_js_1.requestFactory)({
                    body: { website: 'https://example.com' },
                });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(next).toHaveBeenCalled();
                (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject invalid URI', () => {
                const schema = { website: { format: 'uri' } };
                const req = (0, request_factory_js_1.requestFactory)({ body: { website: 'not-a-valid-uri' } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
                (0, globals_1.expect)(res.json).toHaveBeenCalledWith({
                    error: 'website must be a valid URI',
                });
                (0, globals_1.expect)(next).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('pattern validation', () => {
            (0, globals_1.it)('should pass when value matches pattern', () => {
                const schema = { code: { pattern: '^[A-Z]{3}$' } };
                const req = (0, request_factory_js_1.requestFactory)({ body: { code: 'ABC' } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(next).toHaveBeenCalled();
                (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should reject when value does not match pattern', () => {
                const schema = { code: { pattern: '^[A-Z]{3}$' } };
                const req = (0, request_factory_js_1.requestFactory)({ body: { code: 'abc123' } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
                (0, globals_1.expect)(res.json).toHaveBeenCalledWith({ error: 'code invalid format' });
                (0, globals_1.expect)(next).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('combined validations', () => {
            (0, globals_1.it)('should validate multiple fields', () => {
                const schema = {
                    username: { required: true, minLength: 3, maxLength: 20 },
                    email: { required: true, pattern: '^[^@]+@[^@]+\\.[^@]+$' },
                };
                const req = (0, request_factory_js_1.requestFactory)({
                    body: { username: 'testuser', email: 'test@example.com' },
                });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(next).toHaveBeenCalled();
                (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
            });
            (0, globals_1.it)('should fail on first invalid field', () => {
                const schema = {
                    username: { required: true },
                    email: { required: true },
                };
                const req = (0, request_factory_js_1.requestFactory)({ body: { email: 'test@example.com' } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(res.status).toHaveBeenCalledWith(400);
                (0, globals_1.expect)(res.json).toHaveBeenCalledWith({
                    error: 'Missing required field: username',
                });
                (0, globals_1.expect)(next).not.toHaveBeenCalled();
            });
        });
        (0, globals_1.describe)('edge cases', () => {
            (0, globals_1.it)('should handle empty body', () => {
                const schema = { optional: { minLength: 1 } };
                const req = (0, request_factory_js_1.requestFactory)({ body: undefined });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(next).toHaveBeenCalled();
            });
            (0, globals_1.it)('should handle non-string values for string validations', () => {
                const schema = { count: { minLength: 1 } };
                const req = (0, request_factory_js_1.requestFactory)({ body: { count: 123 } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(next).toHaveBeenCalled();
            });
            (0, globals_1.it)('should handle empty schema', () => {
                const schema = {};
                const req = (0, request_factory_js_1.requestFactory)({ body: { anything: 'goes' } });
                const res = (0, request_factory_js_1.responseFactory)();
                const next = (0, request_factory_js_1.nextFactory)();
                const middleware = (0, validation_js_1.validateRequestLegacy)(schema);
                middleware(req, res, next);
                (0, globals_1.expect)(next).toHaveBeenCalled();
            });
        });
    });
});
