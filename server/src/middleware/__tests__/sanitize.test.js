"use strict";
/**
 * Tests for sanitize middleware
 */
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
const globals_1 = require("@jest/globals");
const escapeHtml = (value) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#x27;');
const sanitizeValue = (input) => {
    if (typeof input === 'string') {
        return escapeHtml(input).trim().slice(0, 10000);
    }
    if (Array.isArray(input)) {
        return input.slice(0, 1000).map((item) => sanitizeValue(item));
    }
    if (input && typeof input === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(input)) {
            if (Object.keys(sanitized).length >= 100)
                break;
            sanitized[key] = sanitizeValue(value);
        }
        return sanitized;
    }
    return input;
};
// ESM-compatible mocking using unstable_mockModule
globals_1.jest.unstable_mockModule('../../validation/index.js', () => ({
    SanitizationUtils: {
        sanitizeHTML: (input) => escapeHtml(String(input)),
        sanitizeUserInput: (input) => sanitizeValue(input),
    },
}));
// Dynamic import AFTER mock is set up
let sanitizeRequest;
(0, globals_1.beforeAll)(async () => {
    ({ default: sanitizeRequest } = await Promise.resolve().then(() => __importStar(require('../sanitize.js'))));
});
const requestFactory = (options = {}) => {
    return {
        headers: {
            'content-type': 'application/json',
            'user-agent': 'IntelGraph-Test/1.0',
            ...options.headers,
        },
        body: options.body || {},
        query: options.query || {},
        params: options.params || {},
        user: options.user,
        tenant: options.tenant,
        cookies: options.cookies || {},
        ip: options.ip || '127.0.0.1',
        method: options.method || 'GET',
        url: options.url || '/',
        path: options.path || '/',
        get(name) {
            return this.headers[name.toLowerCase()];
        },
    };
};
const responseFactory = () => ({
    statusCode: 200,
    headers: {},
    body: null,
    status: globals_1.jest.fn().mockReturnThis(),
    json: globals_1.jest.fn().mockReturnThis(),
    send: globals_1.jest.fn().mockReturnThis(),
    set: globals_1.jest.fn().mockReturnThis(),
    setHeader: globals_1.jest.fn(function (name, value) {
        this.headers[name] = value;
        return this;
    }),
    getHeader: globals_1.jest.fn(function (name) {
        return this.headers[name];
    }),
    end: globals_1.jest.fn(),
});
const nextFactory = () => globals_1.jest.fn();
(0, globals_1.describe)('sanitize middleware', () => {
    (0, globals_1.describe)('HTML sanitization', () => {
        (0, globals_1.it)('should sanitize HTML in request body', () => {
            const req = requestFactory({
                body: {
                    name: '<script>alert("xss")</script>',
                    description: 'Normal text',
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            (0, globals_1.expect)(req.body.description).toBe('Normal text');
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
        (0, globals_1.it)('should sanitize HTML in query parameters', () => {
            const req = requestFactory({
                query: {
                    search: '<img src=x onerror=alert(1)>',
                    filter: 'safe value',
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.query.search).toBe('&lt;img src=x onerror=alert(1)&gt;');
            (0, globals_1.expect)(req.query.filter).toBe('safe value');
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
        (0, globals_1.it)('should escape all dangerous characters', () => {
            const req = requestFactory({
                body: {
                    input: '&<>"\' test',
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.input).toBe('&amp;&lt;&gt;&quot;&#x27; test');
        });
    });
    (0, globals_1.describe)('Nested data sanitization', () => {
        (0, globals_1.it)('should sanitize nested objects', () => {
            const req = requestFactory({
                body: {
                    user: {
                        name: '<script>bad</script>',
                        profile: {
                            bio: '<b>test</b>',
                        },
                    },
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.user.name).toBe('&lt;script&gt;bad&lt;/script&gt;');
            (0, globals_1.expect)(req.body.user.profile.bio).toBe('&lt;b&gt;test&lt;/b&gt;');
        });
        (0, globals_1.it)('should sanitize arrays', () => {
            const req = requestFactory({
                body: {
                    tags: ['<script>xss</script>', 'safe tag', '<img src=x>'],
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.tags).toEqual([
                '&lt;script&gt;xss&lt;/script&gt;',
                'safe tag',
                '&lt;img src=x&gt;',
            ]);
        });
        (0, globals_1.it)('should sanitize arrays of objects', () => {
            const req = requestFactory({
                body: {
                    items: [
                        { name: '<script>1</script>' },
                        { name: '<script>2</script>' },
                    ],
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.items[0].name).toBe('&lt;script&gt;1&lt;/script&gt;');
            (0, globals_1.expect)(req.body.items[1].name).toBe('&lt;script&gt;2&lt;/script&gt;');
        });
    });
    (0, globals_1.describe)('Data type handling', () => {
        (0, globals_1.it)('should not modify numbers', () => {
            const req = requestFactory({
                body: {
                    count: 42,
                    price: 19.99,
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.count).toBe(42);
            (0, globals_1.expect)(req.body.price).toBe(19.99);
        });
        (0, globals_1.it)('should not modify booleans', () => {
            const req = requestFactory({
                body: {
                    active: true,
                    deleted: false,
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.active).toBe(true);
            (0, globals_1.expect)(req.body.deleted).toBe(false);
        });
        (0, globals_1.it)('should not modify null values', () => {
            const req = requestFactory({
                body: {
                    optionalField: null,
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.optionalField).toBeNull();
        });
        (0, globals_1.it)('should handle undefined values', () => {
            const req = requestFactory({
                body: {
                    field: undefined,
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.field).toBeUndefined();
        });
    });
    (0, globals_1.describe)('Edge cases', () => {
        (0, globals_1.it)('should handle empty body', () => {
            const req = requestFactory({
                body: {},
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body).toEqual({});
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle empty query', () => {
            const req = requestFactory({
                query: {},
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.query).toEqual({});
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle missing body and query', () => {
            const req = requestFactory({});
            delete req.body;
            delete req.query;
            const res = responseFactory();
            const next = nextFactory();
            (0, globals_1.expect)(() => {
                sanitizeRequest(req, res, next);
            }).not.toThrow();
            (0, globals_1.expect)(next).toHaveBeenCalled();
        });
        (0, globals_1.it)('should handle complex nested structures', () => {
            const req = requestFactory({
                body: {
                    level1: {
                        level2: {
                            level3: {
                                dangerous: '<script>xss</script>',
                                array: ['<b>test</b>', { nested: '<i>deep</i>' }],
                            },
                        },
                    },
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.level1.level2.level3.dangerous).toBe('&lt;script&gt;xss&lt;/script&gt;');
            (0, globals_1.expect)(req.body.level1.level2.level3.array[0]).toBe('&lt;b&gt;test&lt;/b&gt;');
            (0, globals_1.expect)(req.body.level1.level2.level3.array[1].nested).toBe('&lt;i&gt;deep&lt;/i&gt;');
        });
    });
    (0, globals_1.describe)('SQL injection prevention', () => {
        (0, globals_1.it)('should escape SQL-like patterns', () => {
            const req = requestFactory({
                body: {
                    input: "'; DROP TABLE users; --",
                },
            });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(req.body.input).toBe('&#x27;; DROP TABLE users; --');
        });
    });
    (0, globals_1.describe)('Middleware behavior', () => {
        (0, globals_1.it)('should always call next()', () => {
            const req = requestFactory({ body: {} });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(next).toHaveBeenCalledTimes(1);
            (0, globals_1.expect)(next).toHaveBeenCalledWith();
        });
        (0, globals_1.it)('should not modify response object', () => {
            const req = requestFactory({ body: { test: '<script>xss</script>' } });
            const res = responseFactory();
            const next = nextFactory();
            sanitizeRequest(req, res, next);
            (0, globals_1.expect)(res.status).not.toHaveBeenCalled();
            (0, globals_1.expect)(res.json).not.toHaveBeenCalled();
        });
    });
});
