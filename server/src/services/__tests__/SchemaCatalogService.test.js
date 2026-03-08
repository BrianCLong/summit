"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SchemaCatalogService_js_1 = require("../SchemaCatalogService.js");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
(0, globals_1.describe)('SchemaCatalogService', () => {
    let service;
    const mockStoragePath = path_1.default.join(process.cwd(), 'data', 'schema-catalog.json');
    (0, globals_1.beforeEach)(async () => {
        // Clean up mock file
        try {
            await promises_1.default.unlink(mockStoragePath);
        }
        catch { }
        // Reset singleton state via private access or just rely on file reload
        service = SchemaCatalogService_js_1.SchemaCatalogService.getInstance();
        service.currentSchema = null;
    });
    (0, globals_1.afterAll)(async () => {
        try {
            await promises_1.default.unlink(mockStoragePath);
        }
        catch { }
    });
    const validSchema = {
        version: '1.0.0',
        entities: {
            User: {
                fields: {
                    id: 'string',
                    email: 'string',
                },
                policy: [
                    { field: 'email', purpose: 'identification', retention: 'permanent', pii: true },
                    { field: 'id', purpose: 'primary_key', retention: 'permanent' }
                ]
            }
        }
    };
    (0, globals_1.it)('should register a valid schema and persist it', async () => {
        const result = await service.registerSchema(validSchema);
        (0, globals_1.expect)(result.valid).toBe(true);
        (0, globals_1.expect)(result.errors).toHaveLength(0);
        // Verify persistence
        const savedData = await promises_1.default.readFile(mockStoragePath, 'utf-8');
        const savedSchema = JSON.parse(savedData);
        (0, globals_1.expect)(savedSchema.version).toBe('1.0.0');
    });
    (0, globals_1.it)('should detect breaking changes across instances (persistence check)', async () => {
        // 1. Register V1
        await service.registerSchema(validSchema);
        // 2. Simulate new service instance (reload from disk)
        service.currentSchema = null;
        // 3. Register V2 with breaking change
        const newSchema = {
            version: '2.0.0',
            entities: {
                User: {
                    fields: {
                        id: 'string',
                        // email removed
                    },
                    policy: [
                        { field: 'id', purpose: 'primary_key', retention: 'permanent' }
                    ]
                }
            }
        };
        const result = await service.registerSchema(newSchema);
        (0, globals_1.expect)(result.valid).toBe(false);
        (0, globals_1.expect)(result.breakingChanges).toHaveLength(1);
        (0, globals_1.expect)(result.breakingChanges[0]).toContain("Field 'User.email' was removed");
    });
});
