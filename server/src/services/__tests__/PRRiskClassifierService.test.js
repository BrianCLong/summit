"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PRRiskClassifierService_js_1 = require("../PRRiskClassifierService.js");
(0, globals_1.describe)('PRRiskClassifierService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new PRRiskClassifierService_js_1.PRRiskClassifierService();
    });
    (0, globals_1.it)('should classify schema changes as HIGH risk', () => {
        const files = ['server/src/db/schema.prisma', 'server/src/db/migrations/001_init.sql'];
        const result = service.classify(files);
        (0, globals_1.expect)(result.riskLevel).toBe('HIGH');
        (0, globals_1.expect)(result.categories).toContain('SCHEMA');
        (0, globals_1.expect)(result.reasons).toHaveLength(2);
    });
    (0, globals_1.it)('should classify security changes as HIGH risk', () => {
        const files = ['server/src/middleware/auth.js', 'package.json'];
        const result = service.classify(files);
        (0, globals_1.expect)(result.riskLevel).toBe('HIGH');
        (0, globals_1.expect)(result.categories).toContain('SECURITY');
    });
    (0, globals_1.it)('should classify infra changes as HIGH risk', () => {
        const files = ['Dockerfile', 'k8s/deployment.yaml'];
        const result = service.classify(files);
        (0, globals_1.expect)(result.riskLevel).toBe('HIGH');
        (0, globals_1.expect)(result.categories).toContain('INFRA');
    });
    (0, globals_1.it)('should classify UX changes as LOW risk', () => {
        const files = ['apps/web/src/components/Button.js', 'apps/web/src/styles.css'];
        const result = service.classify(files);
        (0, globals_1.expect)(result.riskLevel).toBe('LOW');
        (0, globals_1.expect)(result.categories).toContain('UX');
    });
    (0, globals_1.it)('should classify backend logic changes as MEDIUM risk', () => {
        const files = ['server/src/services/UserService.js'];
        const result = service.classify(files);
        (0, globals_1.expect)(result.riskLevel).toBe('MEDIUM');
        (0, globals_1.expect)(result.categories).toContain('LOGIC');
    });
    (0, globals_1.it)('should handle mixed changes (Schema + UX) as HIGH risk', () => {
        const files = ['server/src/db/schema.sql', 'apps/web/src/components/Button.js'];
        const result = service.classify(files);
        (0, globals_1.expect)(result.riskLevel).toBe('HIGH');
        (0, globals_1.expect)(result.categories).toContain('SCHEMA');
        (0, globals_1.expect)(result.categories).toContain('UX');
    });
    (0, globals_1.it)('should classify unknown/doc files as LOW risk', () => {
        const files = ['README.md', 'docs/API.md'];
        const result = service.classify(files);
        (0, globals_1.expect)(result.riskLevel).toBe('LOW');
        (0, globals_1.expect)(result.categories).toContain('UNKNOWN');
    });
});
