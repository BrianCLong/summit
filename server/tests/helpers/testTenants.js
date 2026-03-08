"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEST_TENANT_FIXTURE = void 0;
exports.seedTestTenants = seedTestTenants;
exports.teardownTestTenants = teardownTestTenants;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
exports.TEST_TENANT_FIXTURE = path_1.default.join(process.cwd(), 'server', 'test-results', 'test-tenants.json');
const DEFAULT_TENANTS = [
    { id: 'tenant-alpha', name: 'Tenant Alpha', tier: 'dev' },
    { id: 'tenant-beta', name: 'Tenant Beta', tier: 'stage' },
];
async function seedTestTenants(overrides = []) {
    const tenants = dedupeTenants([...DEFAULT_TENANTS, ...overrides]);
    await fs_1.promises.mkdir(path_1.default.dirname(exports.TEST_TENANT_FIXTURE), { recursive: true });
    await fs_1.promises.writeFile(exports.TEST_TENANT_FIXTURE, JSON.stringify({ tenants }, null, 2), 'utf8');
    process.env.TEST_TENANT_FIXTURE = exports.TEST_TENANT_FIXTURE;
    return tenants;
}
async function teardownTestTenants() {
    await fs_1.promises.rm(exports.TEST_TENANT_FIXTURE, { force: true });
}
function dedupeTenants(records) {
    const uniqueById = new Map();
    records.forEach((record) => {
        uniqueById.set(record.id, record);
    });
    return Array.from(uniqueById.values());
}
